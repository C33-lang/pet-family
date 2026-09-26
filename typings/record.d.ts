type RecordType =
  | 'feed'
  | 'deworm'
  | 'vaccine'
  | 'bath'
  | 'medical'
  | 'weight'
  | 'sterilize'
  | 'other'

interface RecordWeightData {
  value: number
  unit: 'kg' | 'g'
}

interface HealthRecord {
  _id: string
  petId: string
  type: RecordType
  content: string
  images: string[]
  tags: string[]
  weightData?: RecordWeightData
  recordTime: number
  createdAt: number
}

interface RecordCreateData {
  petId: string
  type: Exclude<RecordType, 'sterilize'>
  content: string
  recordTime: number
  weightData?: {
    value: number
    unit: 'kg'
  }
}

interface RecordListResult {
  list: HealthRecord[]
  page: number
  pageSize: number
  hasMore: boolean
}
