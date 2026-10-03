async function callExpenseFunction<T>(
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

export function createExpense(
  data: ExpenseCreateData
): Promise<{ id: string }> {
  return callExpenseFunction(
    'expense-create',
    data as unknown as Record<string, unknown>
  )
}

export function getExpenseList(
  petId: string,
  cursor: ExpenseCursor | null
): Promise<ExpenseListResult> {
  return callExpenseFunction('expense-list', { petId, cursor })
}

export function deleteExpense(id: string): Promise<{ id: string }> {
  return callExpenseFunction('expense-delete', { id })
}
