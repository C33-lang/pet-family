import { joinFamily } from '../../../services/family'
import { getThemeColor, syncThemeChrome } from '../../../utils/theme'

const CODE_LENGTH = 6

Page({
  data: {
    code: '',
    canSubmit: false,
    submitting: false,
    errorMessage: '',
    themeBg: getThemeColor(),
  },

  onShow() {
    const themeBg = getThemeColor()
    this.setData({ themeBg })
    syncThemeChrome(themeBg)
  },

  onLoad(options: Record<string, string>) {
    const code = (options.code || '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, CODE_LENGTH)

    if (!code) {
      return
    }

    this.setData({ code, canSubmit: code.length === CODE_LENGTH })

    // 从分享卡片进来时已带邀请码，直接提交，省一步操作
    if (code.length === CODE_LENGTH) {
      this.handleSubmit()
    }
  },

  handleInput(event: WechatMiniprogram.Input) {
    const code = event.detail.value
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, CODE_LENGTH)

    this.setData({
      code,
      canSubmit: code.length === CODE_LENGTH,
      errorMessage: '',
    })

    return code
  },

  async handleSubmit() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    this.setData({ submitting: true, errorMessage: '' })
    wx.showLoading({ title: '加入中', mask: true })

    try {
      const result = await joinFamily(this.data.code)
      wx.hideLoading()
      wx.showToast({
        title: result.alreadyJoined ? '你已在这个家庭中' : '已加入家庭',
        icon: 'success',
      })
      setTimeout(() => wx.navigateBack(), 1200)
    } catch (error) {
      wx.hideLoading()
      const joinError = error as Error & { code?: number }
      this.setData({
        submitting: false,
        errorMessage: joinError.message || '加入失败，请重试',
      })
    }
  },
})
