const VALID_TYPES = [
  'feed',
  'deworm',
  'vaccine',
  'bath',
  'medical',
  'weight',
  'other',
]

function validateRecord(data, now = Date.now()) {
  if (!data.petId || typeof data.petId !== 'string') {
    return '缺少宠物ID'
  }
  if (!VALID_TYPES.includes(data.type)) {
    return '请选择记录类型'
  }
  if (!Number.isFinite(data.recordTime) || data.recordTime <= 0) {
    return '发生时间不正确'
  }
  if (data.recordTime > now) {
    return '发生时间不能晚于当前时间'
  }
  if (data.type === 'weight') {
    const weight = data.weightData && data.weightData.value
    if (
      !Number.isFinite(weight) ||
      weight <= 0 ||
      !data.weightData ||
      data.weightData.unit !== 'kg'
    ) {
      return '请输入正确的体重'
    }
    if (Math.abs(weight * 10 - Math.round(weight * 10)) > 1e-8) {
      return '体重最多保留一位小数'
    }
  }
  return ''
}

module.exports = { VALID_TYPES, validateRecord }
