const cloud = require('wx-server-sdk')
const { getFamilyContext, countMembers, ensureInvite } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

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
    const context = await getFamilyContext(db, OPENID)
    const family = await ensureInvite(db, context.familyId)
    const memberCount = await countMembers(db, context.familyId)

    return success({
      familyId: context.familyId,
      role: context.role,
      name: family ? family.name : '我的家',
      inviteCode: family ? family.inviteCode : '',
      inviteExpireAt: family ? family.inviteExpireAt : 0,
      memberCount,
    })
  } catch (error) {
    console.error('获取家庭信息失败', error)
    return failure(50005, '获取家庭信息失败，请重试')
  }
}
