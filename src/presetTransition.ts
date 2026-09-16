import type { MandelbrotParams } from './Mandelbrot'
import { normalizeTextureMappingFromLegacy } from './TextureMapping'
import { normalizeOrbitTrapFromLegacy } from './OrbitTrap'

// Continuous appearance controls only. Camera/numerical solver and enum choices
// retain their own lifecycle; interpolating an enum ID has no physical meaning.
export const TRANSITION_DEFAULTS = {
    palettePeriod: 256, paletteOffset: 0, heightPaletteShift: 0,
    tessellationLevel: 0, displacementAmount: 0, ambientOcclusionStrength: 0,
    microBumpStrength: 0, reliefDepth: 1, protrusionPhase: 0,
    protrusionSharpness: 2, protrusionStrength: 1, protrusionGeometryMix: 0,
    protrusionPeriod: 1, localShadowStrength: 0, lightAngle: 0,
    varnishStrength: 0, gradeContrast: 1.18, gradeSaturation: 1.12,
    phaseColoringStrength: 0, stripeFrequency: 8,
    paletteScreenShiftX: 0, paletteScreenShiftY: 0,
} as const

// Periodic controls travel along the shortest arc (0.9 → 0.1 crosses 1.0, not
// 0.5); the palette period is perceived logarithmically (the slider is log10),
// so it mixes in log space. Mirrored in color.wgsl for the palette path.
export const WRAPPED_TRANSITION_FIELDS: Partial<Record<keyof typeof TRANSITION_DEFAULTS, number>> = {
    paletteOffset: 1, protrusionPhase: 1, lightAngle: 2 * Math.PI,
}
export const LOG_TRANSITION_FIELDS = new Set<keyof typeof TRANSITION_DEFAULTS>(['palettePeriod'])

export function mixTransitionValue(key: keyof typeof TRANSITION_DEFAULTS, start: number, end: number, t: number): number {
    const period = WRAPPED_TRANSITION_FIELDS[key]
    if (period) {
        let delta = (end - start) % period
        if (delta > period / 2) delta -= period
        else if (delta < -period / 2) delta += period
        const value = start + delta * t
        return ((value % period) + period) % period
    }
    if (LOG_TRANSITION_FIELDS.has(key) && start > 0 && end > 0) return Math.exp(Math.log(start) + (Math.log(end) - Math.log(start)) * t)
    return start + (end - start) * t
}

export function interpolatePresetAppearance(a: MandelbrotParams, b: MandelbrotParams, progress: number): Partial<MandelbrotParams> {
    const t = Math.max(0, Math.min(1, progress))
    const result: Partial<MandelbrotParams> = {}
    for (const key of Object.keys(TRANSITION_DEFAULTS) as (keyof typeof TRANSITION_DEFAULTS)[]) {
        const start = a[key] ?? TRANSITION_DEFAULTS[key]
        const end = b[key] ?? TRANSITION_DEFAULTS[key]
        result[key] = mixTransitionValue(key, start, end, t)
    }
    const ma = normalizeTextureMappingFromLegacy(a), mb = normalizeTextureMappingFromLegacy(b)
    result.textureMapping = { ...(t < 1 ? ma : mb),
        xScale: ma.xScale + (mb.xScale - ma.xScale) * t,
        yScale: ma.yScale + (mb.yScale - ma.yScale) * t,
    }
    // A trap's accumulator geometry is discrete for this first step. Switch it
    // at zero contribution when necessary, rather than making an off->on pop.
    const ta = normalizeOrbitTrapFromLegacy(a), tb = normalizeOrbitTrapFromLegacy(b)
    const strengthA = ta.mode === 'off' ? 0 : ta.strength
    const strengthB = tb.mode === 'off' ? 0 : tb.strength
    const sameShape = JSON.stringify({ ...ta, strength: 0 }) === JSON.stringify({ ...tb, strength: 0 })
    let trap = t < 1 ? ta : tb
    let strength = strengthA + (strengthB - strengthA) * t
    if (!sameShape) {
        if (strengthA === 0) trap = tb
        else if (strengthB === 0) trap = t < 1 ? ta : tb
        else {
            trap = t < 0.5 ? ta : tb
            strength = t < 0.5 ? strengthA * (1 - 2 * t) : strengthB * (2 * t - 1)
        }
    }
    result.orbitTrap = { ...trap, strength }
    result.orbitTrapStrength = strength
    return result
}
