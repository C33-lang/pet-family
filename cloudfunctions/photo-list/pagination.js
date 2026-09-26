const PAGE_SIZE = 18

function parseCursor(cursor) {
  if (cursor === undefined || cursor === null) return null
  if (
    typeof cursor !== 'object' ||
    !Number.isFinite(cursor.createdAt) ||
    !cursor.id ||
    typeof cursor.id !== 'string'
  ) {
    throw new Error('分页参数不正确')
  }
  return { createdAt: cursor.createdAt, id: cursor.id }
}

module.exports = { PAGE_SIZE, parseCursor }
