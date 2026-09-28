const cloud = require('wx-server-sdk')
const { readMembership, migrateLegacyData } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command

const CODE_PATTERN = /^[A-Z0-9]{6}$/

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

  const code =
    typeof event.code === 'string' ? event.code.trim().toUpperCase() : ''
  if (!CODE_PATTERN.test(code)) {
    return failure(40001, '请输入 6 位邀请码')
  }

  try {
    const membership = await readMembership(db, OPENID)
    const currentFamilyId =
      membership && membership.familyId ? membership.familyId : ''

    const result = await db
      .collection('families')
      .where({ inviteCode: code, inviteExpireAt: command.gt(Date.now()) })
      .limit(1)
      .get()
    const family = result.data[0]

    if (!family) {
      return failure(40404, '邀请码无效或已过期，请让家人重新生成')
    }

    if (currentFamilyId === family._id) {
      return success({ familyId: family._id, alreadyJoined: true })
    }

    if (currentFamilyId) {
      return failure(40901, '你已在一个家庭中，请先退出后再加入')
    }

    const now = Date.now()
    await db.collection('family_members').doc(OPENID).set({
      data: {
        _openid: OPENID,
        familyId: family._id,
        role: 'member',
        joinedAt: now,
        updatedAt: now,
      },
    })

    // 把自己名下还没有家庭归属的历史数据并入新家庭
    await migrateLegacyData(db, OPENID, family._id)

    return success({ familyId: family._id, alreadyJoined: false })
  } catch (error) {
    console.error('加入家庭失败', error)
    return failure(50006, '加入家庭失败，请重试')
  }
}
