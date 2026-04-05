import type { OrderCreateItem } from '../types/order'

// ── Bool parsing constants (можно дополнить) ─────────────────────────────────
export const BOOL_TRUE_VALUES  = ['1', 'true', 'yes', 'да']
export const BOOL_FALSE_VALUES = ['0', 'false', 'no', 'нет']

// ── DSL-схема одной колонки ───────────────────────────────────────────────────

export interface ColumnSchema {
  /** Исходная строка DSL, например "goods[].good_id:str*" */
  dsl: string
  /** Полный путь, например "goods[].good_id" или "client.name" */
  path: string
  /** true если путь содержит [] */
  isArray: boolean
  /**
   * Только для массивов.
   * "goods[].good_id"              → arrayParentParts=[], arrayName="goods"
   * "dev101.products[].product_name" → arrayParentParts=["dev101"], arrayName="products"
   */
  arrayParentParts: string[]
  arrayName: string
  /** Ключ внутри элемента массива или вложенного объекта */
  localKey: string
  /** Части пути для скалярных полей, например ["client","name"] */
  pathParts: string[]
  required: boolean
  type: 'str' | 'int' | 'num' | 'bool'
  default?: unknown
}

// ── Результат парсинга ────────────────────────────────────────────────────────

export interface ParseError {
  /** Индекс заказа в результирующем массиве orders */
  orderIdx: number
  /** Номер строки в файле (0-based) */
  row: number
  /** DSL-имя поля */
  field: string
  /** Название колонки из строки 0 шаблона (для показа пользователю) */
  label: string
  message: string
}

export interface ParseResult {
  orders: OrderCreateItem[]
  errors: ParseError[]
}

// ── Парсинг DSL-строки ────────────────────────────────────────────────────────

export function parseColumnSchema(dsl: string): ColumnSchema | null {
  const s = dsl.trim()
  if (!s) return null

  // Разделяем путь и спецификатор типа: "goods[].good_id:str*"
  const colonIdx = s.indexOf(':')
  if (colonIdx === -1) return null

  const path = s.slice(0, colonIdx)
  let typeSpec = s.slice(colonIdx + 1)

  // default value (извлекаем первым, чтобы * мог стоять до или после =)
  let defaultValue: unknown
  const eqIdx = typeSpec.indexOf('=')
  if (eqIdx !== -1) {
    const rawDefault = typeSpec.slice(eqIdx + 1)
    typeSpec = typeSpec.slice(0, eqIdx)
    defaultValue = rawDefault
  }

  // required (* может стоять в любом месте typeSpec, например "num*")
  const required = typeSpec.includes('*')
  typeSpec = typeSpec.replace('*', '')

  const type = typeSpec as ColumnSchema['type']

  // Приводим default к нужному типу
  if (defaultValue !== undefined) {
    defaultValue = coerce(String(defaultValue), type, [])?.value
  }

  // Определяем: массив или скаляр
  const bracketIdx = path.indexOf('[]')
  const isArray = bracketIdx !== -1

  let arrayParentParts: string[] = []
  let arrayName = ''
  let localKey = ''
  let pathParts: string[] = []

  if (isArray) {
    const beforeBracket = path.slice(0, bracketIdx)   // "goods" | "dev101.products"
    const afterBracket  = path.slice(bracketIdx + 3)  // "good_id" | "product_name"
    const parentParts   = beforeBracket.split('.')
    arrayName           = parentParts[parentParts.length - 1]
    arrayParentParts    = parentParts.slice(0, -1)
    localKey            = afterBracket
  } else {
    pathParts = path.split('.')
    localKey  = pathParts[pathParts.length - 1]
  }

  return { dsl: s, path, isArray, arrayParentParts, arrayName, localKey, pathParts, required, type, default: defaultValue }
}

// ── Вспомогательные функции ───────────────────────────────────────────────────

/** Установить значение по pathParts в вложенном объекте */
function setDeep(obj: Record<string, unknown>, parts: string[], value: unknown): void {
  let cur = obj
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined || cur[parts[i]] === null) cur[parts[i]] = {}
    cur = cur[parts[i]] as Record<string, unknown>
  }
  cur[parts[parts.length - 1]] = value
}

/** Получить вложенный объект по pathParts (создаёт если нет) */
function getOrCreateDeep(obj: Record<string, unknown>, parts: string[]): Record<string, unknown> {
  let cur = obj
  for (const part of parts) {
    if (cur[part] === undefined || cur[part] === null) cur[part] = {}
    cur = cur[part] as Record<string, unknown>
  }
  return cur
}

/** Привести значение ячейки к нужному типу */
function coerce(
  raw: unknown,
  type: ColumnSchema['type'],
  errors: Array<{ message: string }>
): { value: unknown } | null {
  if (raw === undefined || raw === null || raw === '') return null

  const str = String(raw).trim()

  switch (type) {
    case 'str':
      return { value: str }

    case 'int': {
      const n = parseInt(str, 10)
      if (isNaN(n)) { errors.push({ message: `ожидается целое число, получено "${str}"` }); return null }
      return { value: n }
    }

    case 'num': {
      const n = parseFloat(str)
      if (isNaN(n)) { errors.push({ message: `ожидается число, получено "${str}"` }); return null }
      return { value: n }
    }

    case 'bool': {
      const lo = str.toLowerCase()
      if (BOOL_TRUE_VALUES.includes(lo))  return { value: true }
      if (BOOL_FALSE_VALUES.includes(lo)) return { value: false }
      errors.push({ message: `ожидается булево значение, получено "${str}"` })
      return null
    }

    default:
      return null
  }
}

// ── Основная функция ──────────────────────────────────────────────────────────

/**
 * Преобразует двумерный массив строк (как из XLSX.utils.sheet_to_json с header:1)
 * в массив OrderCreateItem.
 *
 * rows[0] — заголовки (игнорируются)
 * rows[1] — DSL-схема
 * rows[2+] — данные
 */
export function parseOrderTemplate(rows: unknown[][]): ParseResult {
  if (rows.length < 3) return { orders: [], errors: [] }

  // Заголовки из строки 0 (для сообщений об ошибках пользователю)
  const labels: string[] = (rows[0] as unknown[]).map(cell => String(cell ?? ''))

  // Парсим схему из строки 1
  const schemas: Array<ColumnSchema | null> = (rows[1] as unknown[]).map(cell =>
    parseColumnSchema(String(cell ?? ''))
  )

  const errors: ParseError[] = []
  const orders: OrderCreateItem[] = []

  // Группируем строки по заказам
  const orderGroups: Array<{ fileRowStart: number; rows: unknown[][] }> = []
  let currentRows: unknown[][] = []
  let prevOrderId: unknown = Symbol('none')  // заведомо уникальное начальное значение

  const orderIdColIdx = schemas.findIndex(s => s?.path === 'order_id')

  for (let i = 2; i < rows.length; i++) {
    const row = rows[i] as unknown[]
    const orderId = orderIdColIdx >= 0 ? row[orderIdColIdx] : undefined
    const hasNewOrderId = orderId !== '' && orderId !== undefined && orderId !== null && orderId !== prevOrderId

    if (hasNewOrderId) {
      if (currentRows.length > 0) {
        orderGroups.push({ fileRowStart: i - currentRows.length, rows: currentRows })
      }
      currentRows = [row]
      prevOrderId = orderId
    } else {
      currentRows.push(row)
    }
  }
  if (currentRows.length > 0) {
    orderGroups.push({ fileRowStart: rows.length - currentRows.length, rows: currentRows })
  }

  // Обрабатываем каждую группу
  for (let orderIdx = 0; orderIdx < orderGroups.length; orderIdx++) {
    const group = orderGroups[orderIdx]
    const orderErrors: ParseError[] = []
    const order: Record<string, unknown> = {}
    const firstRow = group.rows[0]

    // ── Скалярные поля: берём только из первой строки ──
    for (let colIdx = 0; colIdx < schemas.length; colIdx++) {
      const schema = schemas[colIdx]
      if (!schema || schema.isArray) continue

      let rawValue = firstRow[colIdx]

      // Применяем default если ячейка пуста
      if ((rawValue === '' || rawValue === undefined || rawValue === null) && schema.default !== undefined) {
        rawValue = schema.default
      }

      if (rawValue === '' || rawValue === undefined || rawValue === null) {
        if (schema.required) {
          orderErrors.push({ row: group.fileRowStart, field: schema.path, label: labels[colIdx] ?? schema.path, message: 'обязательное поле не заполнено' })
        }
        continue
      }

      const localErrors: Array<{ message: string }> = []
      const result = coerce(rawValue, schema.type, localErrors)
      localErrors.forEach(e => orderErrors.push({ row: group.fileRowStart, field: schema.path, label: labels[colIdx] ?? schema.path, message: e.message }))
      if (result != null) setDeep(order, schema.pathParts, result.value)
    }

    // ── Массивы: собираем построчно ──

    // Группируем схемы массивов по ключу "arrayParentParts.join('.')+'.'+arrayName"
    const arrayGroups = new Map<string, ColumnSchema[]>()
    for (const schema of schemas) {
      if (!schema || !schema.isArray) continue
      const key = [...schema.arrayParentParts, schema.arrayName].join('.')
      if (!arrayGroups.has(key)) arrayGroups.set(key, [])
      arrayGroups.get(key)!.push(schema)
    }

    for (const [, colSchemas] of arrayGroups) {
      const rep = colSchemas[0]
      const parentObj = getOrCreateDeep(order, rep.arrayParentParts)
      const arr: Record<string, unknown>[] = []

      for (let rowOffset = 0; rowOffset < group.rows.length; rowOffset++) {
        const row = group.rows[rowOffset]
        const element: Record<string, unknown> = {}
        // hasRealValue — есть хотя бы одно значение из ячейки (не из default)
        // hasDefaultValue — собраны поля из default, применяем только если hasRealValue
        let hasRealValue = false
        const pendingDefaults: Array<{ key: string; value: unknown }> = []

        for (const schema of colSchemas) {
          const colIdx = schemas.indexOf(schema)
          const rawValue = row[colIdx]
          const isEmpty = rawValue === '' || rawValue === undefined || rawValue === null

          if (isEmpty) {
            if (schema.default !== undefined) {
              // Откладываем default — применим только если строка не пустая
              const localErrors: Array<{ message: string }> = []
              const result = coerce(schema.default, schema.type, localErrors)
              if (result != null) pendingDefaults.push({ key: schema.localKey, value: result.value })
            }
            continue
          }

          const localErrors: Array<{ message: string }> = []
          const result = coerce(rawValue, schema.type, localErrors)
          const fileRow = group.fileRowStart + rowOffset
          localErrors.forEach(e => orderErrors.push({ row: fileRow, field: schema.path, label: `${labels[colIdx] ?? schema.path} строка ${rowOffset + 1}`, message: e.message }))
          if (result != null) {
            element[schema.localKey] = result.value
            hasRealValue = true
          }
        }

        if (hasRealValue) {
          // Применяем отложенные defaults к элементу
          for (const { key, value } of pendingDefaults) {
            if (!(key in element)) element[key] = value
          }
          arr.push(element)
        }
      }

      if (arr.length > 0) parentObj[rep.arrayName] = arr
    }

    errors.push(...orderErrors.map(e => ({ ...e, orderIdx })))
    orders.push(order as unknown as OrderCreateItem)
  }

  return { orders, errors }
}
