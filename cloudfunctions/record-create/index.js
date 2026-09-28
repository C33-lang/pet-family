const cloud = require('wx-server-sdk')
const { validateRecord } = require('./validation')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()

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

  const validationMessage = validateRecord(event)
  if (validationMessage) {
    return failure(40001, validationMessage)
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

    const now = Date.now()
    const record = {
      _openid: OPENID,
      familyId: context.familyId,
      petId: event.petId,
      type: event.type,
      content: typeof event.content === 'string' ? event.content.trim() : '',
      images: [],
      tags: [],
      recordTime: event.recordTime,
      createdAt: now,
    }

    if (event.type === 'weight') {
      record.weightData = {
        value: Number(event.weightData.value.toFixed(1)),
        unit: 'kg',
      }
    }

    const result = await db.collection('records').add({ data: record })
    return success({ id: result._id })
  } catch (error) {
    console.error('新增健康记录失败', error)
    return failure(50001, '保存记录失败，请重试')
  }
}
