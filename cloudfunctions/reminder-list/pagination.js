const PAGE_SIZE = 15

function parseCursor(cursor) {
  if (cursor === undefined || cursor === null) return null
  if (
    typeof cursor !== 'object' ||
    !Number.isFinite(cursor.nextDate) ||
    !cursor.id ||
    typeof cursor.id !== 'string'
  ) {
    throw new Error('分页参数不正确')
  }
  return { nextDate: cursor.nextDate, id: cursor.id }
}

module.exports = { PAGE_SIZE, parseCursor }
