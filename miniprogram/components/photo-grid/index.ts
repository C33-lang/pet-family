import { addPhoto, deletePhoto, getPhotoList } from '../../services/photo'
import { prepareImage } from '../../utils/upload'

type FailedUpload = {
  localId: string
  tempFilePath: string
  fileID: string
}

function createCloudPath(petId: string, filePath: string): string {
  const extensionMatch = filePath.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)
  const extension = extensionMatch ? extensionMatch[1] : 'jpg'
  return `pets/photos/${petId}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}.${extension}`
}

Component({
  properties: {
    petId: {
      type: String,
      value: '',
      observer(petId: string) {
        if (petId) {
          this.reload()
        }
      },
    },
  },

  data: {
    status: 'loading' as 'loading' | 'empty' | 'ready' | 'error',
    photos: [] as PetPhoto[],
    cursor: null as PhotoCursor | null,
    hasMore: true,
    loadingMore: false,
    loadMoreError: false,
    errorMessage: '',
    uploading: false,
    uploadCurrent: 0,
    uploadTotal: 0,
    failedUploads: [] as FailedUpload[],
    deletingId: '',
  },

  lifetimes: {
    attached() {
      ;(this as any)._destroyed = false
    },
    detached() {
      ;(this as any)._destroyed = true
    },
  },

  methods: {
    isDestroyed(): boolean {
      return Boolean((this as any)._destroyed)
    },

    async reload() {
      if (!this.data.petId) return
      this.setData({
        status: 'loading',
        photos: [],
        cursor: null,
        hasMore: true,
        loadingMore: false,
        loadMoreError: false,
        errorMessage: '',
      })
      await this.loadPage(null, true)
    },

    async loadPage(cursor: PhotoCursor | null, reset = false) {
      if (!this.data.petId || this.data.loadingMore) return
      if (!reset && !this.data.hasMore) return

      this.setData({ loadingMore: true, loadMoreError: false })
      try {
        const result = await getPhotoList(this.data.petId, cursor)
        if (this.isDestroyed()) return
        const photos = reset
          ? result.list
          : this.data.photos.concat(result.list)
        this.setData({
          photos,
          cursor: result.nextCursor,
          hasMore: result.hasMore,
          loadingMore: false,
          status: photos.length ? 'ready' : 'empty',
        })
      } catch (error) {
        if (this.isDestroyed()) return
        if (reset) {
          this.setData({
            status: 'error',
            loadingMore: false,
            errorMessage: (error as Error).message || '加载失败，请重试',
          })
          return
        }
        this.setData({ loadingMore: false, loadMoreError: true })
      }
    },

    handleLoadMore() {
      if (
        this.data.status !== 'ready' ||
        this.data.loadingMore ||
        !this.data.hasMore
      ) return
      this.loadPage(this.data.cursor)
    },

    handleRetryMore() {
      this.loadPage(this.data.cursor)
    },

    async handleAdd() {
      if (this.data.uploading) return

      let result: WechatMiniprogram.ChooseMediaSuccessCallbackResult
      try {
        result = await wx.chooseMedia({
          count: 9,
          mediaType: ['image'],
          sourceType: ['album', 'camera'],
        })
      } catch (error) {
        return
      }
      await this.uploadFiles(result.tempFiles.map((item) => item.tempFilePath))
    },

    async uploadFiles(paths: string[]) {
      if (!paths.length || this.data.uploading) return
      this.setData({ uploading: true, uploadCurrent: 0, uploadTotal: paths.length })

      for (let index = 0; index < paths.length; index += 1) {
        const item: FailedUpload = {
          localId: `${Date.now()}-${index}`,
          tempFilePath: paths[index],
          fileID: '',
        }
        await this.uploadOne(item)
        if (!this.isDestroyed()) this.setData({ uploadCurrent: index + 1 })
      }

      if (!this.isDestroyed()) this.setData({ uploading: false })
    },

    async uploadOne(item: FailedUpload) {
      try {
        let fileID = item.fileID
        if (!fileID) {
          const uploadPath = await prepareImage(item.tempFilePath)
          const uploadResult = await wx.cloud.uploadFile({
            cloudPath: createCloudPath(this.data.petId, uploadPath),
            filePath: uploadPath,
          })
          fileID = uploadResult.fileID
          item.fileID = fileID
        }

        const photo = await addPhoto(this.data.petId, fileID)
        if (this.isDestroyed()) return
        this.setData({
          photos: [photo].concat(this.data.photos),
          failedUploads: this.data.failedUploads.filter(
            (failed) => failed.localId !== item.localId
          ),
          status: 'ready',
        })
      } catch (error) {
        if (this.isDestroyed()) return
        const failedUploads = this.data.failedUploads.filter(
          (failed) => failed.localId !== item.localId
        )
        failedUploads.push(item)
        this.setData({ failedUploads, status: 'ready' })
      }
    },

    async handleRetryUpload(event: WechatMiniprogram.BaseEvent) {
      if (this.data.uploading) return
      const localId = event.currentTarget.dataset.id as string
      const item = this.data.failedUploads.find(
        (failed) => failed.localId === localId
      )
      if (!item) return

      this.setData({ uploading: true, uploadCurrent: 0, uploadTotal: 1 })
      await this.uploadOne(item)
      if (!this.isDestroyed()) {
        this.setData({ uploading: false, uploadCurrent: 1 })
      }
    },

    handlePreview(event: WechatMiniprogram.BaseEvent) {
      const fileID = event.currentTarget.dataset.fileId as string
      if (!fileID) return
      wx.previewImage({
        current: fileID,
        urls: this.data.photos.map((photo) => photo.fileID),
      })
    },

    async handleDelete(event: WechatMiniprogram.BaseEvent) {
      const id = event.currentTarget.dataset.id as string
      if (!id || this.data.deletingId) return

      const modal = await wx.showModal({
        title: '删除照片',
        content: '确定删除这张照片吗？删除后无法恢复。',
        confirmText: '删除',
        confirmColor: '#E64340',
      })
      if (!modal.confirm) return

      this.setData({ deletingId: id })
      wx.showLoading({ title: '删除中', mask: true })
      try {
        await deletePhoto(id)
        const photos = this.data.photos.filter((photo) => photo._id !== id)
        this.setData({
          photos,
          deletingId: '',
          status:
            photos.length || this.data.failedUploads.length ? 'ready' : 'empty',
        })
        wx.hideLoading()
        wx.showToast({ title: '已删除', icon: 'success' })
      } catch (error) {
        wx.hideLoading()
        this.setData({ deletingId: '' })
        wx.showToast({
          title: (error as Error).message || '删除失败，请重试',
          icon: 'none',
        })
      }
    },
  },
})
