import { apiClient } from './client'
import type { OrderListRequest, OrderListResponse } from '@/types/order'

export const ordersApi = {
  list: async (params: OrderListRequest): Promise<OrderListResponse> => {
    const { data } = await apiClient.post('/orders/list', params)
    return data
  },

  // Возвращает { success, order: OrderDetail }
  get: async (orderId: string): Promise<{ success: boolean; order: unknown }> => {
    const { data } = await apiClient.get(`/orders/${orderId}/info`)
    return data
  },

  create: async (orders: unknown[]) => {
    const { data } = await apiClient.post('/orders', { orders })
    return data
  },

  cancel: async (orderIds: string[], reason?: string) => {
    const { data } = await apiClient.post('/orders/cancel', { order_ids: orderIds, reason })
    return data
  },

  calculateDelivery: async (params: unknown) => {
    const { data } = await apiClient.post('/orders/calculator', params)
    return data
  },
}
