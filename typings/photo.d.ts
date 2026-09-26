interface PetPhoto {
  _id: string
  petId: string
  fileID: string
  createdAt: number
}

interface PhotoCursor {
  createdAt: number
  id: string
}

interface PhotoListResult {
  list: PetPhoto[]
  pageSize: number
  hasMore: boolean
  nextCursor: PhotoCursor | null
}
