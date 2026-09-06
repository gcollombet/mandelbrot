/** Exact decimal storage/comparison. Only relative distances become doubles. */
type Decimal = { negative: boolean; digits: string; exponent: bigint }

function parse(value: string): Decimal {
  if (typeof value !== 'string' || value.length > 16384) throw new Error('Invalid decimal')
  const match = /^([+-]?)(?:(\d+)(?:\.(\d*))?|\.(\d+))(?:[eE]([+-]?\d+))?$/.exec(value.trim())
  if (!match) throw new Error('Invalid decimal')
  const fraction = match[3] ?? match[4] ?? ''
  let digits = ((match[2] ?? '') + fraction).replace(/^0+/, '')
  let exponent = BigInt(match[5] ?? '0') - BigInt(fraction.length)
  if (!digits) return { negative: false, digits: '0', exponent: 0n }
  const trailing = digits.length - digits.replace(/0+$/, '').length
  digits = digits.slice(0, digits.length - trailing)
  exponent += BigInt(trailing)
  return { negative: match[1] === '-', digits, exponent }
}

function format(value: Decimal): string {
  if (value.digits === '0') return '0'
  return `${value.negative ? '-' : ''}${value.digits[0]}${value.digits.length > 1 ? '.' + value.digits.slice(1) : ''}e${value.exponent + BigInt(value.digits.length - 1)}`
}

export function canonicalDecimal(value: string): string { return format(parse(value)) }
export function canonicalScale(value: string): string {
  const parsed = parse(value)
  if (parsed.negative || parsed.digits === '0') throw new Error('Scale must be positive')
  return format(parsed)
}

export function compareScales(a: string, b: string): number {
  const left = parse(canonicalScale(a)), right = parse(canonicalScale(b))
  const orderA = left.exponent + BigInt(left.digits.length)
  const orderB = right.exponent + BigInt(right.digits.length)
  if (orderA !== orderB) return orderA < orderB ? -1 : 1
  const size = Math.max(left.digits.length, right.digits.length)
  const x = left.digits.padEnd(size, '0'), y = right.digits.padEnd(size, '0')
  return x === y ? 0 : x < y ? -1 : 1
}

function integerRatio(a: bigint, b: bigint): number {
  const x = a.toString(), y = b.toString()
  const nx = Math.min(16, x.length), ny = Math.min(16, y.length)
  return Number(x.slice(0, nx)) / Number(y.slice(0, ny)) * 10 ** (x.length - nx - y.length + ny)
}

/** log2(a / b), subtracting exponents exactly BEFORE floating point conversion.
 * For close endpoints, log1p of an exact integer difference avoids cancellation.
 */
export function scaleDoublements(a: string, b: string): number {
  const x = parse(canonicalScale(a)), y = parse(canonicalScale(b))
  const order = x.exponent + BigInt(x.digits.length) - y.exponent - BigInt(y.digits.length)
  if (order >= -1n && order <= 1n) {
    const exponent = x.exponent < y.exponent ? x.exponent : y.exponent
    const ix = BigInt(x.digits) * 10n ** (x.exponent - exponent)
    const iy = BigInt(y.digits) * 10n ** (y.exponent - exponent)
    if (ix === iy) return 0
    const sign = ix > iy ? 1 : -1
    const small = ix < iy ? ix : iy
    const delta = ix > iy ? ix - iy : iy - ix
    const result = sign * Math.log1p(integerRatio(delta, small)) / Math.LN2
    if (result === 0) throw new Error('Zoom window is below the supported relative precision')
    return result
  }
  const exponentDistance = Number(order)
  if (!Number.isSafeInteger(exponentDistance)) throw new Error('Zoom distance exceeds planner limits')
  const mantissa = (digits: string) => Number(digits.slice(0, 16)) / 10 ** (Math.min(16, digits.length) - 1)
  return exponentDistance * Math.LOG2E * Math.LN10 + Math.log2(mantissa(x.digits) / mantissa(y.digits))
}

/** Intermediate GPU anchor: exponent stays exact; mantissa uses f64 precision.
 * Canonical user endpoints are never replaced by this working coordinate. */
export function scaleTimesExp(value: string, logFactor: number): string {
  if (!Number.isFinite(logFactor)) throw new Error('Invalid logarithmic scale factor')
  const x = parse(canonicalScale(value))
  const decades = Math.floor(logFactor / Math.LN10)
  if (!Number.isSafeInteger(decades)) throw new Error('Scale factor outside exponent limits')
  const count = Math.min(16, x.digits.length)
  const mantissa = Number(x.digits.slice(0, count)) / 10 ** (count - 1)
    * Math.exp(logFactor - decades * Math.LN10)
  return canonicalScale(`${mantissa.toPrecision(16)}e${x.exponent + BigInt(x.digits.length - 1) + BigInt(decades)}`)
}

export function interpolateScale(a: string, b: string, t: number): string {
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error('Invalid relative depth')
  if (t === 0) return canonicalScale(a)
  if (t === 1) return canonicalScale(b)
  const distance = scaleDoublements(b, a)
  if (distance === 0) return canonicalScale(a)
  if (Math.abs(distance) < 1e-8) {
    // For tiny windows a linear interpolation differs from log interpolation
    // only at O(distance^2), below the GPU coordinate precision. Retain exact
    // decimal differences instead of rounding exp(distance*t) to one.
    const x = parse(canonicalScale(a)), y = parse(canonicalScale(b))
    const exponent = (x.exponent < y.exponent ? x.exponent : y.exponent) - 32n
    const ix = BigInt(x.digits) * 10n ** (x.exponent - exponent)
    const iy = BigInt(y.digits) * 10n ** (y.exponent - exponent)
    const fraction = parse(t.toPrecision(17))
    const coefficient = ix + (iy - ix) * BigInt(fraction.digits) / 10n ** (-fraction.exponent)
    return format({ negative: false, digits: coefficient.toString(), exponent })
  }
  const value = scaleTimesExp(a, distance * Math.LN2 * t)
  const coarse = compareScales(a, b) > 0 ? a : b, fine = compareScales(a, b) > 0 ? b : a
  return compareScales(value, coarse) > 0 ? canonicalScale(coarse) : compareScales(value, fine) < 0 ? canonicalScale(fine) : value
}
