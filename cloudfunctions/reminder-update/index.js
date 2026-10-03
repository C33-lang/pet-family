const cloud = require('wx-server-sdk')
const { validateReminderCreate } = require('./validation')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

const CYCLE_DAY = 86400000
const ACTIONS = ['done', 'toggle', 'edit']

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

/** 按家庭口径取回提醒，避免操作到别人家的数据 */
async function findReminder(familyId, id) {
  const result = await db
    .collection('reminders')
    .where({ _id: id, familyId })
    .limit(1)
    .get()
  return result.data[0] || null
}

/**
 * 完成打卡：
 * - 周期提醒从打卡当天顺延 cycleDays 天
 * - 一次性提醒直接结束（enabled 置 false）
 */
async function handleDone(familyId, id) {
  const reminder = await findReminder(familyId, id)
  if (!reminder) {
    return failure(40402, '提醒不存在或无权操作')
  }

  const now = Date.now()
  const cycleDays = Number(reminder.cycleDays) || 0
  const finished = cycleDays <= 0
  const nextDate = finished ? reminder.nextDate : startOfToday() + cycleDays * CYCLE_DAY

  await db
    .collection('reminders')
    .where({ _id: id, familyId })
    .update({
      data: {
        lastDoneAt: now,
        doneCount: (Number(reminder.doneCount) || 0) + 1,
        nextDate,
        enabled: !finished,
      },
    })

  return success({ id, finished, nextDate: finished ? null : nextDate })
}

async function handleToggle(familyId, id, enabled) {
  const reminder = await findReminder(familyId, id)
  if (!reminder) {
    return failure(40402, '提醒不存在或无权操作')
  }

  await db
    .collection('reminders')
    .where({ _id: id, familyId })
    .update({ data: { enabled: Boolean(enabled) } })

  return success({ id, enabled: Boolean(enabled) })
}

async function handleEdit(familyId, event) {
  const reminder = await findReminder(familyId, event.id)
  if (!reminder) {
    return failure(40402, '提醒不存在或无权操作')
  }

  const message = validateReminderCreate(event)
  if (message) {
    return failure(40001, message)
  }

  const petIds = event.petIds
  const petResult = await db
    .collection('pets')
    .where({ _id: command.in(petIds), familyId })
    .get()
  if (petResult.data.length !== petIds.length) {
    return failure(40401, '宠物不存在或无权操作')
  }

  await db
    .collection('reminders')
    .where({ _id: event.id, familyId })
    .update({
      data: {
        petIds,
        type: event.type,
        title: typeof event.title === 'string' ? event.title.trim() : '',
        cycleDays: Number(event.cycleDays),
        nextDate: event.nextDate,
        remindBeforeDays: Number(event.remindBeforeDays),
        remark: typeof event.remark === 'string' ? event.remark.trim() : '',
        updatedAt: Date.now(),
      },
    })

  return success({ id: event.id })
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }
  if (!event.id || typeof event.id !== 'string') {
    return failure(40001, '缺少提醒ID')
  }
  if (ACTIONS.indexOf(event.action) < 0) {
    return failure(40001, '不支持的操作')
  }

  try {
    const context = await getFamilyContext(db, OPENID)

    if (event.action === 'done') {
      return await handleDone(context.familyId, event.id)
    }
    if (event.action === 'toggle') {
      return await handleToggle(context.familyId, event.id, event.enabled)
    }
    return await handleEdit(context.familyId, event)
  } catch (error) {
    console.error('更新提醒失败', event.action, error)
    return failure(50003, '更新提醒失败，请重试')
  }
}
