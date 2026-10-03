type ReminderType =
  | 'vaccine'
  | 'deworm'
  | 'checkup'
  | 'bath'
  | 'med'
  | 'other'

interface PetReminder {
  _id: string
  /** 关联宠物，多宠共记（如全家一起驱虫） */
  petIds: string[]
  type: ReminderType
  title: string
  /** 周期天数，0 表示一次性 */
  cycleDays: number
  /** 下次到期日（当天 00:00 时间戳） */
  nextDate: number
  /** 提前几天开始提醒 */
  remindBeforeDays: number
  enabled: boolean
  lastDoneAt: number | null
  doneCount: number
  remark: string
  isOrphan: boolean
  createdAt: number
}

interface ReminderCreateData {
  petIds: string[]
  type: ReminderType
  title: string
  cycleDays: number
  nextDate: number
  remindBeforeDays: number
  remark: string
}

interface ReminderCursor {
  nextDate: number
  id: string
}

interface ReminderStats {
  /** 已逾期条数 */
  overdueCount: number
  /** 今天到期条数 */
  todayCount: number
  /** 未来 7 天内到期条数（不含今天） */
  weekCount: number
}

interface ReminderListResult {
  list: PetReminder[]
  pageSize: number
  hasMore: boolean
  nextCursor: ReminderCursor | null
  /** 仅首页（cursor 为空）返回 */
  stats: ReminderStats | null
}

/** 宠物列表角标用的最紧急提醒摘要（由 pet-list 云函数附带返回） */
interface PetReminderBrief {
  title: string
  nextDate: number
}

interface ReminderCompleteResult {
  id: string
  /** 一次性提醒打卡后即结束 */
  finished: boolean
  nextDate: number | null
}
