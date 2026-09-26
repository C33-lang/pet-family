interface Pet {
  _id: string
  name: string
  avatar: string
  breed: string
  birthday: string
  adoptDate: string
  gender: 'male' | 'female' | 'unknown'
  sterilized: boolean
  createdAt: number
  updatedAt?: number
}

interface PetFormData {
  name: string
  avatar: string
  breed: string
  birthday: string
  adoptDate: string
  gender: 'male' | 'female' | 'unknown'
  sterilized: boolean
}

interface CloudResult<T> {
  code: number
  message: string
  data: T
}
