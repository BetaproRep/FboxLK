export type OrderState = 'wait' | 'canceled' | 'inwork' | 'shipped'
export type OrderOrigin = 'OZON' | 'WB' | 'YANDEX' | 'LAMODA' | string

export interface OrderListItem {
  order_id: string
  created_at: string
  delivery_id: number
  state: OrderState
  origin?: OrderOrigin
}

export interface OrderDetail {
  order_id?: string
  created_at?: string
  indoc_id?: string
  origin?: string
  delivery_id?: number
  delivery_name?: string
  canceled?: boolean
  goods?: Array<{
    good_id: string
    qnt: number
    price?: number
  }>
  outdocs?: Array<{ outdoc_id: number }>
  photos?: Array<{ url: string }>
  events?: Array<{ event_type: string; created_at: string }>
}

export interface OrderListRequest {
  from_date?: string
  to_date?: string
  page_size?: number
  page_token?: string
}

export interface OrderListResponse {
  success: boolean
  items: OrderListItem[]
  page_next_token?: string
}
