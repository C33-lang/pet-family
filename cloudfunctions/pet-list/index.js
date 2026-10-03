const cloud = require('wx-server-sdk')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PAGE_SIZE = 100
/** 角标只关心最紧急的一条，家庭内提醒数量有限，一次取回在内存聚合 */
const REMINDER_SCAN_LIMIT = 200

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

/**
 * 找出每只宠物最紧急（nextDate 最小）的一条启用中提醒。
 * 提醒集合异常时不阻塞宠物列表，降级为无角标。
 */
async function buildReminderBriefs(familyId) {
  try {
    const result = await db
      .collection('reminders')
      .where({ familyId, enabled: true })
      .orderBy('nextDate', 'asc')
      .limit(REMINDER_SCAN_LIMIT)
      .get()

    const briefs = {}
    result.data.forEach((item) => {
      const petIds = Array.isArray(item.petIds) ? item.petIds : []
      petIds.forEach((petId) => {
        const current = briefs[petId]
        if (!current || item.nextDate < current.nextDate) {
          briefs[petId] = { title: item.title || '', nextDate: item.nextDate }
        }
      })
    })
    return briefs
  } catch (error) {
    console.error('获取宠物提醒角标失败', error)
    return {}
  }
}

async function getAllPets(familyId) {
  const countResult = await db
    .collection('pets')
    .where({ familyId })
    .count()
  const total = countResult.total
  const tasks = []

  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    tasks.push(
      db
        .collection('pets')
        .where({ familyId })
        .orderBy('createdAt', 'desc')
        .skip(offset)
        .limit(PAGE_SIZE)
        .get()
    )
  }

  if (!tasks.length) {
    return []
  }

  const pages = await Promise.all(tasks)
  return pages.reduce((list, page) => list.concat(page.data), [])
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }

  try {
    const context = await getFamilyContext(db, OPENID)

    if (event.id) {
      const result = await db
        .collection('pets')
        .where({ _id: event.id, familyId: context.familyId })
        .limit(1)
        .get()
      return success({ pet: result.data[0] || null })
    }

    const list = await getAllPets(context.familyId)
    const briefs = await buildReminderBriefs(context.familyId)
    const withBrief = list.map((pet) => ({
      ...pet,
      reminderBrief: briefs[pet._id] || null,
    }))
    return success({ list: withBrief })
  } catch (error) {
    console.error('获取宠物失败', error)
    return failure(50003, '获取宠物失败，请重试')
  }
}
