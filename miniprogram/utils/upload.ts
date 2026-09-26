const MAX_IMAGE_SIZE = 2 * 1024 * 1024

function getFileSize(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath,
      success: (result) => resolve(result.size),
      fail: reject,
    })
  })
}

function compressImage(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality: 80,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    })
  })
}

/**
 * 图片超过 2MB 时按项目约定压缩；头像统一压缩一次以降低上传体积。
 */
export async function prepareImage(filePath: string): Promise<string> {
  const size = await getFileSize(filePath)
  if (size > MAX_IMAGE_SIZE) {
    return compressImage(filePath)
  }

  return compressImage(filePath)
}

export async function uploadPetAvatar(filePath: string): Promise<string> {
  const uploadPath = await prepareImage(filePath)
  const extensionMatch = uploadPath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  const extension = extensionMatch ? extensionMatch[1] : 'jpg'
  const cloudPath = `pets/avatars/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`
  const result = await wx.cloud.uploadFile({
    cloudPath,
    filePath: uploadPath,
  })

  return result.fileID
}
