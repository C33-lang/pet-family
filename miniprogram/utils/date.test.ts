import { calculatePetAge, isFutureDate } from './date'

describe('calculatePetAge', () => {
  const today = new Date(2026, 8, 26)

  it('按岁和月展示年龄', () => {
    expect(calculatePetAge('2024-07-20', today)).toBe('2岁2个月')
  })

  it('不满一个月时展示天数', () => {
    expect(calculatePetAge('2026-09-10', today)).toBe('16天')
  })

  it('正确处理月底边界', () => {
    expect(calculatePetAge('2026-01-31', new Date(2026, 1, 28))).toBe('1个月')
  })

  it('未来生日显示未知', () => {
    expect(calculatePetAge('2026-09-27', today)).toBe('年龄未知')
  })
})

describe('isFutureDate', () => {
  it('拒绝晚于今天的日期', () => {
    expect(isFutureDate('2026-09-27', new Date(2026, 8, 26))).toBe(true)
  })
})
