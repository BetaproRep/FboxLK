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

export interface OrderDelivery {
  barcode?: string
  pickpoint_id?: string
  memo?: string
  shipping_price?: {
    price: number
    ret_price: number
    vat?: -1 | 0 | 10 | 20 | 22
    threshold?: Array<{ below: number; price: number }>
  }
  part_deliv?: boolean
  primerka?: boolean
  can_open?: boolean
  no_return?: boolean
  date?: string
  time?: string
  timeend?: string
}

export interface OrderClient {
  name?: string
  phone?: string
  phone2?: string
  email?: string
}

export interface OrderAddress {
  zip?: string
  fias?: string
  region?: string
  area?: string
  city?: string
  street?: string
  house?: string
}

export interface OrderControl {
  ownerdep_id?: number
  to_delivery_date?: string
  is_fake_order?: boolean
  split_pallet?: string
  permitted_packs?: string
  pack_warning?: string
  plt_warning?: string
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
  origin?: OrderOrigin
  declared_value?: number
  cod?: number
  goods?: OrderGoodItem[]
  delivery?: OrderDelivery
  client?: OrderClient
  address?: OrderAddress
  control?: OrderControl
  files?: OrderFile[]
  /** Консолидация отправлений */
  cons?: {
    barcode: string
    weight?: number
    length?: number
    width?: number
    height?: number
    unit_qnt?: number
    goods?: Array<{
      cons_good_id: string
      cons_good_name: string
      qnt: number
      declared_value: number
      cod: number
      unit_num?: number
      vat_rate?: -1 | 0 | 10 | 20 | 22
      vat_amount?: number
      weight?: number
    }>
    units?: Array<{
      unit_num: number
      barcode: string
      weight?: number
      length?: number
      width?: number
      height?: number
    }>
  }
  /** Пересылка отправлений */
  forwarded_parcels?: Array<{
    barcode: string
    weight?: number
    length?: number
    width?: number
    height?: number
  }>
  /** Berlin RusPost */
  dev101?: OrderDev101
}

export interface OrderDev101 {
  /** 1 - мелкий пакет (до 2 кг), 2 - пакет (до 20 кг), 3 - EMS (до 31 кг) */
  mailtype?: 1 | 2 | 3
  products?: Array<{
    product_name: string
    qnt: number
    weight: number
    product_value_euro: number
    hscode: string
    invoice_id?: string
    url?: string
    /** Двухбуквенный код страны ISO 3166-1 Alpha-2 */
    country_of_origin?: string
    /** Земля происхождения (только для Германии) */
    nummer?: string
  }>
  sender_addr?: {
    country?: string
    zip_sender?: string
    region_sender?: string
    district1?: string
    city_sender?: string
    street_sender?: string
    house_sender?: string
    bldg_sender?: string
    apartment_sender?: string
  }
  sender_name?: string
  /** 1 - Свободный груз, 2 - Таможенный груз, 3 - Декларируемый груз */
  type_delivery_code?: 1 | 2 | 3
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
