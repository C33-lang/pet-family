const test = require('node:test')
const assert = require('node:assert/strict')
const { validatePhotoAdd } = require('./validation')

test('缺少 petId 时拒绝新增照片', () => {
  assert.equal(validatePhotoAdd({ fileID: 'cloud://photo.jpg' }), '缺少宠物ID')
})

test('缺少合法 fileID 时拒绝新增照片', () => {
  assert.equal(validatePhotoAdd({ petId: 'pet-1', fileID: '' }), '缺少照片文件')
})

test('petId 和 fileID 合法时通过校验', () => {
  assert.equal(
    validatePhotoAdd({ petId: 'pet-1', fileID: 'cloud://env/photos/a.jpg' }),
    ''
  )
})
