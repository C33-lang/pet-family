const cloud = require('wx-server-sdk')

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
  if (!event.id || typeof event.id !== 'string') {
    return failure(40001, '缺少记录ID')
  }

  try {
    const recordResult = await db
      .collection('records')
      .where({ _id: event.id, _openid: OPENID })
      .limit(1)
      .get()
    const record = recordResult.data[0]

    if (!record) {
      return failure(40402, '记录不存在或无权操作')
    }

    const petResult = await db
      .collection('pets')
      .where({ _id: record.petId, _openid: OPENID })
      .limit(1)
      .get()

    if (!petResult.data.length) {
      return failure(40401, '宠物不存在或无权操作')
    }

    await db
      .collection('records')
      .where({ _id: event.id, _openid: OPENID })
      .remove()

    return success({ id: event.id })
  } catch (error) {
    console.error('删除健康记录失败', error)
    return failure(50003, '删除记录失败，请重试')
  }
}
