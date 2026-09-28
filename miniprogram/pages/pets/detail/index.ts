import { deletePet, getPetDetail } from '../../../services/pet'
import { calculatePetAgeDetail } from '../../../utils/date'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

const GENDER_TEXT = {
  male: '公',
  female: '母',
  unknown: '未知',
}

Page({
  data: {
    id: '',
    status: 'loading' as 'loading' | 'ready' | 'error',
    pet: null as (Pet & { ageText: string; genderText: string }) | null,
    activeTab: 'records',
    deleting: false,
    themeBg: getThemeColor(),
    errorMessage: '',
  },

  onLoad(options: Record<string, string>) {
    if (!options.id) {
      this.setData({
        status: 'error',
        errorMessage: '缺少宠物信息',
      })
      return
    }

    this.setData({ id: options.id })
  },

  onShow() {
    this.applyTheme()
    if (this.data.id) {
      this.loadDetail()
    }
  },

  applyTheme() {
    const themeBg = getThemeColor()
    this.setData({ themeBg })
    syncThemeChrome(themeBg)
  },

  async loadDetail() {
    this.setData({ status: 'loading', errorMessage: '' })
    try {
      const pet = await getPetDetail(this.data.id)
      this.setData({
        status: 'ready',
        pet: {
          ...pet,
          ageText: calculatePetAgeDetail(pet.birthday),
          genderText: GENDER_TEXT[pet.gender],
        },
      })
      wx.setNavigationBarTitle({ title: pet.name })
    } catch (error) {
      this.setData({
        status: 'error',
        errorMessage: (error as Error).message || '加载失败，请重试',
      })
    }
  },

  handleTabChange(event: WechatMiniprogram.BaseEvent) {
    this.setData({ activeTab: event.currentTarget.dataset.tab })
  },

  handleEdit() {
    wx.navigateTo({ url: `/pages/pets/edit/index?id=${this.data.id}` })
  },

  async handleDelete() {
    if (this.data.deleting) {
      return
    }

    const modal = await wx.showModal({
      title: '删除宠物',
      content: '删除后，关联记录、花费和提醒将保留并标记为孤儿数据。确认删除吗？',
      confirmText: '确认删除',
      confirmColor: '#E64340',
    })

    if (!modal.confirm) {
      return
    }

    this.setData({ deleting: true })
    wx.showLoading({ title: '删除中', mask: true })

    try {
      await deletePet(this.data.id)
      wx.hideLoading()
      wx.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.hideLoading()
      this.setData({ deleting: false })
      wx.showToast({
        title: (error as Error).message || '删除失败，请重试',
        icon: 'none',
      })
    }
  },
})
