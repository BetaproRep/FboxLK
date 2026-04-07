import { apiClient } from './client'

export interface FileItem {
  file_name: string
  is_custom: boolean
  url: string
}

export interface FilesResponse {
  success: boolean
  form_name: string
  items: FileItem[]
}

export async function fetchFiles(fileType: number): Promise<FilesResponse> {
  const res = await apiClient.post<FilesResponse>('/web/files', { file_type: fileType })
  return res.data
}
