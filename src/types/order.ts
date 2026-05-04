export type OrderState = 'wait' | 'canceled' | 'inwork' | 'shipped'
export type OrderOrigin = 'OZON' | 'WB' | 'YANDEX' | 'LAMODA' | string

export interface OrderOutdocItem {
  outdoc_id: number
  outdoc_type: string
  outdoc_type_descrip: string
  created_at: string
}

export interface OrderListItem {
  order_id: string
  created_at: string
  indoc_id?: string
  wait_reason?: string
  delivery_id: number
  delivery_name?: string
  clnt_name?: string
  state: OrderState
  origin?: OrderOrigin
  outdocs?: OrderOutdocItem[]
}

export interface OrderDetailGood {
  good_id: string
  good_type: string
  good_name: string
  qnt: number
  declared_value: number
  cod: number
}

export interface OrderDetailPltUnit {
  unit_num: number
  barcode: string
  pack_name?: string
  pack_weight?: number
  weight?: number
  length?: number
  width?: number
  height?: number
}

export interface OrderDetailPltGood {
  unit_num: number
  good_id: string
  good_type: string
  good_name: string
  good_sn?: string
  expiry_date?: string
  declared_value: number
  cod: number
}

export interface OrderDetailPltInfo {
  barcode: string
  dispatch_number?: string
  declared_value: number
  cod: number
  plt_id: number
  plt_bar: string
  weight: number
  unit_qnt: number
  units?: OrderDetailPltUnit[]
  goods?: OrderDetailPltGood[]
}

export interface OrderDetail {
  order_id?: string
  created_at?: string
  indoc_id?: string
  indoc_txt?: string
  wait_reason?: string
  origin?: string
  delivery_id?: number
  delivery_name?: string
  canceled?: boolean
  state?: OrderState
  clnt_name?: string
  clnt_addr?: string
  goods?: OrderDetailGood[]
  plt_info?: OrderDetailPltInfo
  outdocs?: Array<{ outdoc_id: number; outdoc_type: string; outdoc_type_descrip: string; outdoc_date: string; created_at: string; locked: boolean }>
  photos?: Array<{ photo_id: number; url: string; created_at: string; descrip?: string }>
  events?: Array<{ event_id: number; event_date: string; event_type: number; descrip: string }>
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
  not_completed_only?: boolean
  order_ids?: string[]
  good_id?: string
  page_size?: number
  page_token?: string
}

export interface OrderListResponse {
  success: boolean
  items: OrderListItem[]
  page_next_token?: string
}
