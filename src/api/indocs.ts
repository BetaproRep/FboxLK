import { apiClient } from './client'
import type {
  IndocListRequest,
  IndocListResponse,
  IndocCreateGoodsSupply,
  IndocFile,
  IndocPhoto,
  IndocJson,
} from '@/types/indoc'

export const indocsApi = {
  list: async (params: IndocListRequest): Promise<IndocListResponse> => {
    const { data } = await apiClient.post('/indocs/list', params)
    return data
  },

  // Возвращает { success, indoc: {} } — indoc содержит полный json документа
  getJson: async (indocId: string): Promise<{ success: boolean; indoc: IndocJson }> => {
    const { data } = await apiClient.get(`/indocs/${indocId}/json`)
    return data
  },

  create: async (body: IndocCreateGoodsSupply) => {
    const { data } = await apiClient.post('/indocs', body)
    return data
  },

  delete: async (indocId: string) => {
    const { data } = await apiClient.delete(`/indocs/${indocId}`)
    return data
  },

  getFiles: async (indocId: string): Promise<{ success: boolean; items: IndocFile[] }> => {
    const { data } = await apiClient.get(`/indocs/${indocId}/files`)
    return data
  },

  uploadFile: async (indocId: string, file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const { data } = await apiClient.post(`/indocs/${indocId}/files`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return data
  },

  deleteFile: async (indocId: string, fileNames: string[]) => {
    const { data } = await apiClient.post(`/indocs/${indocId}/files/delete`, { file_names: fileNames })
    return data
  },

  getPhotos: async (indocId: string): Promise<{ success: boolean; items: IndocPhoto[] }> => {
    const { data } = await apiClient.get(`/indocs/${indocId}/photos`)
    return data
  },

  getAttributes: async (indocId: string) => {
    const { data } = await apiClient.get(`/indocs/${indocId}/attributes`)
    return data
  },

  setAttributes: async (indocId: string, attributes: Record<string, string>) => {
    const { data } = await apiClient.post(`/indocs/${indocId}/attributes`, { attributes })
    return data
  },
}
