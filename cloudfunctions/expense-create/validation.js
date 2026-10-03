const CATEGORIES = [
  'food',
  'snack',
  'medical',
  'vaccine',
  'beauty',
  'toy',
  'other',
]
const MAX_AMOUNT = 999999
const MAX_REMARK = 200
const MAX_PETS = 20

function validateExpenseCreate(event) {
  if (!Array.isArray(event.petIds) || !event.petIds.length) {
    return '请至少选择一只宠物'
  }
  if (event.petIds.length > MAX_PETS) {
    return '关联宠物过多'
  }
  if (event.petIds.some((id) => typeof id !== 'string' || !id)) {
    return '宠物信息不正确'
  }
  if (new Set(event.petIds).size !== event.petIds.length) {
    return '关联宠物不能重复'
  }

  const amount = Number(event.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return '请输入大于 0 的金额'
  }
  if (amount > MAX_AMOUNT) {
    return '金额超出上限'
  }
  if (Math.abs(amount * 100 - Math.round(amount * 100)) > 1e-6) {
    return '金额最多保留两位小数'
  }

  if (CATEGORIES.indexOf(event.category) < 0) {
    return '请选择花费分类'
  }

  if (!Number.isFinite(event.expenseTime)) {
    return '消费时间不正确'
  }
  if (event.expenseTime > Date.now() + 60 * 1000) {
    return '消费时间不能晚于当前时间'
  }

  if (event.remark !== undefined && event.remark !== null) {
    if (typeof event.remark !== 'string') {
      return '备注格式不正确'
    }
    if (event.remark.length > MAX_REMARK) {
      return '备注最多 200 字'
    }
  }

  return ''
}

module.exports = { CATEGORIES, MAX_REMARK, validateExpenseCreate }
