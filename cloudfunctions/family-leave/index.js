const cloud = require('wx-server-sdk')
const { readMembership, countMembers, SHARED_COLLECTIONS } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

exports.main = async () => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }

  try {
    const membership = await readMembership(db, OPENID)
    if (!membership || !membership.familyId) {
      return failure(40405, '你还没有加入家庭')
    }

    const { familyId, role } = membership
    const memberCount = await countMembers(db, familyId)

    if (role === 'owner' && memberCount > 1) {
      return failure(40301, '你是家庭创建者，请先让其他成员退出')
    }

    if (role === 'owner') {
      // 独自一人即解散：把自己的数据还原为「无家庭」，下次打开会自动重建家庭
      await Promise.all(
        SHARED_COLLECTIONS.map((name) =>
          db
            .collection(name)
            .where({ _openid: OPENID, familyId })
            .update({ data: { familyId: command.remove() } })
            .catch((error) => {
              console.error('还原数据失败', name, error)
            })
        )
      )
      await db
        .collection('families')
        .doc(familyId)
        .remove()
        .catch(() => {})
    }

    await db.collection('family_members').doc(OPENID).remove()

    return success({ familyId })
  } catch (error) {
    console.error('退出家庭失败', error)
    return failure(50007, '退出家庭失败，请重试')
  }
}
