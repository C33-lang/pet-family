type PetListData = {
  list?: Pet[]
  pet?: Pet
}

async function callPetFunction<T>(
  name: string,
  data: Record<string, unknown> = {}
): Promise<T> {
  const response = await wx.cloud.callFunction({ name, data })
  const result = response.result as CloudResult<T>

  if (!result || typeof result.code !== 'number') {
    throw new Error('服务返回异常')
  }

  if (result.code !== 0) {
    const error = new Error(result.message || '操作失败') as Error & {
      code?: number
    }
    error.code = result.code
    throw error
  }

  return result.data
}

export async function getPetList(): Promise<Pet[]> {
  const data = await callPetFunction<PetListData>('pet-list')
  return data.list || []
}

export async function getPetDetail(id: string): Promise<Pet> {
  const data = await callPetFunction<PetListData>('pet-list', { id })
  if (!data.pet) {
    throw new Error('宠物不存在或已被删除')
  }
  return data.pet
}

export function createPet(data: PetFormData): Promise<{ id: string }> {
  return callPetFunction('pet-create', data as unknown as Record<string, unknown>)
}

export function updatePet(
  id: string,
  data: PetFormData
): Promise<{ id: string }> {
  return callPetFunction('pet-update', {
    id,
    ...data,
  })
}

export function deletePet(id: string): Promise<{ id: string }> {
  return callPetFunction('pet-delete', { id })
}
