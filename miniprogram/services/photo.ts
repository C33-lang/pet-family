async function callPhotoFunction<T>(
  name: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const response = await wx.cloud.callFunction({ name, data })
  const result = response.result as CloudResult<T>

  if (!result || typeof result.code !== 'number') {
    throw new Error('服务返回异常')
  }
  if (result.code !== 0) {
    throw new Error(result.message || '操作失败')
  }
  return result.data
}

export function addPhoto(petId: string, fileID: string): Promise<PetPhoto> {
  return callPhotoFunction('photo-add', { petId, fileID })
}

export function getPhotoList(
  petId: string,
  cursor: PhotoCursor | null
): Promise<PhotoListResult> {
  return callPhotoFunction('photo-list', { petId, cursor })
}

export function deletePhoto(id: string): Promise<{ id: string }> {
  return callPhotoFunction('photo-delete', { id })
}
