const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const _ = db.command

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
    return failure(40001, '缺少宠物ID')
  }

  const petId = event.id
  const orphanedAt = Date.now()

  try {
    await db.runTransaction(async (transaction) => {
      const petResult = await transaction
        .collection('pets')
        .where({ _id: petId, _openid: OPENID })
        .limit(1)
        .get()

      if (!petResult.data.length) {
        const error = new Error('PET_NOT_FOUND')
        error.code = 'PET_NOT_FOUND'
        throw error
      }

      const orphanData = {
        isOrphan: true,
        orphanPetId: petId,
        orphanedAt,
      }

      await transaction
        .collection('records')
        .where({ _openid: OPENID, petId })
        .update({ data: orphanData })

      await transaction
        .collection('reminders')
        .where({ _openid: OPENID, petId })
        .update({ data: orphanData })

      await transaction
        .collection('expenses')
        .where({ _openid: OPENID, petIds: petId })
        .update({
          data: {
            isOrphan: true,
            orphanPetIds: _.addToSet(petId),
            orphanedAt,
          },
        })

      await transaction.collection('pets').doc(petId).remove()
    })

    return success({ id: petId })
  } catch (error) {
    if (error && error.code === 'PET_NOT_FOUND') {
      return failure(40401, '宠物不存在或无权操作')
    }
    console.error('删除宠物失败', error)
    return failure(50004, '删除宠物失败，请重试')
  }
}
