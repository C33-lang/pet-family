const cloud = require('wx-server-sdk')
const { PAGE_SIZE, parseCursor } = require('./pagination')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

// 统计时的批读参数：家庭内提醒规模有限，超过上限只统计最近的部分
const STATS_BATCH = 100
const STATS_MAX = 2000

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

async function fetchAll(filter) {
  const docs = []
  for (let offset = 0; offset < STATS_MAX; offset += STATS_BATCH) {
    const result = await db
      .collection('reminders')
      .where(filter)
      .skip(offset)
      .limit(STATS_BATCH)
      .get()
    docs.push(...result.data)
    if (result.data.length < STATS_BATCH) {
      break
    }
  }
  return docs
}

/** 首页返回统计，省掉前端一次额外调用 */
async function buildStats(familyId, petId) {
  const today = startOfToday()
  const weekEnd = today + 7 * 86400000
  const docs = await fetchAll({ familyId, petIds: petId, enabled: true })

  let overdueCount = 0
  let todayCount = 0
  let weekCount = 0

  docs.forEach((item) => {
    if (item.nextDate < today) {
      overdueCount += 1
    } else if (item.nextDate === today) {
      todayCount += 1
    } else if (item.nextDate <= weekEnd) {
      weekCount += 1
    }
  })

  return { overdueCount, todayCount, weekCount }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }
  if (!event.petId || typeof event.petId !== 'string') {
    return failure(40001, '缺少宠物ID')
  }

  let cursor
  try {
    cursor = parseCursor(event.cursor)
  } catch (error) {
    return failure(40001, error.message)
  }

  try {
    const context = await getFamilyContext(db, OPENID)
    const petResult = await db
      .collection('pets')
      .where({ _id: event.petId, familyId: context.familyId })
      .limit(1)
      .get()
    if (!petResult.data.length) {
      return failure(40401, '宠物不存在或无权操作')
    }

    // 最紧急的排最前：逾期项 nextDate 最小，天然排在最上面
    const baseFilter = {
      familyId: context.familyId,
      petIds: event.petId,
      enabled: true,
    }
    const filter = cursor
      ? command.and([
          baseFilter,
          command.or([
            { nextDate: command.gt(cursor.nextDate) },
            {
              nextDate: cursor.nextDate,
              _id: command.gt(cursor.id),
            },
          ]),
        ])
      : baseFilter

    const result = await db
      .collection('reminders')
      .where(filter)
      .orderBy('nextDate', 'asc')
      .orderBy('_id', 'asc')
      .limit(PAGE_SIZE + 1)
      .get()

    const list = result.data.slice(0, PAGE_SIZE)
    const lastReminder = list[list.length - 1]
    const stats = cursor ? null : await buildStats(context.familyId, event.petId)

    return success({
      list,
      pageSize: PAGE_SIZE,
      hasMore: result.data.length > PAGE_SIZE,
      nextCursor: lastReminder
        ? { nextDate: lastReminder.nextDate, id: lastReminder._id }
        : null,
      stats,
    })
  } catch (error) {
    console.error('获取提醒列表失败', error)
    return failure(50002, '获取提醒失败，请重试')
  }
}
