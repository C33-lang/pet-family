async function callReminderFunction<T>(
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

export function createReminder(
  data: ReminderCreateData
): Promise<{ id: string }> {
  return callReminderFunction(
    'reminder-create',
    data as unknown as Record<string, unknown>
  )
}

export function getReminderList(
  petId: string,
  cursor: ReminderCursor | null
): Promise<ReminderListResult> {
  return callReminderFunction('reminder-list', { petId, cursor })
}

/** 完成打卡：周期提醒顺延，一次性提醒结束 */
export function completeReminder(id: string): Promise<ReminderCompleteResult> {
  return callReminderFunction('reminder-update', { id, action: 'done' })
}

export function toggleReminder(
  id: string,
  enabled: boolean
): Promise<{ id: string; enabled: boolean }> {
  return callReminderFunction('reminder-update', { id, action: 'toggle', enabled })
}

export function updateReminder(
  id: string,
  data: ReminderCreateData
): Promise<{ id: string }> {
  return callReminderFunction('reminder-update', {
    id,
    action: 'edit',
    ...data,
  })
}

export function deleteReminder(id: string): Promise<{ id: string }> {
  return callReminderFunction('reminder-delete', { id })
}
