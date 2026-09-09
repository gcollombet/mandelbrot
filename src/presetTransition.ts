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
} as const

export function interpolatePresetAppearance(a: MandelbrotParams, b: MandelbrotParams, progress: number): Partial<MandelbrotParams> {
    const t = Math.max(0, Math.min(1, progress))
    const result: Partial<MandelbrotParams> = {}
    for (const key of Object.keys(TRANSITION_DEFAULTS) as (keyof typeof TRANSITION_DEFAULTS)[]) {
        const start = a[key] ?? TRANSITION_DEFAULTS[key]
        const end = b[key] ?? TRANSITION_DEFAULTS[key]
        result[key] = start + (end - start) * t
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
