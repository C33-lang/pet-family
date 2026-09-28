async function callFamilyFunction<T>(
  name: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const response = await wx.cloud.callFunction({ name, data })
  const result = response.result as CloudResult<T>

  if (!result || typeof result.code !== 'number') {
    throw new Error('服务返回异常')
  }

  if (result.code !== 0) {
    const error = new Error(result.message || '操作失败') as Error & {
      code?: number
    }
    error.code = result.code
    throw error
  }

  return result.data
}

export function getFamilyInfo(): Promise<FamilyInfo> {
  return callFamilyFunction<FamilyInfo>('family-info')
}

export function joinFamily(
  code: string
): Promise<{ familyId: string; alreadyJoined?: boolean }> {
  return callFamilyFunction('family-join', { code })
}

export function leaveFamily(): Promise<{ familyId: string }> {
  return callFamilyFunction('family-leave')
}
