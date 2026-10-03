import { deleteExpense, getExpenseList } from '../../services/expense'
import { formatDate } from '../../utils/date'
import { formatAmount, getExpenseCategory } from '../../utils/expense'

type ExpenseListItem = {
  _id: string
  icon: string
  categoryLabel: string
  /** 本只宠物分摊后的金额 */
  amountText: string
  /** 多宠共记时展示均摊说明 */
  sharedText: string
  remarkText: string
  dateText: string
  detail: string
}

type CategoryBar = {
  category: string
  icon: string
  label: string
  amountText: string
  percent: number
}

type StatsView = {
  monthTotalText: string
  totalText: string
  monthCount: number
  byCategory: CategoryBar[]
}

const EMPTY_STATS: StatsView = {
  monthTotalText: '0.00',
  totalText: '0.00',
  monthCount: 0,
  byCategory: [],
}

function buildStats(results: ExpenseListResult): StatsView {
  const stats = results.stats
  if (!stats) {
    return EMPTY_STATS
  }

  const monthTotal = stats.monthTotal || 0
  const byCategory: CategoryBar[] = (stats.byCategory || []).map((item) => {
    const category = getExpenseCategory(item.category)
    return {
      category: item.category,
      icon: category.icon,
      label: category.label,
      amountText: formatAmount(item.amount),
      percent: monthTotal > 0 ? Math.round((item.amount / monthTotal) * 1000) / 10 : 0,
    }
  })

  return {
    monthTotalText: formatAmount(monthTotal),
    totalText: formatAmount(stats.total || 0),
    monthCount: stats.monthCount || 0,
    byCategory,
  }
}

function buildItem(expense: PetExpense): ExpenseListItem {
  const category = getExpenseCategory(expense.category)
  const petCount =
    Array.isArray(expense.petIds) && expense.petIds.length ? expense.petIds.length : 1
  const share = expense.amount / petCount
  const dateText = formatDate(new Date(expense.expenseTime))
  const sharedText = petCount > 1 ? `${petCount} 只均摊 · 共 ¥${formatAmount(expense.amount)}` : ''
  const remark = (expense.remark || '').trim()

  const detailLines = [
    `${category.label} · ${dateText}`,
    `本只支出 ¥${formatAmount(share)}`,
    petCount > 1 ? `${petCount} 只宠物均摊，整笔 ¥${formatAmount(expense.amount)}` : '',
    remark ? `备注：${remark}` : '备注：无',
  ].filter(Boolean)

  return {
    _id: expense._id,
    icon: category.icon,
    categoryLabel: category.label,
    amountText: formatAmount(share),
    sharedText,
    remarkText: remark || '暂无备注',
    dateText,
    detail: detailLines.join('\n'),
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
    expenses: [] as ExpenseListItem[],
    stats: EMPTY_STATS,
    cursor: null as ExpenseCursor | null,
    hasMore: true,
    loadingMore: false,
    loadMoreError: false,
    errorMessage: '',
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
        expenses: [],
        stats: EMPTY_STATS,
        cursor: null,
        hasMore: true,
        loadingMore: false,
        loadMoreError: false,
        errorMessage: '',
      })
      await this.loadPage(null, true)
    },

    async loadPage(cursor: ExpenseCursor | null, reset = false) {
      if (!this.data.petId || this.data.loadingMore) return
      if (!reset && !this.data.hasMore) return

      this.setData({ loadingMore: true, loadMoreError: false })
      try {
        const result = await getExpenseList(this.data.petId, cursor)
        if (this.isDestroyed()) return

        const items = result.list.map(buildItem)
        const expenses = reset ? items : this.data.expenses.concat(items)
        this.setData({
          expenses,
          cursor: result.nextCursor,
          hasMore: result.hasMore,
          loadingMore: false,
          stats: result.stats ? buildStats(result) : this.data.stats,
          status: expenses.length ? 'ready' : 'empty',
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
        url: `/pages/expenses/add/index?petId=${this.data.petId}`,
        events: {
          expenseCreated: () => this.reload(),
        },
      })
    },

    async handleView(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      const item = this.data.expenses.find((expense) => expense._id === id)
      if (!item) return

      await wx.showModal({
        title: '花费详情',
        content: item.detail,
        showCancel: false,
        confirmText: '知道了',
      })
    },

    async handleDelete(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      if (!id || this.data.deletingId) return

      const modal = await wx.showModal({
        title: '删除花费',
        content: '确定删除这条花费记录吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#E64340',
      })
      if (!modal.confirm) return

      this.setData({ deletingId: id })
      wx.showLoading({ title: '删除中', mask: true })
      try {
        await deleteExpense(id)
        wx.hideLoading()
        this.setData({ deletingId: '' })
        wx.showToast({ title: '已删除', icon: 'success' })
        // 删除会影响本月与累计统计，重新拉取一次保证数字正确
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
