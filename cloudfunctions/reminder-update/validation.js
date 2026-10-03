const TYPES = ['vaccine', 'deworm', 'checkup', 'bath', 'med', 'other']
const CYCLES = [0, 7, 14, 30, 90, 180, 365]
const ADVANCES = [0, 1, 3, 7]
const MAX_TITLE = 20
const MAX_REMARK = 200
const MAX_PETS = 20
const MAX_AHEAD_DAYS = 3650

/**
 * 校验新建/编辑提醒的参数。
 * 本文件在 reminder-create 与 reminder-update 各存一份副本（云函数之间不能共享代码），
 * 改动后请同步。
 */
function validateReminderCreate(event) {
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

  if (TYPES.indexOf(event.type) < 0) {
    return '请选择提醒分类'
  }

  if (event.title !== undefined && event.title !== null) {
    if (typeof event.title !== 'string') {
      return '提醒名称格式不正确'
    }
    if (event.title.length > MAX_TITLE) {
      return `提醒名称最多 ${MAX_TITLE} 字`
    }
  }

  if (CYCLES.indexOf(Number(event.cycleDays)) < 0) {
    return '提醒周期不正确'
  }

  if (ADVANCES.indexOf(Number(event.remindBeforeDays)) < 0) {
    return '提前提醒天数不正确'
  }

  if (!Number.isFinite(event.nextDate)) {
    return '下次提醒日期不正确'
  }
  // 前端已用 picker 限制「今天及以后」，这里只做合理区间兜底。
  // 不用「今天 00:00」硬比：云函数与客户端时区若有偏差会误伤合法输入。
  const now = Date.now()
  if (event.nextDate < now - 2 * 86400000) {
    return '下次提醒日期不能早于今天'
  }
  if (event.nextDate > now + MAX_AHEAD_DAYS * 86400000) {
    return '下次提醒日期过于久远'
  }

  if (event.remark !== undefined && event.remark !== null) {
    if (typeof event.remark !== 'string') {
      return '备注格式不正确'
    }
    if (event.remark.length > MAX_REMARK) {
      return `备注最多 ${MAX_REMARK} 字`
    }
  }

  return ''
}

module.exports = { TYPES, CYCLES, ADVANCES, MAX_TITLE, MAX_REMARK, validateReminderCreate }
