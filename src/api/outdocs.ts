import { apiClient } from './client'
import type {
  OutdocListRequest,
  OutdocListResponse,
  OutdocFile,
  OutdocPhoto,
  OutdocGood,
  OutdocSerialNumber,
} from '@/types/outdoc'

export const outdocsApi = {
  list: async (params: OutdocListRequest): Promise<OutdocListResponse> => {
    const { data } = await apiClient.post('/outdocs/list', params)
    return data
  },

  // Возвращает один из многих типов документов (anyOf) — используем unknown
  get: async (outdocId: number): Promise<unknown> => {
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
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(`/outdocs/${outdocId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
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

  lock: async (outdocIds: number[]) => {
    const { data } = await apiClient.post('/outdocs/lock', { outdoc_ids: outdocIds })
    return data
  },

  check: async (params: OutdocListRequest) => {
    const { data } = await apiClient.post('/outdocs/check', params)
    return data
  },
}
