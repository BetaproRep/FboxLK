export type OutdocType =
  | 'goods_supply'
  | 'goods_shipment'
  | 'orders_shipment'
  | 'orders_full_return'
  | 'orders_part_return'
  | 'orders_client_return'
  | string

export interface OutdocListItem {
  outdoc_id: number
  outdoc_type: OutdocType
  outdoc_type_descrip: string
  outdoc_date: string
  outdoc_txt?: string
  created_at: string
  locked: boolean
  unlock_request: boolean
  indoc_id?: string
  part_num?: number
  origin?: string
}

export interface OutdocListRequest {
  from_date?: string
  to_date?: string
  outdoc_type?: string
  locked?: boolean
  page_size?: number
  page_token?: string
}

export interface OutdocListResponse {
  success: boolean
  items: OutdocListItem[]
  page_next_token?: string
}

// GET /outdocs/{id}/goods
export interface OutdocGood {
  good_id: string
  good_state: string
  qual_type: string
  qnt: number
}

// GET /outdocs/{id}/good_sn
export interface OutdocSerialNumber {
  good_id: string
  qual_type: string
  good_sn: string
  good_sn0?: string
  inout: 1 | -1
  order_id?: string
}

export interface OutdocFile {
  file_name: string
  copy_qnt: number
  created_at: string
  url: string
}

export interface OutdocPhoto {
  photo_id: number
  url: string
  created_at: string
  descrip?: string
  good_id?: string
  order_id?: string
}
