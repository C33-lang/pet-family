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
  /** 由 pet-list 云函数附带返回的最紧急提醒，用于列表角标 */
  reminderBrief?: PetReminderBrief | null
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
