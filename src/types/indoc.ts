import type { OrderCreateItem } from './order'

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

// GET /indocs/{id}/json — type-specific response shapes

export interface IndocJsonGoodsSupply {
  indoc_type: 'goods_supply_task'
  indoc_id: string
  indoc_txt?: string
  items: Array<{
    good_id: string
    plan_qnt: number
    sn_mandant?: boolean
    local_barcodes?: string[]
    label_json?: unknown
  }>
  goods?: Array<{
    good_id: string
    good_name: string
    good_type?: string
    weight?: number
    length?: number
    width?: number
    height?: number
  }>
}

export interface IndocJsonGoodsShipment {
  indoc_type: 'goods_shipment_task'
  indoc_id: string
  indoc_txt?: string
  qual_type?: 'useful' | 'defective'
  picking_only?: boolean
  items: Array<{
    good_id: string
    plan_qnt: number
    sn_mandant?: boolean
    price?: number
  }>
}

export interface IndocJsonOrdersShipment {
  indoc_type: 'orders_shipment_task'
  indoc_id: string
  indoc_txt?: string
  orders: Array<{
    order_id: string
    origin?: string
    delivery_id: number
    declared_value?: number
    goods?: Array<{ good_id: string; declared_value: number; cod: number }>
    client?: { name?: string; phone?: string; email?: string }
    address?: { city?: string; street?: string; house?: string; region?: string; zip?: string }
    delivery?: { barcode?: string; date?: string; time?: string }
  }>
}

export interface IndocJsonLongStorage {
  indoc_type: 'goods_from_long_storage_task'
  indoc_id: string
  indoc_txt?: string
  box_ids: number[]
}

export type IndocJson =
  | IndocJsonGoodsSupply
  | IndocJsonGoodsShipment
  | IndocJsonOrdersShipment
  | IndocJsonLongStorage

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

// POST /indocs — создание задания на отгрузку заказов
export interface IndocCreateOrdersShipment {
  indoc_type: 'orders_shipment_task'
  indoc_id: string
  indoc_txt?: string
  orders: OrderCreateItem[]
}

export type IndocCreate = IndocCreateGoodsSupply | IndocCreateOrdersShipment
