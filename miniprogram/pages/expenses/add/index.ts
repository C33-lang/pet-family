import { createExpense } from '../../../services/expense'
import { getPetList } from '../../../services/pet'
import { formatDate } from '../../../utils/date'
import { EXPENSE_CATEGORIES, formatAmount } from '../../../utils/expense'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

type CategoryValue = ExpenseCategory | ''

function parseLocalDate(value: string): number {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59).getTime()
}

Page({
  data: {
    petId: '',
    categories: EXPENSE_CATEGORIES,
    selectedCategory: '' as CategoryValue,
    amount: '',
    date: formatDate(new Date()),
    maxDate: formatDate(new Date()),
    pets: [] as Pet[],
    selectedPetIds: [] as string[],
    /** 供 wxml 判断选中态（模板里不能调用 indexOf） */
    selectedMap: {} as Record<string, boolean>,
    shareText: '',
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
    this.setData({ petId: options.petId, selectedPetIds: [options.petId], selectedMap: { [options.petId]: true } })
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
      this.updateShareText()
    } catch (error) {
      this.setData({ loadingPets: false })
    }
  },

  handleCategorySelect(event: WechatMiniprogram.BaseEvent) {
    const selectedCategory = event.currentTarget.dataset.category as CategoryValue
    this.setData({ selectedCategory }, () => this.updateSubmitState())
  },

  handleAmountInput(event: WechatMiniprogram.Input) {
    this.setData({ amount: event.detail.value }, () => {
      this.updateSubmitState()
      this.updateShareText()
    })
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
      // 至少保留一只，不然这笔账没有归属
      if (selected.length === 1) {
        wx.showToast({ title: '至少保留一只宠物', icon: 'none' })
        return
      }
      selected.splice(index, 1)
    } else {
      selected.push(id)
    }

    this.setData(
      {
        selectedPetIds: selected,
        selectedMap: selected.reduce((map, item) => {
          map[item] = true
          return map
        }, {} as Record<string, boolean>),
      },
      () => {
        this.updateSubmitState()
        this.updateShareText()
      }
    )
  },

  handleRemarkInput(event: WechatMiniprogram.TextareaInput) {
    this.setData({ remark: event.detail.value })
  },

  updateShareText() {
    const count = this.data.selectedPetIds.length
    const amount = Number(this.data.amount)
    if (count <= 1 || !Number.isFinite(amount) || amount <= 0) {
      this.setData({ shareText: '' })
      return
    }
    this.setData({
      shareText: `${count} 只宠物均摊，每只计 ¥${formatAmount(amount / count)}`,
    })
  },

  updateSubmitState() {
    const amount = Number(this.data.amount)
    const validAmount =
      Boolean(this.data.amount) &&
      Number.isFinite(amount) &&
      amount > 0 &&
      Math.abs(amount * 100 - Math.round(amount * 100)) < 1e-6

    this.setData({
      canSubmit: Boolean(this.data.selectedCategory) && validAmount,
    })
  },

  async handleSubmit() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    const expenseTime = parseLocalDate(this.data.date)
    if (!Number.isFinite(expenseTime) || expenseTime > Date.now()) {
      wx.showToast({ title: '消费日期不能晚于今天', icon: 'none' })
      return
    }

    const data: ExpenseCreateData = {
      petIds: this.data.selectedPetIds,
      amount: Number(Number(this.data.amount).toFixed(2)),
      category: this.data.selectedCategory as ExpenseCategory,
      expenseTime,
      remark: this.data.remark.trim(),
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中', mask: true })

    try {
      await createExpense(data)
      wx.hideLoading()
      this.getOpenerEventChannel().emit('expenseCreated')
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
