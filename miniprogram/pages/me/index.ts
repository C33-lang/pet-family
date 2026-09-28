import { getPetList } from '../../services/pet'
import {
  THEMES,
  getTheme,
  getThemeKey,
  setThemeKey,
  syncThemeChrome,
} from '../../utils/theme'

const DEFAULT_AVATAR = ''

type PageStatus = 'loading' | 'success' | 'error'

interface UserInfo {
  avatarUrl: string
  nickName: string
}

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
    themes: THEMES,
    themeKey: getThemeKey(),
    themeName: getTheme().name,
    themeBg: getTheme().color,
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
    this.setData({
      themeKey: theme.key,
      themeName: theme.name,
      themeBg: theme.color,
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