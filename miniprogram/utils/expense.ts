export interface ExpenseCategoryOption {
  value: ExpenseCategory
  label: string
  icon: string
}

/** 花费分类，云函数 expense-create 的 validation.js 内有一份同样的白名单 */
export const EXPENSE_CATEGORIES: ExpenseCategoryOption[] = [
  { value: 'food', label: '主粮', icon: '🍚' },
  { value: 'snack', label: '零食', icon: '🍖' },
  { value: 'medical', label: '医疗', icon: '💊' },
  { value: 'vaccine', label: '疫苗驱虫', icon: '💉' },
  { value: 'beauty', label: '美容洗澡', icon: '🛁' },
  { value: 'toy', label: '用品玩具', icon: '🧸' },
  { value: 'other', label: '其他', icon: '📦' },
]

const CATEGORY_MAP: Record<string, ExpenseCategoryOption> = EXPENSE_CATEGORIES.reduce(
  (map, item) => {
    map[item.value] = item
    return map
  },
  {} as Record<string, ExpenseCategoryOption>
)

const FALLBACK_CATEGORY: ExpenseCategoryOption = {
  value: 'other',
  label: '其他',
  icon: '📦',
}

export function getExpenseCategory(value: string): ExpenseCategoryOption {
  return CATEGORY_MAP[value] || FALLBACK_CATEGORY
}

/** 金额展示：保留两位小数 + 千分位 */
export function formatAmount(value: number): string {
  const safe = Number.isFinite(value) ? value : 0
  const fixed = Math.round(safe * 100) / 100
  const parts = fixed.toFixed(2).split('.')
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  return parts.join('.')
}
