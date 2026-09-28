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
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.applyTheme()
    if (this.data.status === 'success') {
      this.loadPetCount()
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
    this.loadUserInfo()
    this.loadPetCount()
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

  loadUserInfo() {
    const app = getApp<IAppOption>()
    const userInfo = app.globalData?.userInfo
    if (userInfo) {
      this.setData({
        userInfo: {
          avatarUrl: userInfo.avatarUrl || DEFAULT_AVATAR,
          nickName: userInfo.nickName || '微信用户',
        },
      })
    }
  },

  loadPetCount(): Promise<void> {
    return getPetList().then((list) => {
      this.setData({
        petCount: list.length,
      })
    })
  },

  handlePetsTap() {
    wx.switchTab({
      url: '/pages/pets/list/index',
    })
  },
})