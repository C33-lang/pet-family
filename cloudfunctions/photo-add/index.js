const cloud = require('wx-server-sdk')
const { validatePhotoAdd } = require('./validation')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function success(data) { return { code: 0, message: '', data } }
function failure(code, message) { return { code, message, data: null } }

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure(40101, '请先登录')
  const message = validatePhotoAdd(event)
  if (message) return failure(40001, message)

  try {
    const context = await getFamilyContext(db, OPENID)
    const petResult = await db.collection('pets')
      .where({ _id: event.petId, familyId: context.familyId }).limit(1).get()
    if (!petResult.data.length) return failure(40401, '宠物不存在或无权操作')

    const photo = {
      _openid: OPENID,
      familyId: context.familyId,
      petId: event.petId,
      fileID: event.fileID,
      createdAt: Date.now(),
    }
    const result = await db.collection('photos').add({ data: photo })
    return success({ ...photo, _id: result._id })
  } catch (error) {
    console.error('新增照片失败', error)
    return failure(50001, '保存照片失败，请重试')
  }
}
