/**
 * 家庭组上下文
 *
 * 每个云函数目录内各存一份（云函数之间不能共享代码）。
 * 修改后需把本文件重新分发到所有云函数目录（在项目根目录用 shell 循环复制即可）。
 *
 * 设计要点：
 * 1. family_members 用 openid 直接作为文档 _id，天然唯一，避免并发重复建家庭
 * 2. 查询一律用云函数内取到的 familyId，前端不传 familyId（否则等于开放越权）
 * 3. 老数据（只有 _openid、没有 familyId）在首次建家庭时自动补齐，用户无感
 */
const INVITE_TTL = 24 * 60 * 60 * 1000
const INVITE_CODE_LENGTH = 6
// 去掉易混淆的 0/O/1/I，方便家人手输
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
// 需要归入家庭的集合
const SHARED_COLLECTIONS = ['pets', 'records', 'photos', 'expenses', 'reminders']

function createInvite() {
  let code = ''
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return { code, expireAt: Date.now() + INVITE_TTL }
}

async function readMembership(db, openid) {
  try {
    const result = await db.collection('family_members').doc(openid).get()
    return result.data || null
  } catch (error) {
    const message = (error && (error.errMsg || error.message)) || ''
    if (/does not exist/i.test(message)) {
      return null
    }
    throw error
  }
}

/**
 * 把该 openid 名下所有「没有 familyId」的历史数据补上 familyId。
 *
 * 刻意不用 exists 之类的查询运算符：万一云端不支持会被静默吞掉，
 * 结果是老数据没有 familyId、宠物列表直接变空。这里改为「读出来逐条判断 + 按 _id 更新」，
 * 只用最基础的读写能力，且可重复执行（有 familyId 的跳过）。
 */
const MIGRATE_BATCH = 100

async function migrateCollection(db, name, openid, familyId) {
  let skip = 0

  for (;;) {
    const result = await db
      .collection(name)
      .where({ _openid: openid })
      .skip(skip)
      .limit(MIGRATE_BATCH)
      .get()
    const docs = result.data

    const pending = docs.filter((doc) => !doc.familyId)
    await Promise.all(
      pending.map((doc) =>
        db
          .collection(name)
          .doc(doc._id)
          .update({ data: { familyId } })
          .catch((error) => {
            console.error('迁移单条数据失败', name, doc._id, error)
          })
      )
    )

    if (docs.length < MIGRATE_BATCH) {
      return
    }
    skip += MIGRATE_BATCH
  }
}

async function migrateLegacyData(db, openid, familyId) {
  await Promise.all(
    SHARED_COLLECTIONS.map((name) =>
      migrateCollection(db, name, openid, familyId).catch((error) => {
        console.error('迁移历史数据失败', name, error)
      })
    )
  )
}

async function createFamily(db, openid) {
  const now = Date.now()
  const invite = createInvite()
  const familyResult = await db.collection('families').add({
    data: {
      name: '我的家',
      ownerOpenid: openid,
      inviteCode: invite.code,
      inviteExpireAt: invite.expireAt,
      createdAt: now,
      updatedAt: now,
    },
  })
  const familyId = familyResult._id

  await db.collection('family_members').doc(openid).set({
    data: {
      _openid: openid,
      familyId,
      role: 'owner',
      joinedAt: now,
      updatedAt: now,
    },
  })

  // 并发兜底：若同一用户同时发起多个请求，以最终落库的成员关系为准
  const confirm = await readMembership(db, openid)
  if (confirm && confirm.familyId && confirm.familyId !== familyId) {
    return { familyId: confirm.familyId, role: confirm.role || 'member' }
  }

  await migrateLegacyData(db, openid, familyId)

  return { familyId, role: 'owner' }
}

/**
 * 取当前用户的家庭上下文；没有家庭则自动创建并把历史数据迁入。
 */
async function getFamilyContext(db, openid) {
  const membership = await readMembership(db, openid)
  if (membership && membership.familyId) {
    return { familyId: membership.familyId, role: membership.role || 'member' }
  }
  return createFamily(db, openid)
}

async function countMembers(db, familyId) {
  const result = await db.collection('family_members').where({ familyId }).count()
  return result.total
}

/**
 * 取家庭信息，邀请码缺失或过期时自动换新。
 */
async function ensureInvite(db, familyId) {
  const result = await db.collection('families').doc(familyId).get()
  const family = result.data
  if (!family) {
    return null
  }
  if (family.inviteCode && family.inviteExpireAt > Date.now()) {
    return family
  }

  const invite = createInvite()
  await db.collection('families').doc(familyId).update({
    data: {
      inviteCode: invite.code,
      inviteExpireAt: invite.expireAt,
      updatedAt: Date.now(),
    },
  })

  return { ...family, inviteCode: invite.code, inviteExpireAt: invite.expireAt }
}

module.exports = {
  INVITE_TTL,
  SHARED_COLLECTIONS,
  createInvite,
  readMembership,
  migrateLegacyData,
  createFamily,
  getFamilyContext,
  countMembers,
  ensureInvite,
}
