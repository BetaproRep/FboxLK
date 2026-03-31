import { apiClient } from './client'
import type {
  GoodListRequest,
  GoodListResponse,
  GoodStockResponse,
  GoodMovementsRequest,
  GoodMovementsResponse,
} from '@/types/good'

export const goodsApi = {
  list: async (params: GoodListRequest): Promise<GoodListResponse> => {
    const { data } = await apiClient.post('/goods/list', params)
    return data
  },

  // Возвращает { success, good: GoodDetail }
  get: async (goodId: string): Promise<{ success: boolean; good: unknown }> => {
    const { data } = await apiClient.get(`/goods/${goodId}/info`)
    return data
  },

  create: async (goods: unknown[]) => {
    const { data } = await apiClient.post('/goods', { goods })
    return data
  },

  getStock: async (goodIds?: string[]): Promise<GoodStockResponse> => {
    const { data } = await apiClient.post('/goods/stock', goodIds ? { good_ids: goodIds } : {})
    return data
  },

  getStockByDate: async (date: string, goodIds?: string[]) => {
    const { data } = await apiClient.post('/goods/stock/date', {
      date,
      ...(goodIds ? { good_ids: goodIds } : {}),
    })
    return data
  },

  getStockExpiry: async (goodIds?: string[]) => {
    const { data } = await apiClient.post('/goods/stock/expiry', goodIds ? { good_ids: goodIds } : {})
    return data
  },

  // good_id — одна строка (не массив!)
  getMovements: async (params: GoodMovementsRequest): Promise<GoodMovementsResponse> => {
    const { data } = await apiClient.post('/goods/movements', params)
    return data
  },

  getEans: async (goodIds: string[]) => {
    const { data } = await apiClient.post('/goods/eans/list', { good_ids: goodIds })
    return data
  },

  setEans: async (goods: Array<{ good_id: string; eans: string[] }>) => {
    const { data } = await apiClient.post('/goods/eans', { goods })
    return data
  },

  getPhotos: async (goodIds: string[]) => {
    const { data } = await apiClient.post('/goods/photos/list', { good_ids: goodIds })
    return data
  },

  getLongStorage: async () => {
    const { data } = await apiClient.post('/goods/long_storage', {})
    return data
  },

  getRecognition: async () => {
    const { data } = await apiClient.post('/goods/recognition', {})
    return data
  },

  getSerialNumbers: async (goodIds: string[]) => {
    const { data } = await apiClient.post('/goods/serial_numbers/list', { good_ids: goodIds })
    return data
  },
}
