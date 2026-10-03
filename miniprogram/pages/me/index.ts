import { getFamilyInfo, leaveFamily } from '../../services/family'
import { getPetList } from '../../services/pet'
import {
  CUSTOM_SATURATION,
  LIGHT_OPTIONS,
  THEME_GROUPS,
  getCustomThemeState,
  getTheme,
  getThemeKey,
  hslToHex,
  setCustomTheme,
  setThemeKey,
  syncThemeChrome,
} from '../../utils/theme'

const DEFAULT_AVATAR = ''

type PageStatus = 'loading' | 'success' | 'error'

interface UserInfo {
  avatarUrl: string
  nickName: string
}

function buildCustomColor(hue: number, lightIndex: number): string {
  const level = LIGHT_OPTIONS[lightIndex] || LIGHT_OPTIONS[1]
  return hslToHex(hue, CUSTOM_SATURATION, level.value)
}

const initialCustom = getCustomThemeState()
const initialTheme = getTheme()

Page({
  data: {
    status: 'loading' as PageStatus,
    retrying: false,
    errorMessage: '请检查网络后重试',
    userInfo: {
      avatarUrl: DEFAULT_AVATAR,
      nickName: '微信用户',
    } as UserInfo,
    petCount: 0,
    level: 1,
    exp: 0,
    nextLevelExp: 100,
    progressPercent: 0,
    themeGroups: THEME_GROUPS,
    lightOptions: LIGHT_OPTIONS,
    themeKey: getThemeKey(),
    themeName: initialTheme.name,
    themeBg: initialTheme.color,
    hue: initialCustom.hue,
    lightIndex: initialCustom.lightIndex,
    customColor: buildCustomColor(initialCustom.hue, initialCustom.lightIndex),
    family: null as FamilyInfo | null,
    familyError: '',
    familyBusy: false,
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.applyTheme()
    if (this.data.status === 'success') {
      this.loadPetCount()
      this.loadFamily()
    }
  },

  onShareAppMessage() {
    const family = this.data.family
    const code = family && family.inviteCode ? family.inviteCode : ''
    return {
      title: '一起来记录毛孩子的日常',
      path: code
        ? `/pages/family/join/index?code=${code}`
        : '/pages/family/join/index',
    }
  },

  applyTheme() {
    const theme = getTheme()
    const customState = getCustomThemeState()
    this.setData({
      themeKey: theme.key,
      themeName: theme.name,
      themeBg: theme.color,
      hue: customState.hue,
      lightIndex: customState.lightIndex,
      customColor: buildCustomColor(customState.hue, customState.lightIndex),
    })
    syncThemeChrome(theme.color, true)
  },

  handleThemeTap(event: WechatMiniprogram.BaseEvent) {
    const key = event.currentTarget.dataset.key as string
    if (!key || key === this.data.themeKey) {
      return
    }

    if (!setThemeKey(key)) {
      wx.showToast({ title: '设置失败，请重试', icon: 'none' })
      return
    }

    this.applyTheme()
    wx.showToast({ title: '背景已更新', icon: 'none' })
  },

  applyCustomTheme(hue: number, lightIndex: number, withToast = false): void {
    const theme = setCustomTheme(hue, lightIndex)
    if (!theme) {
      wx.showToast({ title: '设置失败，请重试', icon: 'none' })
      return
    }

    this.setData({
      themeKey: theme.key,
      themeName: theme.name,
      themeBg: theme.color,
      hue,
      lightIndex,
      customColor: theme.color,
    })
    syncThemeChrome(theme.color, true)

    if (withToast) {
      wx.showToast({ title: '背景已更新', icon: 'none' })
    }
  },

  handleHueChanging(event: WechatMiniprogram.SliderChange) {
    // 拖动过程中仅预览色块，松手后才写库并全局生效
    const hue = Math.round(event.detail.value)
    this.setData({
      hue,
      customColor: buildCustomColor(hue, this.data.lightIndex),
    })
  },

  handleHueChange(event: WechatMiniprogram.SliderChange) {
    const hue = Math.round(event.detail.value)
    this.applyCustomTheme(hue, this.data.lightIndex)
  },

  handleLightTap(event: WechatMiniprogram.BaseEvent) {
    const lightIndex = Number(event.currentTarget.dataset.index)
    if (Number.isNaN(lightIndex) || lightIndex === this.data.lightIndex) {
      return
    }
    this.applyCustomTheme(this.data.hue, lightIndex)
  },

  loadData() {
    this.setData({
      status: 'loading',
      retrying: true,
    })
    Promise.all([this.loadPetCount(), this.loadFamily()])
      .then(() => {
        this.setData({
          status: 'success',
          retrying: false,
        })
      })
      .catch((error: { errMsg?: string; message?: string }) => {
        this.setData({
          status: 'error',
          retrying: false,
          errorMessage: error?.message || error?.errMsg || '请检查网络后重试',
        })
        wx.showToast({
          title: '加载失败',
          icon: 'none',
        })
      })
  },

  loadPetCount(): Promise<void> {
    return getPetList().then((list) => {
      this.setData({
        petCount: list.length,
      })
    })
  },

  // 家庭信息失败不影响整页，只在卡片内提示
  loadFamily(): Promise<void> {
    return getFamilyInfo()
      .then((family) => {
        this.setData({ family, familyError: '' })
      })
      .catch((error: { message?: string }) => {
        this.setData({
          family: null,
          familyError: error?.message || '家庭信息加载失败，请重试',
        })
      })
  },

  handlePetsTap() {
    wx.switchTab({
      url: '/pages/pets/list/index',
    })
  },

  handleCopyInvite() {
    const family = this.data.family
    const code = family && family.inviteCode ? family.inviteCode : ''
    if (!code) {
      wx.showToast({ title: '邀请码获取中，请稍候', icon: 'none' })
      return
    }

    wx.setClipboardData({
      data: code,
      success: () => {
        wx.showToast({ title: '邀请码已复制', icon: 'none' })
      },
    })
  },

  handleJoinTap() {
    wx.navigateTo({
      url: '/pages/family/join/index',
    })
  },

  handleLeaveTap() {
    if (this.data.familyBusy) {
      return
    }

    wx.showModal({
      title: '退出家庭',
      content: '退出后你看不到这个家庭共享的宠物数据，你自己创建的记录仍会留在家庭中。确定退出吗？',
      confirmText: '退出',
      confirmColor: '#E24B4A',
      success: (result) => {
        if (result.confirm) {
          this.doLeaveFamily()
        }
      },
    })
  },

  async doLeaveFamily() {
    this.setData({ familyBusy: true })
    wx.showLoading({ title: '处理中', mask: true })

    try {
      await leaveFamily()
      wx.hideLoading()
      wx.showToast({ title: '已退出家庭', icon: 'success' })
      await Promise.all([this.loadPetCount(), this.loadFamily()])
    } catch (error) {
      wx.hideLoading()
      const leaveError = error as Error & { code?: number }
      wx.showModal({
        title: '无法退出',
        content: leaveError.message || '退出失败，请重试',
        showCancel: false,
      })
    } finally {
      this.setData({ familyBusy: false })
    }
  },
})
