/** Maps report items to a rectangular matrix using catalog column order. */
export function itemsToRows(
  items: Array<Record<string, unknown>>,
  columns: Array<{ key: string }>,
): unknown[][] {
  return items.map((item) =>
    columns.map((col) => {
      const v = item[col.key]
      return v === null || v === undefined ? '' : v
    }),
  )
}
