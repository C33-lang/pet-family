interface IAppOption {
  // 本项目不收集用户昵称/头像（不调用 wx.getUserProfile），
  // globalData 仅保留空壳便于后续扩展
  globalData: Record<string, unknown>
}
