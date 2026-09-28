/**
 * 背景主题：提供若干预设底色，用户可在「我的」页切换，本地持久化。
 */

export interface ThemeOption {
  key: string
  name: string
  color: string
}

export const THEMES: ThemeOption[] = [
  { key: 'warm', name: '暖白（默认）', color: '#FFFAF6' },
  { key: 'cream', name: '奶油黄', color: '#FFFBF0' },
  { key: 'pink', name: '樱粉', color: '#FFF5F7' },
  { key: 'blue', name: '雾蓝', color: '#F2F7FF' },
  { key: 'green', name: '薄荷绿', color: '#F3FBF6' },
  { key: 'gray', name: '素灰', color: '#F7F8FA' },
]

export const DEFAULT_THEME_KEY = 'warm'

const STORAGE_KEY = 'pet-family-theme'

export function getThemeKey(): string {
  try {
    const stored = wx.getStorageSync(STORAGE_KEY) as string
    if (stored && THEMES.some((item) => item.key === stored)) {
      return stored
    }
  } catch (error) {
    // 读取失败时回退默认主题
  }
  return DEFAULT_THEME_KEY
}

export function setThemeKey(key: string): boolean {
  if (!THEMES.some((item) => item.key === key)) {
    return false
  }
  try {
    wx.setStorageSync(STORAGE_KEY, key)
    return true
  } catch (error) {
    return false
  }
}

export function getTheme(key = getThemeKey()): ThemeOption {
  return THEMES.find((item) => item.key === key) || THEMES[0]
}

export function getThemeColor(key = getThemeKey()): string {
  return getTheme(key).color
}

/**
 * 同步窗口背景（下拉露出的区域）与 tabBar 底色。
 * withTabBar 仅在 tabBar 页面传 true。
 */
export function syncThemeChrome(color: string, withTabBar = false): void {
  wx.setBackgroundColor({
    backgroundColor: color,
    backgroundColorTop: color,
    backgroundColorBottom: color,
    fail: () => undefined,
  })

  if (withTabBar) {
    wx.setTabBarStyle({
      backgroundColor: color,
      color: '#999999',
      selectedColor: '#FF8C42',
      borderStyle: 'black',
      fail: () => undefined,
    })
  }
}
