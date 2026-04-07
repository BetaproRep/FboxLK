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

// --- POST /orders request body ---

export interface OrderGoodItem {
  good_id: string
  declared_value: number
  cod: number
  vat_rate?: -1 | 0 | 10 | 20 | 22
  vat_amount?: number
  perso?: unknown
  opis_price?: number
  ebirka_price?: number
}

export interface OrderFile {
  file_name: string
  file_data: string
  barcode?: string
  print_group?: string
  copy_qnt?: number
}

export interface OrderCreateItem {
  order_id: string
  delivery_id: number
  goods?: OrderGoodItem[]
  files?: OrderFile[]
  [key: string]: unknown   // любые доп. поля без ошибок
}


export interface OrderCreateRequest {
  orders: OrderCreateItem[]
}

export interface OrderCreateResponse {
  success: boolean
}

// --- end POST /orders ---

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
