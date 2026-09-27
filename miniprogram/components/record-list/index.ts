import { deleteRecord, getRecordList } from '../../services/record'

const TYPE_META: Record<RecordType, { icon: string; label: string }> = {
  feed: { icon: '🍚', label: '喂食' },
  deworm: { icon: '💊', label: '驱虫' },
  vaccine: { icon: '💉', label: '疫苗' },
  bath: { icon: '🛁', label: '洗澡' },
  medical: { icon: '🩺', label: '体检' },
  weight: { icon: '⚖️', label: '体重' },
  sterilize: { icon: '🏥', label: '绝育' },
  other: { icon: '📝', label: '其他' },
}

type DisplayRecord = HealthRecord & {
  icon: string
  typeName: string
  summary: string
  timeText: string
}

function formatRecordTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
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
    records: [] as DisplayRecord[],
    page: 0,
    hasMore: true,
    loadingMore: false,
    loadMoreError: false,
    errorMessage: '',
  },

  methods: {
    async reload() {
      if (!this.data.petId) {
        return
      }

      this.setData({
        status: 'loading',
        records: [],
        page: 0,
        hasMore: true,
        loadingMore: false,
        loadMoreError: false,
        errorMessage: '',
      })
      await this.loadPage(0, true)
    },

    async loadPage(page: number, reset = false) {
      if (!this.data.petId || this.data.loadingMore) {
        return
      }
      if (!reset && !this.data.hasMore) {
        return
      }

      this.setData({ loadingMore: true, loadMoreError: false })

      try {
        const result = await getRecordList(this.data.petId, page)
        const nextRecords = result.list.map((record) => {
          const meta = TYPE_META[record.type] || TYPE_META.other
          const weightText = record.weightData
            ? `${record.weightData.value}${record.weightData.unit}`
            : ''
          const summary =
            record.content && weightText
              ? `${weightText} · ${record.content}`
              : record.content || weightText
          return {
            ...record,
            icon: meta.icon,
            typeName: meta.label,
            summary,
            timeText: formatRecordTime(record.recordTime),
          }
        })
        const records = reset
          ? nextRecords
          : this.data.records.concat(nextRecords)

        this.setData({
          records,
          page,
          hasMore: result.hasMore,
          loadingMore: false,
          status: records.length ? 'ready' : 'empty',
        })
      } catch (error) {
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
      if (
        this.data.status !== 'ready' ||
        this.data.loadingMore ||
        !this.data.hasMore
      ) {
        return
      }
      this.loadPage(this.data.page + 1)
    },

    handleRetryMore() {
      this.loadPage(this.data.page + 1)
    },

    handleAdd() {
      wx.navigateTo({
        url: `/pages/records/add/index?petId=${this.data.petId}`,
        events: {
          recordCreated: () => this.reload(),
        },
      })
    },

    handleView(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      const record = this.data.records.find((item) => item._id === id)
      if (!record) {
        return
      }
      wx.showModal({
        title: `${record.typeName} · ${record.timeText}`,
        content: record.summary || '暂无备注',
        showCancel: false,
        confirmText: '知道了',
        confirmColor: '#FF8C42',
      })
    },

    async handleDelete(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      if (!id) {
        return
      }

      const modal = await wx.showModal({
        title: '删除记录',
        content: '确定删除这条记录吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#E64340',
      })
      if (!modal.confirm) {
        return
      }

      wx.showLoading({ title: '删除中', mask: true })
      try {
        await deleteRecord(id)
        const records = this.data.records.filter((record) => record._id !== id)
        this.setData({
          records,
          status: records.length ? 'ready' : 'empty',
        })
        wx.hideLoading()
        wx.showToast({ title: '已删除', icon: 'success' })
      } catch (error) {
        wx.hideLoading()
        wx.showToast({
          title: (error as Error).message || '删除失败，请重试',
          icon: 'none',
        })
      }
    },
  },
})
