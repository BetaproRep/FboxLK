import { apiClient } from './client'
import type {
  OutdocListRequest,
  OutdocListResponse,
  OutdocFile,
  OutdocPhoto,
  OutdocGood,
  OutdocSerialNumber,
  OutdocDetailBase,
  GoodsSupplyOutdoc,
} from '@/types/outdoc'

export const outdocsApi = {
  list: async (params: OutdocListRequest): Promise<OutdocListResponse> => {
    const { data } = await apiClient.post('/web/outdocs/list', params)
    return data
  },

  get: async (outdocId: number): Promise<OutdocDetailBase> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}`)
    return data
  },

  getGoodsSupply: async (outdocId: number): Promise<GoodsSupplyOutdoc> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}`)
    return data
  },

  getGoods: async (outdocId: number): Promise<{ goods: OutdocGood[] }> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}/goods`)
    return data
  },

  getSerialNumbers: async (outdocId: number): Promise<{ good_sn: OutdocSerialNumber[] }> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}/good_sn`)
    return data
  },

  getAttributes: async (outdocId: number) => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}/attributes`)
    return data
  },

  setAttributes: async (outdocId: number, attributes: Record<string, string>) => {
    const { data } = await apiClient.post(`/outdocs/${outdocId}/attributes`, { attributes })
    return data
  },

  getFiles: async (outdocId: number): Promise<{ items: OutdocFile[] }> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}/files`)
    return data
  },

  uploadFile: async (outdocId: number, file: File) => {
    const file_data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { data } = await apiClient.post(`/outdocs/${outdocId}/files`, {
      files: [{ file_name: file.name, file_data }],
    })
    return data
  },

  deleteFile: async (outdocId: number, fileNames: string[]) => {
    const { data } = await apiClient.post(`/outdocs/${outdocId}/files/delete`, { file_names: fileNames })
    return data
  },

  getPhotos: async (outdocId: number): Promise<{ items: OutdocPhoto[] }> => {
    const { data } = await apiClient.get(`/outdocs/${outdocId}/photos`)
    return data
  },

  lock: async (params: { outdocs: { outdoc_id: number; lock?: boolean }[] }) => {
    const { data } = await apiClient.post('/outdocs/lock', params)
    return data
  },

  check: async (params: OutdocListRequest) => {
    const { data } = await apiClient.post('/outdocs/check', params)
    return data
  },
}
