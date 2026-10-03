export interface ReminderTypeOption {
  value: ReminderType
  label: string
  icon: string
}

/** 提醒分类，云函数 reminder-create 的 validation.js 内有一份同样的白名单 */
export const REMINDER_TYPES: ReminderTypeOption[] = [
  { value: 'vaccine', label: '疫苗', icon: '💉' },
  { value: 'deworm', label: '驱虫', icon: '🐛' },
  { value: 'checkup', label: '体检', icon: '🩺' },
  { value: 'bath', label: '洗澡', icon: '🛁' },
  { value: 'med', label: '喂药', icon: '💊' },
  { value: 'other', label: '其他', icon: '📌' },
]

const TYPE_MAP: Record<string, ReminderTypeOption> = REMINDER_TYPES.reduce(
  (map, item) => {
    map[item.value] = item
    return map
  },
  {} as Record<string, ReminderTypeOption>
)

const FALLBACK_TYPE: ReminderTypeOption = {
  value: 'other',
  label: '其他',
  icon: '📌',
}

export function getReminderType(value: string): ReminderTypeOption {
  return TYPE_MAP[value] || FALLBACK_TYPE
}

export interface ReminderCycleOption {
  value: number
  label: string
}

/** 周期选项，云函数 reminder-create 的 validation.js 内有一份同样的白名单 */
export const REMINDER_CYCLES: ReminderCycleOption[] = [
  { value: 0, label: '仅一次' },
  { value: 7, label: '每 7 天' },
  { value: 14, label: '每 14 天' },
  { value: 30, label: '每月' },
  { value: 90, label: '每季度' },
  { value: 180, label: '每半年' },
  { value: 365, label: '每年' },
]

export const REMINDER_ADVANCES: ReminderCycleOption[] = [
  { value: 0, label: '当天提醒' },
  { value: 1, label: '提前 1 天' },
  { value: 3, label: '提前 3 天' },
  { value: 7, label: '提前 7 天' },
]

export function getCycleLabel(cycleDays: number): string {
  const found = REMINDER_CYCLES.filter((item) => item.value === cycleDays)[0]
  if (found) {
    return found.label
  }
  return cycleDays > 0 ? `每 ${cycleDays} 天` : '仅一次'
}

export function getAdvanceLabel(remindBeforeDays: number): string {
  const found = REMINDER_ADVANCES.filter(
    (item) => item.value === remindBeforeDays
  )[0]
  return found ? found.label : '当天提醒'
}

/** 今天 00:00 的时间戳，所有到期天数都以它为基准 */
export function startOfToday(now = new Date()): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/** 距今天的天数：负数表示已逾期，0 表示今天 */
export function getReminderDayDiff(nextDate: number, now = new Date()): number {
  return Math.round((nextDate - startOfToday(now)) / 86400000)
}

export type ReminderLevel = 'overdue' | 'today' | 'soon' | 'normal'

export interface ReminderStatus {
  dayDiff: number
  text: string
  level: ReminderLevel
}

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

/** 跨年时补上年份，同年只显示月-日 */
export function formatReminderDate(nextDate: number, now = new Date()): string {
  const date = new Date(nextDate)
  const prefix = date.getFullYear() === now.getFullYear() ? '' : `${date.getFullYear()}-`
  return `${prefix}${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function getReminderStatus(
  nextDate: number,
  now = new Date()
): ReminderStatus {
  const dayDiff = getReminderDayDiff(nextDate, now)

  if (dayDiff < 0) {
    return { dayDiff, level: 'overdue', text: `逾期 ${-dayDiff} 天` }
  }
  if (dayDiff === 0) {
    return { dayDiff, level: 'today', text: '今天' }
  }
  if (dayDiff === 1) {
    return { dayDiff, level: 'soon', text: '明天' }
  }
  if (dayDiff <= 7) {
    return { dayDiff, level: 'soon', text: `${dayDiff} 天后` }
  }
  return { dayDiff, level: 'normal', text: formatReminderDate(nextDate, now) }
}

/** 宠物列表角标文案，如「今天 · 疫苗」 */
export function buildReminderBadge(
  brief: PetReminderBrief | null | undefined,
  now = new Date()
): string {
  if (!brief || !Number.isFinite(brief.nextDate)) {
    return ''
  }
  return `${getReminderStatus(brief.nextDate, now).text} · ${brief.title}`
}

/** 角标严重程度，用于着色（逾期红 / 今天橙 / 7 天内浅橙 / 其余灰） */
export function getBadgeLevel(
  brief: PetReminderBrief | null | undefined,
  now = new Date()
): ReminderLevel | '' {
  if (!brief || !Number.isFinite(brief.nextDate)) {
    return ''
  }
  return getReminderStatus(brief.nextDate, now).level
}
