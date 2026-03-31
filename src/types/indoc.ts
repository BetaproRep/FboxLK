export interface IndocListItem {
  indoc_id: string
  indoc_type: 'goods_supply_task' | 'goods_shipment_task' | 'orders_shipment_task' | 'goods_from_long_storage_task'
  indoc_type_descrip: string
  indoc_txt?: string
  created_at: string
}

export interface IndocListRequest {
  from_date?: string
  to_date?: string
  indoc_type?: string
  page_size?: number
  page_token?: string
}

export interface IndocListResponse {
  success: boolean
  items: IndocListItem[]
  page_next_token?: string
}

export interface IndocFile {
  file_name: string
  copy_qnt: number
  created_at: string
  url: string
}

export interface IndocPhoto {
  photo_id: number
  url: string
  created_at: string
  descrip?: string
  good_id?: string
}

// POST /indocs — создание поставки (наиболее частый тип)
export interface IndocCreateGoodsSupply {
  indoc_type: 'goods_supply_task'
  indoc_id: string
  indoc_txt?: string
  items: Array<{
    good_id: string
    qnt: number
  }>
}
