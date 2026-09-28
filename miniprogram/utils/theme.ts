/**
 * 背景主题：24 个预设色（4 组）+ 自定义色相调色，本地持久化。
 * 预设色与自定义色都保证是浅色底，正文深色始终可读。
 */

export interface ThemeOption {
  key: string
  name: string
  color: string
}

export interface ThemeGroup {
  name: string
  themes: ThemeOption[]
}

export const CUSTOM_THEME_KEY = 'custom'

/** 自定义色饱和度固定，仅开放色相与明度，避免调出刺眼/不可读的底色 */
export const CUSTOM_SATURATION = 0.35

export const LIGHT_OPTIONS = [
  { name: '稍深', value: 0.9 },
  { name: '标准', value: 0.94 },
  { name: '更浅', value: 0.97 },
]

export const THEME_GROUPS: ThemeGroup[] = [
  {
    name: '暖色系',
    themes: [
      { key: 'warm', name: '暖白（默认）', color: '#FFFAF6' },
      { key: 'cream', name: '奶油黄', color: '#FFFBF0' },
      { key: 'peach', name: '蜜桃', color: '#FFF3EC' },
      { key: 'pink', name: '樱粉', color: '#FFF5F7' },
      { key: 'lilac', name: '藕荷', color: '#FBF3FA' },
      { key: 'almond', name: '杏仁', color: '#FFF6EF' },
    ],
  },
  {
    name: '冷色系',
    themes: [
      { key: 'blue', name: '雾蓝', color: '#F2F7FF' },
      { key: 'sky', name: '晴空', color: '#EEF6FB' },
      { key: 'lake', name: '湖蓝', color: '#EFFAF8' },
      { key: 'green', name: '薄荷绿', color: '#F3FBF6' },
      { key: 'forest', name: '森绿', color: '#F1F8EF' },
      { key: 'violet', name: '淡紫', color: '#F5F3FF' },
    ],
  },
  {
    name: '中性系',
    themes: [
      { key: 'ivory', name: '象牙', color: '#FAF8F3' },
      { key: 'warmgray', name: '暖灰', color: '#F7F6F4' },
      { key: 'gray', name: '素灰', color: '#F7F8FA' },
      { key: 'moon', name: '月白', color: '#F6F8F9' },
      { key: 'sand', name: '浅砂', color: '#F6F4F0' },
      { key: 'smoke', name: '烟灰', color: '#F4F5F7' },
    ],
  },
  {
    name: '莫兰迪',
    themes: [
      { key: 'lotus', name: '藕粉', color: '#F8ECE9' },
      { key: 'grayblue', name: '灰蓝', color: '#E9EFF5' },
      { key: 'beangreen', name: '豆绿', color: '#EAF0E7' },
      { key: 'oat', name: '燕麦', color: '#F3EDE5' },
      { key: 'hazepurple', name: '雾紫', color: '#EFEBF4' },
      { key: 'khaki', name: '卡其', color: '#F1EDE6' },
    ],
  },
]

const PRESET_THEMES: ThemeOption[] = THEME_GROUPS.reduce(
  (list: ThemeOption[], group) => list.concat(group.themes),
  []
)

export const THEMES: ThemeOption[] = PRESET_THEMES

export const DEFAULT_THEME_KEY = 'warm'

const THEME_STORAGE_KEY = 'pet-family-theme'
const CUSTOM_STORAGE_KEY = 'pet-family-theme-custom'

interface CustomThemeConfig {
  hue: number
  lightIndex: number
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function normalizeHue(hue: number): number {
  return ((Math.round(hue) % 360) + 360) % 360
}

/** HSL -> HEX，用于按色相/明度算出背景色 */
export function hslToHex(
  hue: number,
  saturation: number,
  lightness: number
): string {
  const h = normalizeHue(hue) / 360
  const s = clamp(saturation, 0, 1)
  const l = clamp(lightness, 0, 1)

  const hueToRgb = (p: number, q: number, t: number): number => {
    let next = t
    if (next < 0) next += 1
    if (next > 1) next -= 1
    if (next < 1 / 6) return p + (q - p) * 6 * next
    if (next < 1 / 2) return q
    if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6
    return p
  }

  let r: number
  let g: number
  let b: number

  if (s === 0) {
    r = l
    g = l
    b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3)
  }

  const toHex = (value: number): string =>
    Math.round(value * 255)
      .toString(16)
      .padStart(2, '0')

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

function getCustomConfig(): CustomThemeConfig {
  try {
    const stored = wx.getStorageSync(CUSTOM_STORAGE_KEY) as CustomThemeConfig
    if (stored && typeof stored.hue === 'number') {
      return {
        hue: normalizeHue(stored.hue),
        lightIndex: clamp(
          Number(stored.lightIndex) || 0,
          0,
          LIGHT_OPTIONS.length - 1
        ),
      }
    }
  } catch (error) {
    // 读取失败时使用默认配置
  }
  return { hue: 24, lightIndex: 1 }
}

export function getThemeKey(): string {
  try {
    const stored = wx.getStorageSync(THEME_STORAGE_KEY) as string
    if (stored === CUSTOM_THEME_KEY) {
      return CUSTOM_THEME_KEY
    }
    if (stored && PRESET_THEMES.some((item) => item.key === stored)) {
      return stored
    }
  } catch (error) {
    // 读取失败时回退默认主题
  }
  return DEFAULT_THEME_KEY
}

export function getTheme(key = getThemeKey()): ThemeOption {
  if (key === CUSTOM_THEME_KEY) {
    const config = getCustomConfig()
    return {
      key: CUSTOM_THEME_KEY,
      name: `自定义 ${config.hue}°`,
      color: hslToHex(
        config.hue,
        CUSTOM_SATURATION,
        LIGHT_OPTIONS[config.lightIndex].value
      ),
    }
  }

  return PRESET_THEMES.find((item) => item.key === key) || PRESET_THEMES[0]
}

export function getThemeColor(key = getThemeKey()): string {
  return getTheme(key).color
}

export function setThemeKey(key: string): boolean {
  if (
    key !== CUSTOM_THEME_KEY &&
    !PRESET_THEMES.some((item) => item.key === key)
  ) {
    return false
  }
  try {
    wx.setStorageSync(THEME_STORAGE_KEY, key)
    return true
  } catch (error) {
    return false
  }
}

/** 保存自定义色（色相 + 明度档位）并切换为自定义主题 */
export function setCustomTheme(
  hue: number,
  lightIndex: number
): ThemeOption | null {
  const config: CustomThemeConfig = {
    hue: normalizeHue(hue),
    lightIndex: clamp(lightIndex, 0, LIGHT_OPTIONS.length - 1),
  }

  try {
    wx.setStorageSync(CUSTOM_STORAGE_KEY, config)
    wx.setStorageSync(THEME_STORAGE_KEY, CUSTOM_THEME_KEY)
  } catch (error) {
    return null
  }

  return {
    key: CUSTOM_THEME_KEY,
    name: `自定义 ${config.hue}°`,
    color: hslToHex(
      config.hue,
      CUSTOM_SATURATION,
      LIGHT_OPTIONS[config.lightIndex].value
    ),
  }
}

export function getCustomThemeState(): CustomThemeConfig {
  return getCustomConfig()
}

/**
 * 同步窗口背景（下拉露出的区域）、导航栏与 tabBar 底色。
 * withTabBar 仅在 tabBar 页面传 true。
 */
export function syncThemeChrome(color: string, withTabBar = false): void {
  wx.setBackgroundColor({
    backgroundColor: color,
    backgroundColorTop: color,
    backgroundColorBottom: color,
    fail: () => undefined,
  })

  wx.setNavigationBarColor({
    frontColor: '#000000',
    backgroundColor: color,
    animation: { duration: 0, timingFunc: 'linear' },
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
