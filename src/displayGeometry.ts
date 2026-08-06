export const DISPLAY_VALUE_LAYERS = 3
export const DISPLAY_BYTES_PER_TEXEL = 24

export const PROVENANCE_BITS = 4
export const QUANTIZED_FIELD_BITS = 14
export const QUANTIZED_FIELD_MAX = (1 << QUANTIZED_FIELD_BITS) - 1
export const STRIPE_SHIFT = PROVENANCE_BITS
export const COHERENCE_SHIFT = PROVENANCE_BITS + QUANTIZED_FIELD_BITS

export const GEOMETRY_GRADIENT_CLAMP = 64
export const GEOMETRY_CURVATURE_CLAMP = 64
export const GEOMETRY_HEIGHT_CLAMP = 64

export interface DecodedDisplayMetadata {
    provenanceExponent: number
    supportStep: number
    stripePhase: number
    coherence: number
}

export interface DisplayGeometry {
    gradientX: number
    gradientY: number
    curvature: number
    height: number
}

function clamp(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value))
}

export function provenanceExponentForStep(step: number): number {
    if (!Number.isFinite(step) || step <= 1) return 0
    return clamp(Math.round(Math.log2(step)), 0, 15)
}

export function supportStepForExponent(exponent: number): number {
    return 2 ** clamp(Math.trunc(exponent), 0, 15)
}

function quantizeUnit(value: number): number {
    const finite = Number.isFinite(value) ? value : 0
    return Math.round(clamp(finite, 0, 1) * QUANTIZED_FIELD_MAX)
}

export function packDisplayMetadata(step: number, stripePhase: number, coherence: number): number {
    const exponent = provenanceExponentForStep(step)
    const wrappedStripe = ((Number.isFinite(stripePhase) ? stripePhase : 0) % 1 + 1) % 1
    const stripe = quantizeUnit(wrappedStripe)
    const coherent = quantizeUnit(coherence)
    return (
        exponent
        | (stripe << STRIPE_SHIFT)
        | (coherent << COHERENCE_SHIFT)
    ) >>> 0
}

export function unpackDisplayMetadata(word: number): DecodedDisplayMetadata {
    const packed = word >>> 0
    const provenanceExponent = packed & 0xf
    return {
        provenanceExponent,
        supportStep: supportStepForExponent(provenanceExponent),
        stripePhase: ((packed >>> STRIPE_SHIFT) & QUANTIZED_FIELD_MAX) / QUANTIZED_FIELD_MAX,
        coherence: ((packed >>> COHERENCE_SHIFT) & QUANTIZED_FIELD_MAX) / QUANTIZED_FIELD_MAX,
    }
}

export function circularPhaseDelta(a: number, b: number): number {
    const delta = a - b
    return delta - Math.round(delta)
}

/** True when all display consumers may safely reuse a resolved cache version. */
export function isDisplaySetCurrent(fieldVersion: number, displayVersion: number): boolean {
    return displayVersion >= 0 && fieldVersion === displayVersion
}

export function effectiveSupportStep(metadata: number, sourceScaleRatio: number): number {
    const ratio = Number.isFinite(sourceScaleRatio) && sourceScaleRatio > 0 ? sourceScaleRatio : 1
    return unpackDisplayMetadata(metadata).supportStep * ratio
}

export function selectFinestDisplaySource(input: {
    liveMetadata?: number
    liveScaleRatio: number
    frozenMetadata?: number
    frozenScaleRatio: number
}): 'live' | 'frozen' | 'none' {
    const liveValid = input.liveMetadata !== undefined
    const frozenValid = input.frozenMetadata !== undefined
    if (!liveValid && !frozenValid) return 'none'
    if (!frozenValid) return 'live'
    if (!liveValid) return 'frozen'
    return effectiveSupportStep(input.liveMetadata!, input.liveScaleRatio)
        <= effectiveSupportStep(input.frozenMetadata!, input.frozenScaleRatio)
        ? 'live'
        : 'frozen'
}

/**
 * A finite-difference comparison is meaningful only inside one escape branch.
 * Neighbours with another integer iteration are reported separately rather
 * than counted as analytic-gradient error.
 */
export function isEscapeBranchTransition(centerIteration: number, neighbourIterations: number[]): boolean {
    return neighbourIterations.some(iteration => iteration !== centerIteration)
}

export function normalizeDisplayGeometry(
    geometry: DisplayGeometry,
    sourceToDisplayRatio: number,
    rotation = 0,
): DisplayGeometry {
    const ratio = Number.isFinite(sourceToDisplayRatio) && sourceToDisplayRatio > 0
        ? sourceToDisplayRatio
        : 1
    const c = Math.cos(rotation)
    const s = Math.sin(rotation)
    const gx = geometry.gradientX * ratio
    const gy = geometry.gradientY * ratio
    return {
        gradientX: clamp(c * gx - s * gy, -GEOMETRY_GRADIENT_CLAMP, GEOMETRY_GRADIENT_CLAMP),
        gradientY: clamp(s * gx + c * gy, -GEOMETRY_GRADIENT_CLAMP, GEOMETRY_GRADIENT_CLAMP),
        curvature: clamp(geometry.curvature * ratio * ratio,
            0, GEOMETRY_CURVATURE_CLAMP),
        height: clamp(geometry.height + Math.log(ratio), -GEOMETRY_HEIGHT_CLAMP, GEOMETRY_HEIGHT_CLAMP),
    }
}

/**
 * Fixed-escape-branch gradient of H = -log(Dscreen), already scaled into
 * source neutral-texel axes. The logarithmic form mirrors the terminal
 * iteration kernel and avoids materialising z' or z'' at deep zoom.
 */
export function analyticDistanceHeightGradient(input: {
    z: [number, number]
    derivativeMantissa: [number, number]
    derivativeLogScale: number
    secondDerivativeLogMagnitude: number
    secondDerivativeAngle: number
    logTexelDelta: number
}): [number, number] | null {
    const { z, derivativeMantissa: m1, derivativeLogScale: s1,
        secondDerivativeLogMagnitude: s2, secondDerivativeAngle: a2, logTexelDelta } = input
    const values = [z[0], z[1], m1[0], m1[1], s1, s2, a2, logTexelDelta]
    if (!values.every(Number.isFinite) || Math.abs(s2) >= 1e34) return null
    const zLength = Math.hypot(z[0], z[1])
    const m1Length = Math.hypot(m1[0], m1[1])
    if (!(zLength > 0) || !(m1Length > 0)) return null
    const logZ = Math.log(zLength)
    if (!(logZ > 0)) return null

    const term1Magnitude = Math.exp(clamp(s2 - s1 - Math.log(m1Length) + logTexelDelta, -80, 80))
    const term1Angle = a2 - Math.atan2(m1[1], m1[0])
    const coefficient = 1 + 1 / logZ
    const term2Magnitude = coefficient * Math.exp(clamp(s1 + Math.log(m1Length) - logZ + logTexelDelta, -80, 80))
    const term2Angle = Math.atan2(m1[1], m1[0]) - Math.atan2(z[1], z[0])
    const ax = term1Magnitude * Math.cos(term1Angle) - term2Magnitude * Math.cos(term2Angle)
    const ay = term1Magnitude * Math.sin(term1Angle) - term2Magnitude * Math.sin(term2Angle)
    return Number.isFinite(ax) && Number.isFinite(ay) ? [ax, ay] : null
}

/**
 * Fixed-escape-branch Laplacian of H = -log(Dscreen), scaled by one source
 * neutral texel squared. Harmonic cancellation removes z'' and z''':
 * Delta H = |z'/z|^2 / log(|z|)^2.
 */
export function analyticDistanceHeightLaplacian(input: {
    z: [number, number]
    derivativeMantissa: [number, number]
    derivativeLogScale: number
    logTexelDelta: number
}): number | null {
    const { z, derivativeMantissa: m1, derivativeLogScale: s1, logTexelDelta } = input
    const values = [z[0], z[1], m1[0], m1[1], s1, logTexelDelta]
    if (!values.every(Number.isFinite)) return null
    const zLength = Math.hypot(z[0], z[1])
    const m1Length = Math.hypot(m1[0], m1[1])
    if (!(zLength > 1) || !(m1Length > 0)) return null
    const logZ = Math.log(zLength)
    if (!(logZ > 0)) return null
    const logarithm = 2 * (s1 + Math.log(m1Length) - Math.log(zLength)
        - Math.log(logZ) + logTexelDelta)
    const laplacian = Math.exp(clamp(logarithm, -80, Math.log(GEOMETRY_CURVATURE_CLAMP)))
    return Number.isFinite(laplacian) ? laplacian : null
}

export function float16ToFloat32(bits: number): number {
    const sign = (bits & 0x8000) ? -1 : 1
    const exponent = (bits >>> 10) & 0x1f
    const fraction = bits & 0x3ff
    if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024)
    if (exponent === 0x1f) return fraction ? Number.NaN : sign * Number.POSITIVE_INFINITY
    return sign * 2 ** (exponent - 15) * (1 + fraction / 1024)
}

export function float32ToFloat16(value: number): number {
    const view = new DataView(new ArrayBuffer(4))
    view.setFloat32(0, value, false)
    const bits = view.getUint32(0, false)
    const sign = (bits >>> 16) & 0x8000
    let exponent = ((bits >>> 23) & 0xff) - 127 + 15
    let mantissa = bits & 0x7fffff
    if (exponent <= 0) {
        if (exponent < -10) return sign
        mantissa = (mantissa | 0x800000) >>> (1 - exponent)
        return sign | ((mantissa + 0x1000) >>> 13)
    }
    if (exponent >= 31) return sign | 0x7c00
    mantissa += 0x1000
    if (mantissa & 0x800000) {
        mantissa = 0
        exponent++
        if (exponent >= 31) return sign | 0x7c00
    }
    return sign | (exponent << 10) | (mantissa >>> 13)
}
