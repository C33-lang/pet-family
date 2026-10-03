import { getPetList } from '../../../services/pet'
import { calculatePetAge } from '../../../utils/date'
import { buildReminderBadge, getBadgeLevel } from '../../../utils/reminder'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

type PetListItem = Pet & {
  ageText: string
  level: number
  /** 提醒角标文案，无提醒时为空串 */
  reminderBadge: string
  reminderLevel: string
}

/** 宠物数量达到该值时显示搜索框，少量宠物不打扰 */
const SEARCH_THRESHOLD = 6
/** 本地列表缓存：冷启动时先渲染上次的数据，避免白屏等待 */
const CACHE_KEY = 'pet_list_cache'

function readCache(): PetListItem[] {
  try {
    const cached = wx.getStorageSync(CACHE_KEY)
    return Array.isArray(cached) ? (cached as PetListItem[]) : []
  } catch (error) {
    return []
  }
}

function writeCache(list: PetListItem[]) {
  if (!list.length) {
    return
  }
  try {
    wx.setStorageSync(CACHE_KEY, list)
  } catch (error) {
    // 缓存写入失败不影响主流程
  }
}

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

  applyList(list: PetListItem[]) {
    this.setData({
      pets: list,
      filteredPets: this.filterPets(list, this.data.keyword),
      showSearch: list.length >= SEARCH_THRESHOLD,
      status: list.length ? 'ready' : 'empty',
      errorMessage: '',
    })
  },

  async loadPets() {
    // 1. 本地无数据时先用缓存秒开，把等待时间藏起来
    if (!this.data.pets.length) {
      const cached = readCache()
      if (cached.length) {
        this.applyList(cached)
      }
    }

    // 2. 已有内容（缓存或上次结果）时静默刷新：不闪加载态、失败不报错
    const silent = this.data.pets.length > 0 || this.data.status === 'empty'
    if (!silent) {
      this.setData({ status: 'loading', errorMessage: '' })
    }

    try {
      const pets = await getPetList()
      const list = pets.map((pet) => ({
        ...pet,
        ageText: calculatePetAge(pet.birthday),
        // 等级系统后续接入，本期仅展示占位等级。
        level: 1,
        reminderBadge: buildReminderBadge(pet.reminderBrief),
        reminderLevel: getBadgeLevel(pet.reminderBrief),
      }))

      writeCache(list)
      this.applyList(list)
    } catch (error) {
      const requestError = error as Error & { code?: number }

      if (silent) {
        // 静默刷新失败：保留已有内容，不打扰用户
        return
      }

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

  handleAdd() {
    wx.navigateTo({ url: '/pages/pets/edit/index' })
  },

  handlePetTap(event: WechatMiniprogram.BaseEvent) {
    const { id } = event.currentTarget.dataset
    wx.navigateTo({ url: `/pages/pets/detail/index?id=${id}` })
  },
})
