import { getPetList } from '../../../services/pet'
import { calculatePetAge } from '../../../utils/date'

type PetListItem = Pet & {
  ageText: string
  level: number
}

Page({
  data: {
    status: 'loading' as 'loading' | 'empty' | 'ready' | 'error' | 'unauthorized',
    pets: [] as PetListItem[],
    errorMessage: '',
  },

  onShow() {
    this.loadPets()
  },

  async loadPets() {
    this.setData({ status: 'loading', errorMessage: '' })

    try {
      const pets = await getPetList()
      const list = pets.map((pet) => ({
        ...pet,
        ageText: calculatePetAge(pet.birthday),
        // 等级系统后续接入，本期仅展示占位等级。
        level: 1,
      }))

      this.setData({
        pets: list,
        status: list.length ? 'ready' : 'empty',
      })
    } catch (error) {
      const requestError = error as Error & { code?: number }
      if (requestError.code === 40101) {
        this.setData({ status: 'unauthorized' })
        return
      }

      this.setData({
        status: 'error',
        errorMessage: requestError.message || '网络开小差了，请重试',
      })
    }
  },

  async handleAuthorize() {
    try {
      const result = await wx.getUserProfile({
        desc: '用于完善家庭养宠体验',
      })
      const app = getApp<IAppOption>()
      app.globalData.userInfo = result.userInfo
      await this.loadPets()
    } catch (error) {
      wx.showToast({ title: '授权后才能管理宠物', icon: 'none' })
    }
  },

  handleAdd() {
    wx.navigateTo({ url: '/pages/pets/edit/index' })
  },

  handlePetTap(event: WechatMiniprogram.BaseEvent) {
    const { id } = event.currentTarget.dataset
    wx.navigateTo({ url: `/pages/pets/detail/index?id=${id}` })
  },
})
