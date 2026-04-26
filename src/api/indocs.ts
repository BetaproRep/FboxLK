import { apiClient } from './client'
import type {
  WebIndocListRequest,
  WebIndocListResponse,
  IndocListRequest,
  IndocListResponse,
  IndocCreate,
  IndocFile,
  IndocPhoto,
  IndocJson,
  IndocAttribute,
} from '@/types/indoc'

export const indocsApi = {
  webList: async (params: WebIndocListRequest): Promise<WebIndocListResponse> => {
    const { data } = await apiClient.post('/web/indocs/list', params)
    return data
  },

  list: async (params: IndocListRequest): Promise<IndocListResponse> => {
    const { data } = await apiClient.post('/indocs/list', params)
    return data
  },

  // Возвращает { success, indoc: {} } — indoc содержит полный json документа
  getJson: async (indocId: string): Promise<{ success: boolean; indoc: IndocJson }> => {
    const { data } = await apiClient.get(`/indocs/${encodeURIComponent(indocId)}/json`)
    return data
  },

  create: async (body: IndocCreate) => {
    const { data } = await apiClient.post('/indocs', body)
    return data
  },

  delete: async (indocId: string) => {
    const { data } = await apiClient.delete(`/indocs/${encodeURIComponent(indocId)}`)
    return data
  },

  getFiles: async (indocId: string): Promise<{ success: boolean; items: IndocFile[] }> => {
    const { data } = await apiClient.get(`/indocs/${encodeURIComponent(indocId)}/files`)
    return data
  },

  uploadFile: async (indocId: string, file: File) => {
    const file_data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
    const { data } = await apiClient.post(`/indocs/${encodeURIComponent(indocId)}/files`, {
      files: [{ file_name: file.name, file_data }],
    })
    return data
  },

  deleteFile: async (indocId: string, fileNames: string[]) => {
    const { data } = await apiClient.post(`/indocs/${encodeURIComponent(indocId)}/files/delete`, { file_names: fileNames })
    return data
  },

  getPhotos: async (indocId: string): Promise<{ success: boolean; items: IndocPhoto[] }> => {
    const { data } = await apiClient.get(`/indocs/${encodeURIComponent(indocId)}/photos`)
    return data
  },

  getAttributes: async (indocId: string): Promise<{ success: boolean; items: IndocAttribute[] }> => {
    const { data } = await apiClient.get(`/indocs/${encodeURIComponent(indocId)}/attributes`)
    return data
  },

  setAttributes: async (indocId: string, attributes: Record<string, string>) => {
    const { data } = await apiClient.post(`/indocs/${encodeURIComponent(indocId)}/attributes`, { attributes })
    return data
  },
}
