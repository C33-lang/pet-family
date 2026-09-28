import { getPetList } from '../../../services/pet'
import { calculatePetAge } from '../../../utils/date'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

type PetListItem = Pet & {
  ageText: string
  level: number
}

/** 宠物数量达到该值时显示搜索框，少量宠物不打扰 */
const SEARCH_THRESHOLD = 6

Page({
  data: {
    status: 'loading' as 'loading' | 'empty' | 'ready' | 'error' | 'unauthorized',
    pets: [] as PetListItem[],
    filteredPets: [] as PetListItem[],
    showSearch: false,
    keyword: '',
    themeBg: getThemeColor(),
    errorMessage: '',
  },

  onShow() {
    this.applyTheme()
    this.loadPets()
  },

  applyTheme() {
    const themeBg = getThemeColor()
    this.setData({ themeBg })
    syncThemeChrome(themeBg, true)
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
        filteredPets: this.filterPets(list, this.data.keyword),
        showSearch: list.length >= SEARCH_THRESHOLD,
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

  filterPets(list: PetListItem[], keyword: string): PetListItem[] {
    const word = keyword.trim().toLowerCase()
    if (!word) {
      return list
    }
    return list.filter((pet) => {
      const name = (pet.name || '').toLowerCase()
      const breed = (pet.breed || '').toLowerCase()
      return name.indexOf(word) > -1 || breed.indexOf(word) > -1
    })
  },

  handleKeywordInput(event: WechatMiniprogram.Input) {
    const keyword = event.detail.value || ''
    this.setData({
      keyword,
      filteredPets: this.filterPets(this.data.pets, keyword),
    })
  },

  handleClearKeyword() {
    this.setData({
      keyword: '',
      filteredPets: this.data.pets,
    })
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
