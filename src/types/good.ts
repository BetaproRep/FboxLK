export interface GoodListItem {
  good_id: string
  good_type: string
  good_name: string
  length?: number
  width?: number
  height?: number
  weight?: number
  gtr_id?: number
  gtr_name?: string
}

export interface GoodDetail {
  good_id: string
  good_type: string
  good_name: string
  length?: number
  width?: number
  height?: number
  weight?: number
  gtr_id?: number
  gtr_name?: string
  attributes?: Array<{
    attribute_id: number
    attribute_type: 'string' | 'boolean' | 'int' | 'float' | 'date' | 'datetime' | 'json'
    attribute_name: string
    value: string | number | boolean | null
  }>
  eans?: string[]
  photos?: Array<{ url: string }>
}

// POST /goods/stock — один элемент в items
export interface GoodStock {
  good_id: string
  qual_type: string
  stock: number
  quarantine: number
  long_storage: number
  orders_inwork: number
  orders_wait: number
  shipment_picking: number
  shipment_ready: number
}

// POST /goods/movements — один элемент в items
export interface GoodMovement {
  indoc_id?: string
  outdoc_id: number
  outdoc_type: string
  outdoc_type_descrip: string
  outdoc_date: string
  outdoc_txt?: string
  created_at: string
  qual_type: string
  qnt: number
}

export interface GoodListRequest {
  good_type?: string
  good_ids?: string[]
  page_size?: number
  page_token?: string
}

export interface GoodListResponse {
  success: boolean
  items: GoodListItem[]
  page_next_token?: string
}

export interface GoodStockResponse {
  success: boolean
  items: GoodStock[]
}

export interface GoodMovementsRequest {
  good_id: string
  good_state?: string
  from_date?: string
  to_date?: string
}

export interface GoodMovementsResponse {
  success: boolean
  items: GoodMovement[]
}
