import { createPet, getPetDetail, updatePet } from '../../../services/pet'
import { formatDate, isFutureDate } from '../../../utils/date'
import { uploadPetAvatar } from '../../../utils/upload'

const EMPTY_FORM: PetFormData = {
  name: '',
  avatar: '',
  breed: '',
  birthday: '',
  adoptDate: '',
  gender: 'unknown',
  sterilized: false,
}

Page({
  data: {
    id: '',
    isEdit: false,
    status: 'ready' as 'loading' | 'ready' | 'error',
    form: { ...EMPTY_FORM } as PetFormData,
    avatarPreview: '',
    avatarChanged: false,
    canSubmit: false,
    submitting: false,
    maxDate: formatDate(new Date()),
    errorMessage: '',
  },

  onLoad(options: Record<string, string>) {
    const id = options.id || ''
    const isEdit = Boolean(id)
    this.setData({ id, isEdit })
    wx.setNavigationBarTitle({ title: isEdit ? '编辑宠物' : '添加宠物' })

    if (isEdit) {
      this.loadPet()
    }
  },

  async loadPet() {
    this.setData({ status: 'loading', errorMessage: '' })
    try {
      const pet = await getPetDetail(this.data.id)
      const form: PetFormData = {
        name: pet.name,
        avatar: pet.avatar || '',
        breed: pet.breed || '',
        birthday: pet.birthday || '',
        adoptDate: pet.adoptDate || '',
        gender: pet.gender || 'unknown',
        sterilized: Boolean(pet.sterilized),
      }
      this.setData({
        status: 'ready',
        form,
        avatarPreview: form.avatar,
        avatarChanged: false,
        canSubmit: Boolean(form.name.trim()),
      })
    } catch (error) {
      this.setData({
        status: 'error',
        errorMessage: (error as Error).message || '加载失败，请重试',
      })
    }
  },

  async handleChooseAvatar() {
    try {
      const result = await wx.chooseMedia({
        count: 1,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
      })
      const firstFile = result.tempFiles && result.tempFiles[0]
      const filePath = firstFile ? firstFile.tempFilePath : ''
      if (!filePath) {
        return
      }
      this.setData({
        avatarPreview: filePath,
        avatarChanged: true,
      })
    } catch (error) {
      // 用户主动取消选择时不提示错误。
    }
  },

  handleNameInput(event: WechatMiniprogram.Input) {
    const name = event.detail.value
    this.setData({
      'form.name': name,
      canSubmit: Boolean(name.trim()),
    })
  },

  handleBreedInput(event: WechatMiniprogram.Input) {
    this.setData({ 'form.breed': event.detail.value })
  },

  handleGenderChange(event: WechatMiniprogram.RadioGroupChange) {
    this.setData({ 'form.gender': event.detail.value })
  },

  handleBirthdayChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ 'form.birthday': event.detail.value })
  },

  handleAdoptDateChange(event: WechatMiniprogram.PickerChange) {
    this.setData({ 'form.adoptDate': event.detail.value })
  },

  handleSterilizedChange(event: WechatMiniprogram.SwitchChange) {
    this.setData({ 'form.sterilized': event.detail.value })
  },

  async handleSubmit() {
    if (!this.data.canSubmit || this.data.submitting) {
      return
    }

    const form = { ...this.data.form, name: this.data.form.name.trim() }
    if (form.birthday && isFutureDate(form.birthday)) {
      wx.showToast({ title: '生日不能晚于今天', icon: 'none' })
      return
    }

    this.setData({ submitting: true })
    wx.showLoading({ title: '保存中', mask: true })

    if (this.data.avatarChanged && this.data.avatarPreview) {
      try {
        form.avatar = await uploadPetAvatar(this.data.avatarPreview)
        // 上传成功后保留 fileID，后续保存失败时可直接重试。
        this.setData({
          'form.avatar': form.avatar,
          avatarPreview: form.avatar,
          avatarChanged: false,
        })
      } catch (error) {
        wx.hideLoading()
        this.setData({ submitting: false })
        wx.showToast({ title: '图片上传失败，请重试', icon: 'none' })
        return
      }
    }

    try {
      if (this.data.isEdit) {
        await updatePet(this.data.id, form)
      } else {
        await createPet(form)
      }
      wx.hideLoading()
      wx.showToast({
        title: this.data.isEdit ? '保存成功' : '添加成功',
        icon: 'success',
      })
      setTimeout(() => wx.navigateBack(), 500)
    } catch (error) {
      wx.hideLoading()
      this.setData({ submitting: false, form })
      wx.showToast({
        title: (error as Error).message || '保存失败，请重试',
        icon: 'none',
      })
    }
  },
})
