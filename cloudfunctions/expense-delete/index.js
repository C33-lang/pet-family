const cloud = require('wx-server-sdk')
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
  if (!event.id || typeof event.id !== 'string') {
    return failure(40001, '缺少花费ID')
  }

  try {
    const context = await getFamilyContext(db, OPENID)

    // 先按家庭口径确认这条花费存在，再删除，避免删到别人家的数据
    const queryResult = await db
      .collection('expenses')
      .where({ _id: event.id, familyId: context.familyId })
      .limit(1)
      .get()
    if (!queryResult.data.length) {
      return failure(40402, '花费不存在或无权操作')
    }

    await db
      .collection('expenses')
      .where({ _id: event.id, familyId: context.familyId })
      .remove()

    return success({ id: event.id })
  } catch (error) {
    console.error('删除花费失败', error)
    return failure(50003, '删除失败，请重试')
  }
}
