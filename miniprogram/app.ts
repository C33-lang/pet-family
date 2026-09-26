App<IAppOption>({
  globalData: {},

  onLaunch() {
    if (!wx.cloud) {
      wx.showModal({
        title: '提示',
        content: '当前微信版本过低，请升级微信后重试。',
        showCancel: false,
      })
      return
    }

    wx.cloud.init({
      env: 'cloud1-d4g7kfhsue712285a',
      traceUser: true,
    })
  },
})
