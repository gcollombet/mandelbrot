// Value formatters for dense fields, mirroring the mockups' `f:'p2'` / `f:fn` model.
// A formatter is either a precision key ('p0'..'p3') or a function (value) => string.

export type DenseFormatter = 'p0' | 'p1' | 'p2' | 'p3' | ((v: number) => string);

const PRECISION: Record<string, number> = { p0: 0, p1: 1, p2: 2, p3: 3 };

export function formatValue(v: number, f?: DenseFormatter, unit?: string): string {
  let text: string;
  if (typeof f === 'function') {
    text = f(v);
  } else if (f && f in PRECISION) {
    text = v.toFixed(PRECISION[f]);
  } else {
    // Default: trim to a sensible precision without trailing zeros.
    text = Number.isInteger(v) ? String(v) : String(Math.round(v * 1000) / 1000);
  }
  return unit ? `${text}${unit}` : text;
}
