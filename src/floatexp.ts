// Host-side helpers for the floatexp (extended-exponent) deep-zoom path.
//
// At deep zoom the per-pixel perturbation delta dc = local·scale + c underflows
// f32 (~1.2e-38). The shader switches to an extended-exponent representation
// (value = mantissa · 2^exponent) below DEEP_EXP_THRESHOLD; this module produces
// the (mantissa, exponent) decomposition the shader consumes. See
// src/assets/mandelbrot.wgsl and openspec/changes/add-floatexp-deep-zoom.

// floatexp deep-zoom threshold, as a base-2 exponent of scale. Below scale
// ≈ 2^-100 (~7.9e-31, i.e. around 1e-30) the shader uses the extended-exponent
// (fe) path, switching off f32 well before its precision degrades approaching
// the underflow wall (2^-126). Expressed as an exponent so host and shader
// agree exactly from the same decomposed scale exponent.
export const DEEP_EXP_THRESHOLD = -100

// Decompose an f64 into extended-exponent parts: value = mantissa · 2^exponent
// with |mantissa| ∈ [0.5, 1). The mantissa is rounded to f32 (the GPU keeps only
// f32); the exponent is exact. 0 maps to {0, 0}; f64 subnormals are handled.
export function frexpFloat32(value: number): { mantissa: number; exponent: number } {
    if (!Number.isFinite(value) || value === 0) {
        return { mantissa: 0, exponent: 0 }
    }
    let m = value
    let exponent = 0
    // Lift f64 subnormals into the normal range first so log2 is well-behaved.
    if (Math.abs(m) < 2.2250738585072014e-308) {
        m *= 2 ** 64
        exponent -= 64
    }
    // Estimate the binary exponent, then correct so |mantissa| ∈ [0.5, 1).
    const est = Math.floor(Math.log2(Math.abs(m))) + 1
    m /= 2 ** est
    exponent += est
    while (Math.abs(m) >= 1) { m *= 0.5; exponent += 1 }
    while (Math.abs(m) < 0.5) { m *= 2; exponent -= 1 }
    // Rounding to f32 can nudge a near-1 mantissa up to exactly 1.0; re-normalize.
    let mf = Math.fround(m)
    if (Math.abs(mf) >= 1) { mf *= 0.5; exponent += 1 }
    return { mantissa: mf, exponent }
}

const LOG2_10 = 3.321928094887362

// Parse a decimal string into sign · m10 · 10^d with m10 ∈ [1, 10), keeping only
// the leading significant digits (enough for an f32 mantissa). Returns null on a
// malformed input; returns {sign:1, m10:0, d:0} for zero.
function parseDecimal(s: string): { sign: number; m10: number; d: number } | null {
    s = s.trim()
    if (s.length === 0) return null
    let sign = 1
    if (s[0] === '-') { sign = -1; s = s.slice(1) } else if (s[0] === '+') { s = s.slice(1) }
    let exp = 0
    const eIdx = s.search(/[eE]/)
    if (eIdx >= 0) {
        const ev = parseInt(s.slice(eIdx + 1), 10)
        if (!Number.isFinite(ev)) return null
        exp = ev
        s = s.slice(0, eIdx)
    }
    const dotIdx = s.indexOf('.')
    const intPart = dotIdx >= 0 ? s.slice(0, dotIdx) : s
    const fracPart = dotIdx >= 0 ? s.slice(dotIdx + 1) : ''
    if (!/^[0-9]*$/.test(intPart) || !/^[0-9]*$/.test(fracPart) || intPart + fracPart === '') return null
    const digits = intPart + fracPart
    const pointPos = intPart.length // number of digits before the decimal point
    let firstNZ = -1
    for (let i = 0; i < digits.length; i++) { if (digits[i] !== '0') { firstNZ = i; break } }
    if (firstNZ < 0) return { sign: 1, m10: 0, d: 0 } // all zeros
    const lead = digits.slice(firstNZ, firstNZ + 18)
    const m10 = parseFloat(lead[0] + '.' + lead.slice(1)) // ∈ [1, 10)
    const d = (pointPos - 1 - firstNZ) + exp // value = m10 · 10^d
    return { sign, m10, d }
}

// log2 of a decimal string's magnitude, computed straight from its (m10, d)
// decomposition — no f64 intermediate, so it stays finite for scales far
// below the f64 floor (~1e-308) where `Math.log2(parseFloat(s))` underflows
// to -Infinity (parseFloat(s) hits 0 below the smallest f64 subnormal,
// ~5e-324). Returns -Infinity only for a genuinely zero/malformed input.
export function log2FromDecimalString(s: string): number {
    const p = parseDecimal(s)
    if (!p || p.m10 === 0) return -Infinity
    // log2(value) = (log10(m10) + d) · log2(10); the large `d` term keeps full
    // f64 relative precision, far more than an f32 mantissa needs.
    return (Math.log10(p.m10) + p.d) * LOG2_10
}

// log10 of a decimal string's magnitude, computed straight from its (m10, d)
// decomposition — same reason as log2FromDecimalString: `Math.log10(Number(s))`
// goes to -Infinity once `s` underflows the f64 floor (~1e-308).
export function log10FromDecimalString(s: string): number {
    const p = parseDecimal(s)
    if (!p || p.m10 === 0) return -Infinity
    return Math.log10(p.m10) + p.d
}

// Extended-exponent decomposition straight from a decimal string, with no f64
// intermediate — so it works for scales far below the f64 floor (~1e-308),
// removing the host-side depth wall. value = mantissa · 2^exponent,
// |mantissa| ∈ [0.5, 1). Falls back to {0,0} on malformed input or zero.
export function frexpFromDecimalString(s: string): { mantissa: number; exponent: number } {
    const p = parseDecimal(s)
    if (!p || p.m10 === 0) return { mantissa: 0, exponent: 0 }
    const log2v = log2FromDecimalString(s)
    let exponent = Math.floor(log2v)
    let mantissa = 2 ** (log2v - exponent) // ∈ [1, 2)
    mantissa *= 0.5 // → [0.5, 1)
    exponent += 1
    let mf = Math.fround(mantissa * p.sign)
    if (Math.abs(mf) >= 1) { mf *= 0.5; exponent += 1 }
    return { mantissa: mf, exponent }
}
