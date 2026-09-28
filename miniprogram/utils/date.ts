const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

function parseLocalDate(value: string): Date | null {
  if (!DATE_PATTERN.test(value)) {
    return null
  }

  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function addCalendarMonths(date: Date, months: number): Date {
  const targetMonthIndex = date.getMonth() + months
  const targetYear = date.getFullYear() + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const targetDay = Math.min(
    date.getDate(),
    getDaysInMonth(targetYear, normalizedMonth)
  )

  return new Date(targetYear, normalizedMonth, targetDay)
}

function diffCalendarDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(
    start.getFullYear(),
    start.getMonth(),
    start.getDate()
  )
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())
  return Math.max(0, Math.floor((endUtc - startUtc) / 86400000))
}

export function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isFutureDate(value: string, today = new Date()): boolean {
  const date = parseLocalDate(value)
  if (!date) {
    return false
  }

  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )
  return date.getTime() > current.getTime()
}

/**
 * 按自然月计算宠物年龄，月底会自动对齐到目标月份最后一天。
 */
export function calculatePetAge(
  birthday: string,
  today = new Date()
): string {
  const birthDate = parseLocalDate(birthday)
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  if (!birthDate || birthDate.getTime() > current.getTime()) {
    return '年龄未知'
  }

  let totalMonths =
    (current.getFullYear() - birthDate.getFullYear()) * 12 +
    current.getMonth() -
    birthDate.getMonth()

  if (addCalendarMonths(birthDate, totalMonths).getTime() > current.getTime()) {
    totalMonths -= 1
  }

  if (totalMonths <= 0) {
    return `${diffCalendarDays(birthDate, current)}天`
  }

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12

  if (years > 0) {
    return `${years}岁${months}个月`
  }

  return `${months}个月`
}

/**
 * 精确到天的宠物年龄（详情页使用）。
 * 列表页仍用 calculatePetAge 保持简洁，避免卡片文字过长。
 */
export function calculatePetAgeDetail(
  birthday: string,
  today = new Date()
): string {
  const birthDate = parseLocalDate(birthday)
  const current = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  )

  if (!birthDate || birthDate.getTime() > current.getTime()) {
    return '年龄未知'
  }

  let totalMonths =
    (current.getFullYear() - birthDate.getFullYear()) * 12 +
    current.getMonth() -
    birthDate.getMonth()

  if (addCalendarMonths(birthDate, totalMonths).getTime() > current.getTime()) {
    totalMonths -= 1
  }

  const anchor = addCalendarMonths(birthDate, Math.max(0, totalMonths))
  const days = diffCalendarDays(anchor, current)

  if (totalMonths <= 0) {
    return days === 0 ? '今天出生' : `${days}天`
  }

  const years = Math.floor(totalMonths / 12)
  const months = totalMonths % 12
  const parts: string[] = []

  if (years > 0) {
    parts.push(`${years}岁`)
  }
  if (months > 0) {
    parts.push(`${months}个月`)
  }
  if (days > 0) {
    parts.push(`${days}天`)
  }

  return parts.join('')
}
