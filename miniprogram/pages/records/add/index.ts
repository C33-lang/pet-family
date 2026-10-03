import { createRecord } from '../../../services/record'
import { formatDate } from '../../../utils/date'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

const RECORD_TYPES = [
  { value: 'feed', label: '喂食', icon: '🍚' },
  { value: 'deworm', label: '驱虫', icon: '💊' },
  { value: 'vaccine', label: '疫苗', icon: '💉' },
  { value: 'bath', label: '洗澡', icon: '🛁' },
  { value: 'medical', label: '体检', icon: '🩺' },
  { value: 'weight', label: '体重', icon: '⚖️' },
  { value: 'other', label: '其他', icon: '📝' },
] as const

type AddRecordType = RecordCreateData['type'] | ''

function formatTime(date: Date): string {
  const hour = String(date.getHours()).padStart(2, '0')
  const minute = String(date.getMinutes()).padStart(2, '0')
  return `${hour}:${minute}`
}

function parseLocalDateTime(dateValue: string, timeValue: string): number {
  const [year, month, day] = dateValue.split('-').map(Number)
  const [hour, minute] = timeValue.split(':').map(Number)
  return new Date(year, month - 1, day, hour, minute).getTime()
}

Page({
  data: {
    petId: '',
    recordTypes: RECORD_TYPES,
    selectedType: '' as AddRecordType,
    date: formatDate(new Date()),
    time: formatTime(new Date()),
    maxDate: formatDate(new Date()),
    maxTime: formatTime(new Date()),
    content: '',
    weight: '',
    canSubmit: false,
    submitting: false,
    themeBg: getThemeColor(),
  },

  onShow() {
    const themeBg = getThemeColor()
    this.setData({ themeBg })
    syncThemeChrome(themeBg)
  },

  onLoad(options: Record<string, string>) {
    if (!options.petId) {
      wx.showToast({ title: '缺少宠物信息', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({ petId: options.petId })
  },

  handleTypeSelect(event: WechatMiniprogram.BaseEvent) {
    const selectedType = event.currentTarget.dataset.type as AddRecordType
    this.setData({ selectedType }, () => this.updateSubmitState())
  },

  handleDateChange(event: WechatMiniprogram.PickerChange) {
    const date = event.detail.value as string
    const isToday = date === this.data.maxDate
    const maxTime = isToday ? formatTime(new Date()) : '23:59'
    const time = isToday && this.data.time > maxTime ? maxTime : this.data.time
    this.setData({ date, time, maxTime })
  },

  handleTimeChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ time: event.detail.value as string })
  },

  handleContentInput(event: WechatMiniprogram.TextareaInput) {
    this.setData({ content: event.detail.value })
  },

  handleWeightInput(event: WechatMiniprogram.Input) {
    this.setData({ weight: event.detail.value }, () => this.updateSubmitState())
  },

  updateSubmitState() {
    const weight = Number(this.data.weight)
    const hasValidWeight =
      this.data.selectedType !== 'weight' ||
      (Boolean(this.data.weight) &&
        Number.isFinite(weight) &&
        weight > 0 &&
        Math.abs(weight * 10 - Math.round(weight * 10)) < 1e-8)
    this.setData({
      canSubmit: Boolean(this.data.selectedType) && hasValidWeight,
    })
  },

  async handleSubmit() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    const recordTime = parseLocalDateTime(this.data.date, this.data.time)
    if (!Number.isFinite(recordTime) || recordTime > Date.now()) {
      wx.showToast({ title: '发生时间不能晚于当前时间', icon: 'none' })
      return
    }

    const data: RecordCreateData = {
      petId: this.data.petId,
      type: this.data.selectedType as RecordCreateData['type'],
      content: this.data.content.trim(),
      recordTime,
    }
    if (data.type === 'weight') {
      data.weightData = {
        value: Number(Number(this.data.weight).toFixed(1)),
        unit: 'kg',
      }
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中', mask: true })

    try {
      await createRecord(data)
      wx.hideLoading()
      this.getOpenerEventChannel().emit('recordCreated')
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({
        title: (error as Error).message || '保存失败，请重试',
        icon: 'none',
      })
    }
  },
})
