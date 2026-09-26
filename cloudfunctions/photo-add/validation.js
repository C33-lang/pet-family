function validatePhotoAdd(event) {
  if (!event.petId || typeof event.petId !== 'string') {
    return '缺少宠物ID'
  }
  if (!event.fileID || typeof event.fileID !== 'string') {
    return '缺少照片文件'
  }
  return ''
}

module.exports = { validatePhotoAdd }
