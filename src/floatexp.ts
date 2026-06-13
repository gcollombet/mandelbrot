// Host-side helpers for the floatexp (extended-exponent) deep-zoom path.
//
// At deep zoom the per-pixel perturbation delta dc = local·scale + c underflows
// f32 (~1.2e-38). The shader switches to an extended-exponent representation
// (value = mantissa · 2^exponent) below DEEP_EXP_THRESHOLD; this module produces
// the (mantissa, exponent) decomposition the shader consumes. See
// src/assets/mandelbrot.wgsl and openspec/changes/add-floatexp-deep-zoom.

// floatexp deep-zoom threshold, as a base-2 exponent of scale. Below scale
// ≈ 2^-116 (~1.2e-35) the shader uses the extended-exponent (fe) path, switching
// off f32 before its precision degrades approaching the underflow wall (2^-126).
// Expressed as an exponent so host and shader agree exactly from the same
// decomposed scale exponent.
export const DEEP_EXP_THRESHOLD = -116

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
