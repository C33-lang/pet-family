# 项目：多宠家庭管理小程序

> 本文件是 Codex 的项目总纲（长期记忆）。
> 每次开始新的开发对话前，Codex 会自动读取本文件。
> 遇到新的坑（比如 AI 反复犯同一个错误），随时把规则补充到本文件中。

## 一、产品定位

面向养 **2 只及以上** 宠物的家庭，提供宠物档案、健康记录、花费统计、周期提醒、养成激励五大能力。

**核心差异点（必须贯穿整个产品）：**

1. 以「宠物档案」为核心，所有数据（记录 / 花费 / 提醒）都必须挂在具体某只宠物下
2. 用「养成 / 等级」机制激励用户持续记录，而非单纯做记账工具
3. 面向多宠家庭，多宠管理不是附属功能而是核心场景

**目标用户：** 养 2 只以上猫狗的家庭，重视科学养宠、愿意为宠物持续投入、有记录习惯但缺乏趁手工具。

## 二、技术栈（严格遵守，不得擅自更换）

| 项 | 选型 |
|---|---|
| 前端框架 | 微信小程序原生开发 + TypeScript |
| 后端 | 微信云开发（云函数 + 云数据库 + 云存储），**禁止引入自建服务器** |
| UI 组件库 | WeUI |
| 主色调 | `#FF8C42`（暖橙） |
| 圆角 | `12rpx` |
| 整体风格 | 简洁治愈 |
| 状态管理 | 小程序原生 `globalData`，**禁止引入 MobX / Redux** |
| 图表 | ec-canvas（ECharts 小程序版），仅在统计模块使用 |

## 三、目录结构规范

```
pet-family/
├── miniprogram/
│   ├── pages/            # 每个页面独立目录，含 .wxml .wxss .ts .json
│   ├── components/       # 可复用组件
│   ├── utils/            # 工具函数（含埋点 track、日期处理、图片压缩）
│   ├── services/         # 云函数调用封装
│   └── images/           # 静态资源
├── cloudfunctions/       # 云函数，每个功能一个独立目录
├── typings/              # TypeScript 类型定义
├── AGENTS.md             # 本文件
└── project.config.json
```

## 四、数据模型

> 所有集合均使用 `_openid` 作为数据隔离依据。集合权限统一设置为「仅创建者可读写」。

### pets（宠物表）

```ts
{
  _id: string
  _openid: string        // 微信自动注入
  name: string           // 宠物名
  avatar: string         // 云存储 fileID
  breed: string          // 品种
  birthday: string       // 生日 YYYY-MM-DD
  adoptDate: string      // 到家日期 YYYY-MM-DD
  gender: 'male' | 'female' | 'unknown'
  sterilized: boolean    // 是否绝育
  createdAt: number      // 时间戳
}
```

### records（记录表）

```ts
{
  _id: string
  _openid: string
  petId: string          // 关联 pets._id
  type: 'feed' | 'bath' | 'deworm' | 'vaccine' | 'medical' | 'weight' | 'sterilize' | 'other'
  content: string        // 文字内容
  images: string[]       // 云存储 fileID 数组，最多 9 张
  tags: string[]         // 自定义标签
  weightData?: {         // 仅 type=weight 时存在，结构化存储
    value: number
    unit: 'kg' | 'g'
  }
  recordTime: number     // 记录发生时间
  createdAt: number
}
```

### expenses（花费表）

```ts
{
  _id: string
  _openid: string
  petIds: string[]       // 关联宠物，支持多宠分摊
  category: 'food' | 'litter' | 'snack' | 'medical' | 'toy' | 'grooming' | 'other'
  amount: number         // 金额（元，保留两位小数）
  note: string           // 备注
  voucher: string        // 凭证图 fileID
  expenseTime: number    // 消费时间
  createdAt: number
}
```

### reminders（提醒表）

```ts
{
  _id: string
  _openid: string
  petId: string          // 关联 pets._id
  title: string          // 事项名，如"体内驱虫"
  cycleType: 'weekly' | 'monthly' | 'interval' | 'yearly' | 'once'
  cycleValue: number     // interval 时为天数；其他类型为 1
  nextTriggerAt: number  // 下次触发时间戳
  enabled: boolean
  createdAt: number
}
```

### users（用户表）

```ts
{
  _id: string
  _openid: string
  isMember: boolean      // 是否会员
  level: number          // 等级
  exp: number            // 经验值
  createdAt: number
}
```

## 五、编码规范（必须遵守）

1. **权限校验**：所有数据库读写必须校验 `_openid`，用户只能操作自己的数据。云函数中禁止直接信任前端传入的 openid。
2. **统一返回格式**：云函数统一返回 `{ code: 0, message: '', data: null }`。`code: 0` 表示成功，非 0 表示失败。
3. **异步处理**：所有异步操作必须有 loading 状态和失败 toast 提示。
4. **页面三态**：每个页面必须处理三种状态 —— 加载中（骨架屏）、空数据（引导文案 + 插画）、有数据。
5. **错误兜底**：保存失败时必须保留用户已填内容，禁止直接清空表单。
6. **注释**：代码注释使用中文。
7. **图片上传**：上传前必须压缩，使用 `wx.compressImage`，质量 80，超过 2MB 必须压缩。
8. **并发控制**：多图上传需控制并发数（建议 3），禁止一次性并发上传 9 张。

## 六、工作方式要求（给 Codex 的指令）

1. **先出方案，再写代码**。接到任何任务，先输出实现方案（页面结构 + 云函数设计 + 数据结构），等我确认后再写代码。
2. **一次只做一个模块**。禁止跨模块批量修改。
3. **每轮结束给出改动清单**：改了哪些文件、为什么改、如何验证。
4. **遇到不确定的地方先问**，不要自己假设业务逻辑。
5. **不要引入未经批准的三方库**。

## 七、已踩过的坑（持续更新）

> 每次发现 AI 重复犯同一个错误，就把规则写在这里。

- [ ] 云函数**不能创建集合**，集合必须在云开发控制台手动创建
- [ ] 集合权限必须设置为「仅创建者可读写」，禁止"所有人可读"
- [ ] 月份边界计算需特殊处理（如 1 月 31 日的月周期）
