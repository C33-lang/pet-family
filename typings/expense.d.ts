type ExpenseCategory =
  | 'food'
  | 'snack'
  | 'medical'
  | 'vaccine'
  | 'beauty'
  | 'toy'
  | 'other'

interface PetExpense {
  _id: string
  /** 关联宠物（多选时金额均摊） */
  petIds: string[]
  /** 整笔金额，单位元 */
  amount: number
  category: ExpenseCategory
  expenseTime: number
  remark: string
  createdAt: number
}

interface ExpenseCreateData {
  petIds: string[]
  amount: number
  category: ExpenseCategory
  expenseTime: number
  remark: string
}

interface ExpenseCursor {
  expenseTime: number
  id: string
}

interface ExpenseCategoryStat {
  category: ExpenseCategory
  amount: number
}

interface ExpenseStats {
  /** 累计花费（该宠物分摊后） */
  total: number
  /** 本月花费（该宠物分摊后） */
  monthTotal: number
  monthCount: number
  byCategory: ExpenseCategoryStat[]
}

interface ExpenseListResult {
  list: PetExpense[]
  pageSize: number
  hasMore: boolean
  nextCursor: ExpenseCursor | null
  /** 仅首页（cursor 为空）返回 */
  stats: ExpenseStats | null
}
