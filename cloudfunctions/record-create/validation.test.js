const test = require('node:test')
const assert = require('node:assert/strict')
const { validateRecord } = require('./validation')

const NOW = new Date('2026-09-26T10:00:00+08:00').getTime()

test('未选择记录类型时拒绝提交', () => {
  assert.equal(
    validateRecord({ petId: 'pet-1', type: '', recordTime: NOW }, NOW),
    '请选择记录类型'
  )
})

test('拒绝未来发生时间', () => {
  assert.equal(
    validateRecord(
      { petId: 'pet-1', type: 'feed', recordTime: NOW + 1 },
      NOW
    ),
    '发生时间不能晚于当前时间'
  )
})

test('体重记录要求大于零且最多一位小数', () => {
  assert.equal(
    validateRecord(
      {
        petId: 'pet-1',
        type: 'weight',
        recordTime: NOW,
        weightData: { value: 0, unit: 'kg' },
      },
      NOW
    ),
    '请输入正确的体重'
  )
  assert.equal(
    validateRecord(
      {
        petId: 'pet-1',
        type: 'weight',
        recordTime: NOW,
        weightData: { value: 3.14, unit: 'kg' },
      },
      NOW
    ),
    '体重最多保留一位小数'
  )
})

test('合法记录通过校验', () => {
  assert.equal(
    validateRecord(
      {
        petId: 'pet-1',
        type: 'weight',
        recordTime: NOW,
        weightData: { value: 3.1, unit: 'kg' },
      },
      NOW
    ),
    ''
  )
})
