const test = require('node:test')
const assert = require('node:assert/strict')
const { PAGE_SIZE, parseCursor } = require('./pagination')

test('照片列表服务端固定每页 18 张', () => {
  assert.equal(PAGE_SIZE, 18)
})

test('空游标表示加载第一页', () => {
  assert.equal(parseCursor(undefined), null)
})

test('非法游标被拒绝', () => {
  assert.throws(() => parseCursor({ createdAt: '1', id: '' }), /分页参数不正确/)
})

test('合法游标被标准化', () => {
  assert.deepEqual(parseCursor({ createdAt: 123, id: 'photo-1' }), {
    createdAt: 123,
    id: 'photo-1',
  })
})
