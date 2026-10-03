import {
  completeReminder,
  deleteReminder,
  getReminderList,
} from '../../services/reminder'
import { formatDate } from '../../utils/date'
import {
  formatReminderDate,
  getAdvanceLabel,
  getCycleLabel,
  getReminderStatus,
  getReminderType,
} from '../../utils/reminder'

type ReminderListItem = {
  _id: string
  icon: string
  /** 自定义名称，留空时回退到分类名 */
  title: string
  typeLabel: string
  statusText: string
  level: string
  dateText: string
  cycleText: string
  advanceText: string
  lastDoneText: string
  doneCount: number
  petText: string
  remarkText: string
}

type StatsView = {
  pendingCount: number
  overdueCount: number
  todayCount: number
  weekCount: number
}

const EMPTY_STATS: StatsView = {
  pendingCount: 0,
  overdueCount: 0,
  todayCount: 0,
  weekCount: 0,
}

function buildStats(results: ReminderListResult): StatsView {
  const stats = results.stats
  if (!stats) {
    return EMPTY_STATS
  }

  const overdueCount = stats.overdueCount || 0
  const todayCount = stats.todayCount || 0
  return {
    overdueCount,
    todayCount,
    weekCount: stats.weekCount || 0,
    pendingCount: overdueCount + todayCount,
  }
}

function buildItem(reminder: PetReminder): ReminderListItem {
  const type = getReminderType(reminder.type)
  const status = getReminderStatus(reminder.nextDate)
  const petCount =
    Array.isArray(reminder.petIds) && reminder.petIds.length
      ? reminder.petIds.length
      : 1

  return {
    _id: reminder._id,
    icon: type.icon,
    title: reminder.title || type.label,
    typeLabel: type.label,
    statusText: status.text,
    level: status.level,
    dateText: formatReminderDate(reminder.nextDate),
    cycleText: getCycleLabel(reminder.cycleDays),
    advanceText: getAdvanceLabel(reminder.remindBeforeDays),
    lastDoneText: reminder.lastDoneAt
      ? formatDate(new Date(reminder.lastDoneAt))
      : '暂无记录',
    doneCount: reminder.doneCount || 0,
    petText: petCount > 1 ? `${petCount} 只宠物共同提醒` : '',
    remarkText: reminder.remark || '暂无备注',
  }
}

Component({
  properties: {
    petId: {
      type: String,
      value: '',
      observer(petId: string) {
        if (petId) {
          this.reload()
        }
      },
    },
  },

  data: {
    status: 'loading' as 'loading' | 'empty' | 'ready' | 'error',
    reminders: [] as ReminderListItem[],
    stats: EMPTY_STATS,
    cursor: null as ReminderCursor | null,
    hasMore: true,
    loadingMore: false,
    loadMoreError: false,
    errorMessage: '',
    /** 底部弹层展示的提醒，为空表示弹层收起 */
    sheetItem: null as ReminderListItem | null,
    completing: false,
    deletingId: '',
  },

  lifetimes: {
    attached() {
      ;(this as any)._destroyed = false
    },
    detached() {
      ;(this as any)._destroyed = true
    },
  },

  methods: {
    isDestroyed(): boolean {
      return Boolean((this as any)._destroyed)
    },

    async reload() {
      if (!this.data.petId) return
      this.setData({
        status: 'loading',
        reminders: [],
        stats: EMPTY_STATS,
        cursor: null,
        hasMore: true,
        loadingMore: false,
        loadMoreError: false,
        errorMessage: '',
        sheetItem: null,
      })
      await this.loadPage(null, true)
    },

    async loadPage(cursor: ReminderCursor | null, reset = false) {
      if (!this.data.petId || this.data.loadingMore) return
      if (!reset && !this.data.hasMore) return

      this.setData({ loadingMore: true, loadMoreError: false })
      try {
        const result = await getReminderList(this.data.petId, cursor)
        if (this.isDestroyed()) return

        const items = result.list.map(buildItem)
        const reminders = reset ? items : this.data.reminders.concat(items)
        this.setData({
          reminders,
          cursor: result.nextCursor,
          hasMore: result.hasMore,
          loadingMore: false,
          stats: result.stats ? buildStats(result) : this.data.stats,
          status: reminders.length ? 'ready' : 'empty',
        })
      } catch (error) {
        if (this.isDestroyed()) return
        if (reset) {
          this.setData({
            status: 'error',
            loadingMore: false,
            errorMessage: (error as Error).message || '加载失败，请重试',
          })
          return
        }
        this.setData({ loadingMore: false, loadMoreError: true })
      }
    },

    handleLoadMore() {
      if (this.data.status !== 'ready' || this.data.loadingMore || !this.data.hasMore) {
        return
      }
      this.loadPage(this.data.cursor)
    },

    handleRetryMore() {
      this.loadPage(this.data.cursor)
    },

    handleAdd() {
      wx.navigateTo({
        url: `/pages/reminders/add/index?petId=${this.data.petId}`,
        events: {
          reminderCreated: () => this.reload(),
        },
      })
    },

    handleView(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      const sheetItem = this.data.reminders.filter((item) => item._id === id)[0]
      if (sheetItem) {
        this.setData({ sheetItem })
      }
    },

    handleCloseSheet() {
      this.setData({ sheetItem: null })
    },

    async handleComplete() {
      const item = this.data.sheetItem
      if (!item || this.data.completing) return

      this.setData({ completing: true })
      wx.showLoading({ title: '处理中', mask: true })
      try {
        const result = await completeReminder(item._id)
        wx.hideLoading()
        this.setData({ completing: false, sheetItem: null })
        wx.showToast({
          title: result.finished ? '已标记完成' : '已顺延到下次',
          icon: 'success',
        })
        // 打卡会影响日期与统计，重新拉取一次保证数字正确
        await this.reload()
      } catch (error) {
        wx.hideLoading()
        this.setData({ completing: false })
        wx.showToast({
          title: (error as Error).message || '操作失败，请重试',
          icon: 'none',
        })
      }
    },

    async handleDelete(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      if (!id || this.data.deletingId) return

      const modal = await wx.showModal({
        title: '删除提醒',
        content: '确定删除这条提醒吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#E64340',
      })
      if (!modal.confirm) return

      this.setData({ deletingId: id })
      wx.showLoading({ title: '删除中', mask: true })
      try {
        await deleteReminder(id)
        wx.hideLoading()
        this.setData({ deletingId: '', sheetItem: null })
        wx.showToast({ title: '已删除', icon: 'success' })
        await this.reload()
      } catch (error) {
        wx.hideLoading()
        this.setData({ deletingId: '' })
        wx.showToast({
          title: (error as Error).message || '删除失败，请重试',
          icon: 'none',
        })
      }
    },
  },
})
