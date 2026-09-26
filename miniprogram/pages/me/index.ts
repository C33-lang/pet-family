import { getPetList } from '../../services/pet'

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
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    if (this.data.status === 'success') {
      this.loadPetCount()
    }
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