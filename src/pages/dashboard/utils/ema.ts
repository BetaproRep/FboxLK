export function applyEma(
  values: Array<number | null>,
  alpha = 0.35,
): Array<number | null> {
  let ema: number | null = null

  return values.map((value) => {
    if (value === null) return null
    ema = ema === null ? value : alpha * value + (1 - alpha) * ema
    return ema
  })
}
