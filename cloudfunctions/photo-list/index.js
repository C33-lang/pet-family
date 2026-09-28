const cloud = require('wx-server-sdk')
const { PAGE_SIZE, parseCursor } = require('./pagination')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

function success(data) { return { code: 0, message: '', data } }
function failure(code, message) { return { code, message, data: null } }

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure(40101, '请先登录')
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
    const petResult = await db.collection('pets')
      .where({ _id: event.petId, familyId: context.familyId }).limit(1).get()
    if (!petResult.data.length) return failure(40401, '宠物不存在或无权操作')

    const ownerFilter = { familyId: context.familyId, petId: event.petId }
    const filter = cursor
      ? command.and([
          ownerFilter,
          command.or([
            { createdAt: command.lt(cursor.createdAt) },
            { createdAt: cursor.createdAt, _id: command.lt(cursor.id) },
          ]),
        ])
      : ownerFilter

    const result = await db.collection('photos').where(filter)
      .orderBy('createdAt', 'desc').orderBy('_id', 'desc')
      .limit(PAGE_SIZE + 1).get()
    const list = result.data.slice(0, PAGE_SIZE)
    const lastPhoto = list[list.length - 1]

    return success({
      list,
      pageSize: PAGE_SIZE,
      hasMore: result.data.length > PAGE_SIZE,
      nextCursor: lastPhoto
        ? { createdAt: lastPhoto.createdAt, id: lastPhoto._id }
        : null,
    })
  } catch (error) {
    console.error('获取照片列表失败', error)
    return failure(50002, '获取照片失败，请重试')
  }
}
