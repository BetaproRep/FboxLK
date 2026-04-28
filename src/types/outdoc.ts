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
  indoc?: {
    indoc_id: string
    created_at: string
    indoc_type: string
    indoc_type_descrip: string
    indoc_txt?: string
  }
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

// GET /outdocs/{id}
export interface OutdocCommon {
  outdoc_id: number
  outdoc_type: OutdocType
  outdoc_type_descrip: string
  outdoc_date: string
  outdoc_txt?: string
  created_at: string
  locked: boolean
  indoc_id?: string
  indoc_type?: string
  indoc_txt?: string
  indoc_created_at?: string
}

export interface GoodsSupplyGoodItem {
  good_id: string
  plan_qnt: number
  useful_qnt: number
  defective_qnt: number
}

export interface OutdocDetailBase {
  success: boolean
  outdoc_type: OutdocType
  common: OutdocCommon
}

export interface GoodsExpiryItem {
  good_id: string
  qual_type: string
  expiry_date: string
  qnt: number
}

export interface GoodsSupplyOutdoc extends OutdocDetailBase {
  outdoc_type: 'goods_supply'
  part_num?: number
  goods?: GoodsSupplyGoodItem[]
  goods_expiry?: GoodsExpiryItem[]
}

export interface GpltBoxGood {
  good_id: string
  expiry_date?: string
  good_sn?: string
  good_sn0?: string
  good_fbo_bar?: string
  qnt: number
}

export interface GpltBox {
  box_id: number
  box_fbo_bar?: string
  box_upper_bar?: string
  box_lower_bar?: string
  pack_id?: string
  pack_name?: string
  pack_fake?: boolean
  pack_weight?: number
  weight?: number
  length?: number
  width?: number
  height?: number
  goods: GpltBoxGood[]
}

export interface GpltOut {
  plt_id?: number
  plt_fbo_bar?: string
  plt_upper_bar?: string
  plt_lower_bar?: string
  boxes: GpltBox[]
}

export interface GoodsShipmentOutdoc extends OutdocDetailBase {
  outdoc_type: 'goods_shipment' | 'goods_shipment_ready'
  pallets?: GpltOut[]
}

export interface CorrectionGoodItem {
  good_id: string
  qual_type: string
  stock_qnt: number
  quarantine_qnt: number
}

export interface GoodsCorrectionOutdoc extends OutdocDetailBase {
  outdoc_type: 'goods_correction'
  correction_type: string
  correction_type_descrip: string
  goods: CorrectionGoodItem[]
}

export interface OutdocOrderItem {
  order_id: string
  delivery_id?: number
  delivery_name?: string
  error_code?: number
  error_descrip?: string
  cancel_reason?: number
  cancel_reason_descrip?: string
  ret_reason?: number
  ret_reason_descrip?: string
  payment?: number
  clnt_date?: string
  file_date?: string
}

export interface OrdersPaymentOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_payment'
  pay_num?: string
  pay_date?: string
  orders?: OutdocOrderItem[]
}

export interface OrdersPaymentTransferOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_payment_transfer'
  pay_num?: string
  pay_date?: string
  orders?: OutdocOrderItem[]
}

export interface OrdersFullReturnOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_full_return'
  orders?: OutdocOrderItem[]
}

export interface OrdersReceivingOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_receiving'
  orders?: OutdocOrderItem[]
}

export interface OrdersDeficitOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_deficit'
  orders?: OutdocOrderItem[]
}

export interface OrdersCancelOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_cancel'
  orders?: OutdocOrderItem[]
}

export interface OrdersProductionStartOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_production_start'
  order_ids?: string[]
}

export interface OrderOutItem {
  order_id: string
  barcode?: string
  dispatch_number?: string
  declared_value?: number
  cod?: number
  plt_id?: number
  weight?: number
  unit_qnt?: number
}

export interface OrdersPalletOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_pallet'
  delivery_id?: number
  delivery_name?: string
  plt_id?: number
  orders?: OrderOutItem[]
}

export interface OrdersShipmentOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_shipment'
  delivery_id?: number
  delivery_name?: string
  orders?: OrderOutItem[]
}

export interface ReturnGoodItem {
  good_id: string
  qual_type: string
  expiry_date?: string
  good_sn?: string
  good_sn0?: string
  stock_qnt: number
}

export interface ReturnOrderEntry {
  order_id?: string
  return_barcode?: string
  parcel_barcode?: string
  goods: ReturnGoodItem[]
}

export interface OrdersPartReturnOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_part_return'
  orders?: ReturnOrderEntry[]
}

export interface OrdersClientReturnOutdoc extends OutdocDetailBase {
  outdoc_type: 'orders_client_return'
  orders?: ReturnOrderEntry[]
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
