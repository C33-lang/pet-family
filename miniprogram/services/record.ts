async function callRecordFunction<T>(
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

export function createRecord(data: RecordCreateData): Promise<{ id: string }> {
  return callRecordFunction(
    'record-create',
    data as unknown as Record<string, unknown>
  )
}

export function getRecordList(
  petId: string,
  page: number
): Promise<RecordListResult> {
  return callRecordFunction('record-list', {
    petId,
    page,
    pageSize: 20,
  })
}

export function deleteRecord(id: string): Promise<{ id: string }> {
  return callRecordFunction('record-delete', { id })
}
