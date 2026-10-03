import { createReminder } from '../../../services/reminder'
import { getPetList } from '../../../services/pet'
import { formatDate } from '../../../utils/date'
import {
  REMINDER_ADVANCES,
  REMINDER_CYCLES,
  REMINDER_TYPES,
  getReminderType,
} from '../../../utils/reminder'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

type TypeValue = ReminderType | ''

/** 日期选择器只到「天」，「下次提醒」取当天 00:00 */
function parseNextDate(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day).getTime()
}

function offsetDate(days: number): string {
  const now = new Date()
  return formatDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + days))
}

Page({
  data: {
    petId: '',
    types: REMINDER_TYPES,
    selectedType: '' as TypeValue,
    title: '',
    cycleLabels: REMINDER_CYCLES.map((item) => item.label),
    cycleIndex: 0,
    advanceLabels: REMINDER_ADVANCES.map((item) => item.label),
    advanceIndex: 0,
    date: formatDate(new Date()),
    minDate: formatDate(new Date()),
    maxDate: offsetDate(365 * 5),
    pets: [] as Pet[],
    selectedPetIds: [] as string[],
    /** 供 wxml 判断选中态（模板里不能调用 indexOf） */
    selectedMap: {} as Record<string, boolean>,
    remark: '',
    canSubmit: false,
    submitting: false,
    loadingPets: true,
    themeBg: getThemeColor(),
  },

  onLoad(options: Record<string, string>) {
    if (!options.petId) {
      wx.showToast({ title: '缺少宠物信息', icon: 'none' })
      setTimeout(() => wx.navigateBack(), 800)
      return
    }
    this.setData({
      petId: options.petId,
      selectedPetIds: [options.petId],
      selectedMap: { [options.petId]: true },
    })
    this.loadPets()
  },

  onShow() {
    const themeBg = getThemeColor()
    this.setData({ themeBg })
    syncThemeChrome(themeBg)
  },

  async loadPets() {
    try {
      const pets = await getPetList()
      this.setData({ pets, loadingPets: false })
    } catch (error) {
      this.setData({ loadingPets: false })
    }
  },

  handleTypeSelect(event: WechatMiniprogram.BaseEvent) {
    const selectedType = event.currentTarget.dataset.type as TypeValue
    this.setData({ selectedType }, () => this.updateSubmitState())
  },

  handleTitleInput(event: WechatMiniprogram.Input) {
    this.setData({ title: event.detail.value })
  },

  handleCycleChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ cycleIndex: Number(event.detail.value) })
  },

  handleAdvanceChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ advanceIndex: Number(event.detail.value) })
  },

  handleDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ date: event.detail.value as string })
  },

  handlePetToggle(event: WechatMiniprogram.BaseEvent) {
    const id = event.currentTarget.dataset.id as string
    if (!id) return

    const selected = this.data.selectedPetIds.slice()
    const index = selected.indexOf(id)
    if (index > -1) {
      // 至少保留一只，不然提醒不知道该挂在谁名下
      if (selected.length === 1) {
        wx.showToast({ title: '至少保留一只宠物', icon: 'none' })
        return
      }
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }

    this.setData({
      selectedPetIds: selected,
      selectedMap: selected.reduce((map, item) => {
        map[item] = true
        return map
      }, {} as Record<string, boolean>),
    })
  },

  handleRemarkInput(event: WechatMiniprogram.TextareaInput) {
    this.setData({ remark: event.detail.value })
  },

  updateSubmitState() {
    this.setData({ canSubmit: Boolean(this.data.selectedType) })
  },

  async handleSubmit() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    const nextDate = parseNextDate(this.data.date)
    if (!Number.isFinite(nextDate)) {
      wx.showToast({ title: '请选择下次提醒日期', icon: 'none' })
      return
    }

    const type = this.data.selectedType as ReminderType
    const data: ReminderCreateData = {
      petIds: this.data.selectedPetIds,
      type,
      // 留空时用分类名兜底，保证列表与角标总有可展示的名称
      title: this.data.title.trim() || getReminderType(type).label,
      cycleDays: REMINDER_CYCLES[this.data.cycleIndex].value,
      nextDate,
      remindBeforeDays: REMINDER_ADVANCES[this.data.advanceIndex].value,
      remark: this.data.remark.trim(),
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中', mask: true })

    try {
      await createReminder(data)
      wx.hideLoading()
      this.getOpenerEventChannel().emit('reminderCreated')
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
