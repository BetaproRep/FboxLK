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
   * "goods[].good_id"                → arrayParentParts=[], arrayName="goods"
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
  /** Допустимые значения из DSL (4,23,24) — уже trim+uppercase */
  allowedValues?: string[]
  /** Скомпилированная регулярка из DSL {regex~errmsg} */
  regex?: RegExp
  /** Сообщение пользователю при несоответствии regex */
  regexError?: string
  /** Поле-счётчик (^): задаёт число копий элемента массива, в выходной объект не включается */
  isExpand?: boolean
  /** Поле-идентификатор объекта (!): смена значения означает начало нового объекта */
  isKey?: boolean
}

// ── Типы ошибок ───────────────────────────────────────────────────────────────

export interface ParseError {
  /** Индекс объекта в результирующем массиве items */
  itemIdx: number
  /** Номер строки в файле (0-based) */
  row: number
  /** DSL-имя поля */
  field: string
  /** Название колонки из строки 0 шаблона (для показа пользователю) */
  label: string
  message: string
}

/** Критическая ошибка схемы — при наличии таких items не строятся */
export interface SchemaError {
  /** Индекс колонки (0-based), -1 если ошибка относится ко всей схеме */
  col: number
  /** Исходная DSL-строка (пустая для ошибок уровня схемы) */
  dsl: string
  message: string
}

// ── Результат парсинга ────────────────────────────────────────────────────────

export interface TemplateParseResult<T> {
  items: T[]
  errors: ParseError[]
  schemaErrors: SchemaError[]
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

  // ── Блок допустимых значений (val1,val2,...) или регулярки {regex~errmsg} ──
  let allowedValues: string[] | undefined
  let regex: RegExp | undefined
  let regexError: string | undefined

  const parenOpen = typeSpec.indexOf('(')
  const braceOpen = typeSpec.indexOf('{')

  if (parenOpen !== -1) {
    const parenClose = typeSpec.lastIndexOf(')')
    if (parenClose === -1) return null  // ошибка DSL: нет закрывающей скобки
    const block = typeSpec.slice(parenOpen + 1, parenClose)
    allowedValues = block.split(',').map(v => v.trim().toUpperCase())
    typeSpec = typeSpec.slice(0, parenOpen) + typeSpec.slice(parenClose + 1)
  } else if (braceOpen !== -1) {
    const braceClose = typeSpec.lastIndexOf('}')
    if (braceClose === -1) return null  // ошибка DSL: нет закрывающей скобки
    const block = typeSpec.slice(braceOpen + 1, braceClose)
    const tildeIdx = block.indexOf('~')
    const reStr = tildeIdx !== -1 ? block.slice(0, tildeIdx) : block
    regexError  = tildeIdx !== -1 ? block.slice(tildeIdx + 1) : undefined
    try { regex = new RegExp(reStr) } catch { return null }  // невалидная регулярка
    typeSpec = typeSpec.slice(0, braceOpen) + typeSpec.slice(braceClose + 1)
  }

  // default value (извлекаем первым, чтобы * мог стоять до или после =)
  let defaultValue: unknown
  const eqIdx = typeSpec.indexOf('=')
  if (eqIdx !== -1) {
    const rawDefault = typeSpec.slice(eqIdx + 1)
    typeSpec = typeSpec.slice(0, eqIdx)
    defaultValue = rawDefault
  }

  // expand (^) — поле задаёт кол-во копий элемента массива
  const isExpand = typeSpec.includes('^')
  typeSpec = typeSpec.replace('^', '')

  // key (!) — поле-идентификатор объекта
  const isKey = typeSpec.includes('!')
  typeSpec = typeSpec.replace('!', '')

  // required (* может стоять в любом месте typeSpec, например "num*")
  const required = typeSpec.includes('*')
  typeSpec = typeSpec.replace('*', '')

  const VALID_TYPES = ['str', 'int', 'num', 'bool'] as const
  if (!(VALID_TYPES as readonly string[]).includes(typeSpec)) return null

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

  return {
    dsl: s, path, isArray, arrayParentParts, arrayName, localKey, pathParts,
    required, type, default: defaultValue,
    allowedValues, regex, regexError,
    isExpand: isExpand || undefined,
    isKey: isKey || undefined,
  }
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

/** Привести значение к типу и проверить ограничения схемы (allowedValues, regex) */
function coerceAndValidate(
  raw: unknown,
  schema: ColumnSchema,
  errors: Array<{ message: string }>
): { value: unknown } | null {
  const result = coerce(raw, schema.type, errors)
  if (result == null) return null

  if (schema.allowedValues) {
    const strVal = String(result.value).trim().toUpperCase()
    if (!schema.allowedValues.includes(strVal)) {
      errors.push({ message: `недопустимое значение "${result.value}", ожидается одно из: ${schema.allowedValues.join(', ')}` })
      return null
    }
  }

  if (schema.regex) {
    const strRaw = String(raw).trim()
    if (!schema.regex.test(strRaw)) {
      const msg = schema.regexError ?? `не соответствует шаблону ${schema.regex.source}`
      errors.push({ message: `недопустимое значение "${strRaw}". ${msg}` })
      return null
    }
  }

  return result
}

// ── Универсальный парсер шаблонов ─────────────────────────────────────────────

/**
 * Преобразует двумерный массив строк (как из XLSX.utils.sheet_to_json с header:1)
 * в массив объектов типа T.
 *
 * rows[0] — заголовки (для сообщений об ошибках)
 * rows[1] — DSL-схема; ровно одно поле должно иметь модификатор !
 * rows[2+] — данные
 *
 * При наличии schemaErrors items всегда пустой.
 */
export function parseTemplate<T = Record<string, unknown>>(
  rows: unknown[][]
): TemplateParseResult<T> {
  const empty = { items: [] as T[], errors: [] as ParseError[], schemaErrors: [] as SchemaError[] }
  if (rows.length < 3) return empty

  // Заголовки из строки 0
  const labels: string[] = (rows[0] as unknown[]).map(cell => String(cell ?? ''))

  // Парсим схему из строки 1, собираем ошибки схемы
  const schemas: Array<ColumnSchema | null> = []
  const schemaErrors: SchemaError[] = []

  for (let i = 0; i < (rows[1] as unknown[]).length; i++) {
    const cell = String((rows[1] as unknown[])[i] ?? '').trim()
    if (!cell) { schemas.push(null); continue }
    const schema = parseColumnSchema(cell)
    if (schema == null) {
      schemaErrors.push({ col: i, dsl: cell, message: `не удалось разобрать DSL: "${cell}"` })
      schemas.push(null)
    } else {
      schemas.push(schema)
    }
  }

  // Проверяем наличие/отсутствие ! в зависимости от наличия массивов в схеме
  const hasArrays = schemas.some(s => s?.isArray)
  const keyColIdx = schemas.findIndex(s => s?.isKey)

  if (hasArrays && keyColIdx === -1) {
    schemaErrors.push({ col: -1, dsl: '', message: 'шаблон содержит массивы — необходимо поле-идентификатор объекта (!)'  })
  } else if (!hasArrays && keyColIdx !== -1) {
    schemaErrors.push({ col: keyColIdx, dsl: schemas[keyColIdx]?.dsl ?? '', message: 'поле-идентификатор (!) не нужно — в шаблоне нет массивов' })
  }

  if (schemaErrors.length > 0) return { ...empty, schemaErrors }

  // Группируем строки по объектам
  const groups: Array<{ fileRowStart: number; rows: unknown[][] }> = []

  if (!hasArrays) {
    // Нет массивов — каждая строка данных является отдельным объектом
    for (let i = 2; i < rows.length; i++) {
      groups.push({ fileRowStart: i, rows: [rows[i] as unknown[]] })
    }
  } else {
    // Есть массивы — группируем строки по смене значения ключевого поля
    let currentRows: unknown[][] = []
    let prevKeyVal: unknown = Symbol('none')

    for (let i = 2; i < rows.length; i++) {
      const row = rows[i] as unknown[]
      const keyVal = row[keyColIdx]
      const isNewObject = keyVal !== '' && keyVal !== undefined && keyVal !== null && keyVal !== prevKeyVal

      if (isNewObject) {
        if (currentRows.length > 0) groups.push({ fileRowStart: i - currentRows.length, rows: currentRows })
        currentRows = [row]
        prevKeyVal = keyVal
      } else {
        currentRows.push(row)
      }
    }
    if (currentRows.length > 0) groups.push({ fileRowStart: rows.length - currentRows.length, rows: currentRows })
  }

  // Обрабатываем каждую группу
  const errors: ParseError[] = []
  const items: T[] = []

  for (let itemIdx = 0; itemIdx < groups.length; itemIdx++) {
    const group = groups[itemIdx]
    const itemErrors: Omit<ParseError, 'itemIdx'>[] = []
    const item: Record<string, unknown> = {}
    const firstRow = group.rows[0]

    // ── Скалярные поля: берём только из первой строки ──
    for (let colIdx = 0; colIdx < schemas.length; colIdx++) {
      const schema = schemas[colIdx]
      if (!schema || schema.isArray) continue

      let rawValue = firstRow[colIdx]

      if ((rawValue === '' || rawValue === undefined || rawValue === null) && schema.default !== undefined) {
        rawValue = schema.default
      }

      if (rawValue === '' || rawValue === undefined || rawValue === null) {
        if (schema.required) {
          itemErrors.push({ row: group.fileRowStart, field: schema.path, label: labels[colIdx] ?? schema.path, message: 'обязательное поле не заполнено' })
        }
        continue
      }

      const localErrors: Array<{ message: string }> = []
      const result = coerceAndValidate(rawValue, schema, localErrors)
      localErrors.forEach(e => itemErrors.push({ row: group.fileRowStart, field: schema.path, label: labels[colIdx] ?? schema.path, message: e.message }))
      if (result != null) setDeep(item, schema.pathParts, result.value)
    }

    // ── Массивы: собираем построчно ──
    const arrayGroups = new Map<string, ColumnSchema[]>()
    for (const schema of schemas) {
      if (!schema || !schema.isArray) continue
      const key = [...schema.arrayParentParts, schema.arrayName].join('.')
      if (!arrayGroups.has(key)) arrayGroups.set(key, [])
      arrayGroups.get(key)!.push(schema)
    }

    for (const [, colSchemas] of arrayGroups) {
      const rep = colSchemas[0]
      const parentObj = getOrCreateDeep(item, rep.arrayParentParts)
      const arr: Record<string, unknown>[] = []

      for (let rowOffset = 0; rowOffset < group.rows.length; rowOffset++) {
        const row = group.rows[rowOffset]
        const element: Record<string, unknown> = {}
        let hasRealValue = false
        let expandCount = 1
        const pendingDefaults: Array<{ key: string; value: unknown }> = []

        for (const schema of colSchemas) {
          const colIdx = schemas.indexOf(schema)
          const rawValue = row[colIdx]
          const isEmpty = rawValue === '' || rawValue === undefined || rawValue === null

          if (isEmpty) {
            if (schema.default !== undefined) {
              const localErrors: Array<{ message: string }> = []
              const result = coerce(schema.default, schema.type, localErrors)
              if (result != null) pendingDefaults.push({ key: schema.localKey, value: result.value })
            }
            continue
          }

          const localErrors: Array<{ message: string }> = []
          const result = coerceAndValidate(rawValue, schema, localErrors)
          const fileRow = group.fileRowStart + rowOffset
          localErrors.forEach(e => itemErrors.push({ row: fileRow, field: schema.path, label: `${labels[colIdx] ?? schema.path} строка ${rowOffset + 1}`, message: e.message }))
          if (result != null) {
            if (schema.isExpand) {
              expandCount = Math.max(1, Math.floor(Number(result.value)))
            } else {
              element[schema.localKey] = result.value
            }
            hasRealValue = true
          }
        }

        if (hasRealValue) {
          for (const { key, value } of pendingDefaults) {
            if (!(key in element)) element[key] = value
          }
          for (let n = 0; n < expandCount; n++) arr.push(n === 0 ? element : { ...element })
        }
      }

      if (arr.length > 0) parentObj[rep.arrayName] = arr
    }

    errors.push(...itemErrors.map(e => ({ ...e, itemIdx })))
    items.push(item as T)
  }

  return { items, errors, schemaErrors: [] }
}
