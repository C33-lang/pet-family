const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PAGE_SIZE = 20

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
  if (!event.petId || typeof event.petId !== 'string') {
    return failure(40001, '缺少宠物ID')
  }

  const page = Number(event.page)
  if (!Number.isInteger(page) || page < 0) {
    return failure(40001, '分页参数不正确')
  }

  try {
    const petResult = await db
      .collection('pets')
      .where({ _id: event.petId, _openid: OPENID })
      .limit(1)
      .get()

    if (!petResult.data.length) {
      return failure(40401, '宠物不存在或无权操作')
    }

    const result = await db
      .collection('records')
      .where({ _openid: OPENID, petId: event.petId })
      .orderBy('recordTime', 'desc')
      .orderBy('createdAt', 'desc')
      .skip(page * PAGE_SIZE)
      .limit(PAGE_SIZE + 1)
      .get()

    return success({
      list: result.data.slice(0, PAGE_SIZE),
      page,
      pageSize: PAGE_SIZE,
      hasMore: result.data.length > PAGE_SIZE,
    })
  } catch (error) {
    console.error('获取健康记录失败', error)
    return failure(50002, '获取记录失败，请重试')
  }
}
