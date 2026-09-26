const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

function success(data) { return { code: 0, message: '', data } }
function failure(code, message) { return { code, message, data: null } }

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) return failure(40101, '请先登录')
  if (!event.id || typeof event.id !== 'string') {
    return failure(40001, '缺少照片ID')
  }

  try {
    const photoResult = await db.collection('photos')
      .where({ _id: event.id, _openid: OPENID }).limit(1).get()
    const photo = photoResult.data[0]
    if (!photo) return failure(40402, '照片不存在或无权操作')

    const petResult = await db.collection('pets')
      .where({ _id: photo.petId, _openid: OPENID }).limit(1).get()
    if (!petResult.data.length) return failure(40401, '宠物不存在或无权操作')

    const deleteResult = await cloud.deleteFile({ fileList: [photo.fileID] })
    const deletedFile = deleteResult.fileList[0]
    if (!deletedFile || deletedFile.status !== 0) {
      console.error('删除照片文件失败', deletedFile)
      return failure(50003, '删除照片失败，请重试')
    }

    await db.collection('photos')
      .where({ _id: event.id, _openid: OPENID }).remove()
    return success({ id: event.id })
  } catch (error) {
    console.error('删除照片失败', error)
    return failure(50003, '删除照片失败，请重试')
  }
}
