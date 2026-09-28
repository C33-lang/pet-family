const cloud = require('wx-server-sdk')
const { getFamilyContext } = require('./family')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const VALID_GENDERS = ['male', 'female', 'unknown']
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function success(data) {
  return { code: 0, message: '', data }
}

function failure(code, message) {
  return { code, message, data: null }
}

function getTodayString() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)
}

function isValidDate(value) {
  if (!DATE_PATTERN.test(value)) {
    return false
  }
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function validatePet(data) {
  if (!data.id || typeof data.id !== 'string') {
    return '缺少宠物ID'
  }
  if (!data.name || !String(data.name).trim()) {
    return '请输入宠物名称'
  }
  if (String(data.name).trim().length > 20) {
    return '宠物名称不能超过20个字'
  }
  if (!VALID_GENDERS.includes(data.gender)) {
    return '请选择正确的性别'
  }
  if (data.birthday) {
    if (!isValidDate(data.birthday)) {
      return '生日格式不正确'
    }
    if (data.birthday > getTodayString()) {
      return '生日不能晚于今天'
    }
  }
  if (data.adoptDate && !isValidDate(data.adoptDate)) {
    return '到家日期格式不正确'
  }
  return ''
}

exports.main = async (event) => {
  const { OPENID } = cloud.getWXContext()
  if (!OPENID) {
    return failure(40101, '请先登录')
  }

  const validationMessage = validatePet(event)
  if (validationMessage) {
    return failure(40001, validationMessage)
  }

  try {
    const context = await getFamilyContext(db, OPENID)
    const queryResult = await db
      .collection('pets')
      .where({ _id: event.id, familyId: context.familyId })
      .limit(1)
      .get()

    if (!queryResult.data.length) {
      return failure(40401, '宠物不存在或无权操作')
    }

    const updateData = {
      name: String(event.name).trim(),
      avatar: typeof event.avatar === 'string' ? event.avatar : '',
      breed: typeof event.breed === 'string' ? event.breed.trim() : '',
      birthday: typeof event.birthday === 'string' ? event.birthday : '',
      adoptDate: typeof event.adoptDate === 'string' ? event.adoptDate : '',
      gender: event.gender,
      sterilized: Boolean(event.sterilized),
      updatedAt: Date.now(),
    }

    await db.collection('pets').doc(event.id).update({ data: updateData })
    return success({ id: event.id })
  } catch (error) {
    console.error('更新宠物失败', error)
    return failure(50002, '更新宠物失败，请重试')
  }
}
