import type { OrderCreateItem } from '../types/order'
import { parseTemplate } from './templateParser'
export type { ColumnSchema, ParseError, SchemaError, TemplateParseResult } from './templateParser'
export { parseColumnSchema, parseTemplate, BOOL_TRUE_VALUES, BOOL_FALSE_VALUES } from './templateParser'

export interface ParseResult {
  orders: OrderCreateItem[]
  errors: import('./templateParser').ParseError[]
  schemaErrors: import('./templateParser').SchemaError[]
}

export function parseOrderTemplate(rows: unknown[][]): ParseResult {
  const { items, errors, schemaErrors } = parseTemplate<OrderCreateItem>(rows)
  return { orders: items, errors, schemaErrors }
}
