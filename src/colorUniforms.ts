// ── Layout of the colour pass uniform block (color.wgsl `Uniforms`) ──
//
// The WGSL struct is a flat list of f32. This file declares it ONCE, in the
// same order, and every writer fills it by name: the engine, the palette
// preview, and the partial writes of render(). A unit test parses color.wgsl
// and fails if the two lists ever diverge, so no index is ever typed by hand.

import {orbitTrapColorUniformValues, type OrbitTrapConfig} from './OrbitTrap'

const ORBIT_TRAP_FIELDS = [
    'orbitTrapMode',              // 0 off, 1 terminal, 2 sampled orbit, 3 exact orbit
    'orbitTrapCenterX',           // centre in bailout-normalised dynamic coordinates
    'orbitTrapCenterY',
    'orbitTrapScale',
    'orbitTrapRotation',
    'orbitTrapAnisotropyX',
    'orbitTrapAnisotropyY',
    'orbitTrapPetals',
    'orbitTrapPetalDepth',
    'orbitTrapTwist',
    'orbitTrapPhase',
    'orbitTrapWidth',
    'orbitTrapHardness',
    'orbitTrapDistanceFrequency',
    'orbitTrapDistanceWeight',
    'orbitTrapIterationWeight',
    'orbitTrapAngleWeight',
    'orbitTrapPhaseOffset',
    'orbitTrapStartIteration',
    'orbitTrapEndIteration',
    'orbitTrapIncludeInterior',
] as const

export const COLOR_UNIFORM_FIELDS = [
    'palettePeriod',
    'paletteOffset',
    'skyboxTransitionLevels',     // packed source mip counts (each < 32) during a preset transition
    'time',
    'aspect',
    'angle',
    'animate',
    'mu',
    'zoomFactor',                 // frozenScale / displayScale
    'frozenAligned',              // 1 when the frozen texture is aligned with the live one
    'liveZoomFactor',             // liveScale / displayScale
    'frozenShiftU',               // displacement of the frozen grid (normalised UV, see ViewGrids)
    'frozenShiftV',
    'tessellationLevel',          // [0, 10]
    'displacementAmount',         // [0, 0.1]
    'animationSpeed',             // global multiplier on drift frequencies
    'epsilon',                    // interior detection threshold (|der|² < epsilon)
    'ambientOcclusionStrength',
    'microBumpStrength',
    'aaLookupOffsetX',            // inverse live-grid shift for uniform AA
    'reliefDepth',
    'lightAngle',
    'localShadowStrength',
    'varnishStrength',
    'logMu',
    'sceneSin',
    'sceneCos',
    'lightDirX',
    'lightDirY',
    'lightDirZ',
    'paletteMirror',
    'debugShading',
    'heightPaletteShift',
    'orbitTrapStrength',          // legacy-compatible strength [0, 100]
    'phaseColoringStrength',
    'textureMappingXVariable',
    'textureMappingYVariable',
    'textureMappingXScale',
    'textureMappingYScale',
    'textureMappingMirror',
    'centerX',
    'centerY',
    'scale',
    'gradeContrast',              // display-grade S-contrast (1 = neutral)
    'textureDriftX',
    'textureDriftY',
    'skyDriftX',
    'skyDriftY',
    'paletteOffsetAnimation',
    'heightPaletteShiftAnimation',
    'lightAngleAnimation',
    'textureDriftAnimation',
    'skyReflectionDriftAnimation',
    'phaseColoringAnimation',
    'varnishAnimation',
    'microBumpAnimation',
    'displacementAnimation',
    'tessellationAnimation',
    'aaSampleIndex',              // current AA sample (per-pixel accumulation gate)
    'antialiasLevel',             // max AA samples (debug sample-count view)
    'aaJitterHatX',               // unit direction of the sample's jitter δc
    'aaJitterHatY',
    'aaJitterLogMag',             // ln|δc| in c units
    'aaAnalytic',                 // 1 = analytic AA expansion (raw payload bound)
    'gradeSaturation',            // display-grade saturation (1 = neutral)
    'liveShiftU',                 // sub-texel displacement of the live grid (normalised UV)
    'lnScale',                    // ln(view scale) at full precision
    'liveShiftV',
    'protrusionPhase',            // [0, 1)
    'protrusionSharpness',        // [0.25, 16]
    'protrusionGeometryMix',      // 0 iteration lobe, 1 scalar height warp
    'protrusionPeriod',           // [0.1, 16]
    ...ORBIT_TRAP_FIELDS,
    'protrusionStrength',         // iteration-profile amplification [1, 4]
    'iterationPaletteCurve',      // 0 linear, 1 soft root, 2 logarithmic, 3 quadratic
    'aaLookupOffsetY',
    'rawOriginX',                 // toroidal origin of the raw texture
    'rawOriginY',
    'orbitMetricsEnabled',        // no orbit texture reads when the payload is absent
    'presetTransition',           // texture transition blend
    'paletteScreenShiftX',        // palette cycles across the screen width
    'paletteScreenShiftY',
    'stereoEyeSlope',             // orthographic eye direction X/Z, 0 in mono
    'stereoHeightPass',           // 0 colour; >= 1: height pass with relief gain (value - 1)
    'protrusionTerrace',          // integrable lobe form: 0 bounded bumps, 1 terraces
    'castShadowStrength',         // cast shadows marched on the relief height h, [0, 1]
    'castShadowLength',           // relief exaggeration for cast shadows only, [1, 20]
    'castShadowSoftness',         // penumbra width, as a fraction of the light elevation
    'horizonOcclusionStrength',   // horizon-based ambient occlusion on the relief height h, [0, 1]
    'horizonOcclusionRadius',     // its search radius in view half-heights, [0.01, 0.5]
    'indirectLightStrength',      // indirect diffuse (sky irradiance + one relief bounce), [0, 2]
] as const

export type ColorUniformField = typeof COLOR_UNIFORM_FIELDS[number]
export type OrbitTrapUniformField = typeof ORBIT_TRAP_FIELDS[number]
/** Every field must be given: a new WGSL field cannot be forgotten by a writer. */
export type ColorUniforms = Record<ColorUniformField, number>

export const COLOR_UNIFORM_FLOAT_COUNT = COLOR_UNIFORM_FIELDS.length
export const COLOR_UNIFORM_BYTES = COLOR_UNIFORM_FLOAT_COUNT * Float32Array.BYTES_PER_ELEMENT

const INDEX = new Map<ColorUniformField, number>(COLOR_UNIFORM_FIELDS.map((field, index) => [field, index]))

export function colorUniformIndex(field: ColorUniformField): number {
    return INDEX.get(field)!
}

/** Byte offset of a field, for partial `writeBuffer` updates. */
export function colorUniformByteOffset(field: ColorUniformField): number {
    return colorUniformIndex(field) * Float32Array.BYTES_PER_ELEMENT
}

export function packColorUniforms(values: ColorUniforms): Float32Array<ArrayBuffer> {
    const data = new Float32Array(COLOR_UNIFORM_FLOAT_COUNT)
    COLOR_UNIFORM_FIELDS.forEach((field, index) => { data[index] = values[field] })
    return data
}

/**
 * Pack a run of consecutive fields starting at `first`, for one partial write.
 * Throws when the given fields are not contiguous in the layout.
 */
export function packColorUniformRun(values: Partial<ColorUniforms>): { byteOffset: number; data: Float32Array<ArrayBuffer> } {
    const indices = (Object.keys(values) as ColorUniformField[]).map(colorUniformIndex).sort((a, b) => a - b)
    const first = indices[0]
    if (indices.some((index, i) => index !== first + i)) {
        throw new Error('packColorUniformRun: fields are not contiguous')
    }
    const data = new Float32Array(indices.length)
    indices.forEach((index, i) => { data[i] = values[COLOR_UNIFORM_FIELDS[index]]! })
    return { byteOffset: first * Float32Array.BYTES_PER_ELEMENT, data }
}

/** The structured orbit-trap configuration, by field. */
export function orbitTrapUniforms(config: OrbitTrapConfig): Record<OrbitTrapUniformField, number> {
    const values = orbitTrapColorUniformValues(config)
    return Object.fromEntries(ORBIT_TRAP_FIELDS.map((field, index) => [field, values[index]])) as Record<OrbitTrapUniformField, number>
}
