import { describe, expect, it } from 'vitest'
import { itemsToRows } from '@/utils/reportRows'

describe('itemsToRows', () => {
  it('orders values by catalog columns and replaces null with empty string', () => {
    const rows = itemsToRows(
      [{ b: 2, a: 'x', c: null }],
      [{ key: 'a' }, { key: 'b' }, { key: 'c' }, { key: 'missing' }],
    )
    expect(rows).toEqual([['x', 2, '', '']])
  })
})
