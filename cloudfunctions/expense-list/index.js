const cloud = require('wx-server-sdk')
const { PAGE_SIZE, parseCursor } = require('./pagination')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

// 统计时的批读参数：个人账单规模有限，超过上限只统计最近的记录
const STATS_BATCH = 100
const STATS_MAX = 2000

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

function round2(value) {
  return Math.round(value * 100) / 100
}

/** 多宠共记时按只数均摊，单宠账目不受影响 */
function shareOf(expense) {
  const count =
    Array.isArray(expense.petIds) && expense.petIds.length
      ? expense.petIds.length
      : 1
  return expense.amount / count
}

function monthStartTime() {
  const start = new Date()
  start.setDate(1)
  start.setHours(0, 0, 0, 0)
  return start.getTime()
}

async function fetchAll(filter) {
  const docs = []
  for (let offset = 0; offset < STATS_MAX; offset += STATS_BATCH) {
    const result = await db
      .collection('expenses')
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

async function buildStats(familyId, petId) {
  const startOfMonth = monthStartTime()
  const docs = await fetchAll({ familyId, petIds: petId })

  let total = 0
  let monthTotal = 0
  let monthCount = 0
  const categoryMap = {}

  docs.forEach((item) => {
    const share = shareOf(item)
    total += share
    if (item.expenseTime >= startOfMonth) {
      monthTotal += share
      monthCount += 1
      const key = item.category || 'other'
      categoryMap[key] = (categoryMap[key] || 0) + share
    }
  })

  const byCategory = Object.keys(categoryMap)
    .map((category) => ({ category, amount: round2(categoryMap[category]) }))
    .sort((a, b) => b.amount - a.amount)

  return {
    total: round2(total),
    monthTotal: round2(monthTotal),
    monthCount,
    byCategory,
  }
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

    const baseFilter = { familyId: context.familyId, petIds: event.petId }
    const filter = cursor
      ? command.and([
          baseFilter,
          command.or([
            { expenseTime: command.lt(cursor.expenseTime) },
            {
              expenseTime: cursor.expenseTime,
              _id: command.lt(cursor.id),
            },
          ]),
        ])
      : baseFilter

    const result = await db
      .collection('expenses')
      .where(filter)
      .orderBy('expenseTime', 'desc')
      .orderBy('_id', 'desc')
      .limit(PAGE_SIZE + 1)
      .get()

    const list = result.data.slice(0, PAGE_SIZE)
    const lastExpense = list[list.length - 1]
    const stats = cursor ? null : await buildStats(context.familyId, event.petId)

    return success({
      list,
      pageSize: PAGE_SIZE,
      hasMore: result.data.length > PAGE_SIZE,
      nextCursor: lastExpense
        ? { expenseTime: lastExpense.expenseTime, id: lastExpense._id }
        : null,
      stats,
    })
  } catch (error) {
    console.error('获取花费列表失败', error)
    return failure(50002, '获取花费失败，请重试')
  }
}
