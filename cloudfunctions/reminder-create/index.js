const cloud = require('wx-server-sdk')
const { validateReminderCreate } = require('./validation')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }

  const message = validateReminderCreate(event)
  if (message) {
    return failure(40001, message)
  }

  try {
    const context = await getFamilyContext(db, OPENID)

    // 关联的宠物必须都属于当前家庭，避免把提醒挂到别人家的宠物上
    const petIds = event.petIds
    const petResult = await db
      .collection('pets')
      .where({ _id: command.in(petIds), familyId: context.familyId })
      .get()
    if (petResult.data.length !== petIds.length) {
      return failure(40401, '宠物不存在或无权操作')
    }

    const reminder = {
      _openid: OPENID,
      familyId: context.familyId,
      petIds,
      type: event.type,
      title: typeof event.title === 'string' ? event.title.trim() : '',
      cycleDays: Number(event.cycleDays),
      nextDate: event.nextDate,
      remindBeforeDays: Number(event.remindBeforeDays),
      enabled: true,
      lastDoneAt: null,
      doneCount: 0,
      remark: typeof event.remark === 'string' ? event.remark.trim() : '',
      isOrphan: false,
      createdAt: Date.now(),
    }

    const result = await db.collection('reminders').add({ data: reminder })
    return success({ id: result._id })
  } catch (error) {
    console.error('新增提醒失败', error)
    return failure(50001, '保存提醒失败，请重试')
  }
}
