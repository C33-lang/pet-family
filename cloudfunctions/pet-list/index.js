const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const PAGE_SIZE = 100

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

async function getAllPets(openid) {
  const countResult = await db
    .collection('pets')
    .where({ _openid: openid })
    .count()
  const total = countResult.total
  const tasks = []

  for (let offset = 0; offset < total; offset += PAGE_SIZE) {
    tasks.push(
      db
        .collection('pets')
        .where({ _openid: openid })
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
    if (event.id) {
      const result = await db
        .collection('pets')
        .where({ _id: event.id, _openid: OPENID })
        .limit(1)
        .get()
      return success({ pet: result.data[0] || null })
    }

    const list = await getAllPets(OPENID)
    return success({ list })
  } catch (error) {
    console.error('获取宠物失败', error)
    return failure(50003, '获取宠物失败，请重试')
  }
}
