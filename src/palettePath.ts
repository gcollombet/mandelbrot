import { normalizeColorStops, isStopTransferCurve, type StopTransferCurve } from './ColorStop'
import type { MandelbrotParams } from './Mandelbrot'
import { normalizeTextureMappingFromLegacy, TEXTURE_MAPPING_VARIABLE_IDS } from './TextureMapping'
import { normalizeIterationPaletteCurve, iterationPaletteCurveCode } from './IterationPaletteCurve'
import { TRANSITION_DEFAULTS } from './presetTransition'

export const PALETTE_PATH_MAX_STOPS = 64
export const PALETTE_PATH_TEXTURE_BUDGET = 128 * 1024 * 1024
// Stripe frequency and trap geometry belong to the shared orbital calculation.
// The color/material weights in colorStops remain freely interpolable.
export const PATH_GLOBAL_FIELDS = [
    'palettePeriod', 'paletteOffset', 'heightPaletteShift', 'tessellationLevel',
    'displacementAmount', 'ambientOcclusionStrength', 'microBumpStrength', 'reliefDepth',
    'protrusionPhase', 'protrusionSharpness', 'protrusionStrength', 'protrusionGeometryMix',
    'protrusionPeriod', 'localShadowStrength', 'lightAngle', 'varnishStrength',
    'gradeContrast', 'gradeSaturation', 'phaseColoringStrength',
] as const
export type PathAppearance = Pick<MandelbrotParams, 'colorStops' | 'interpolationMode'> & Partial<MandelbrotParams>
export type PalettePathStop = { id: string; magnitude: number; name: string; appearance: PathAppearance; curve: StopTransferCurve }
export type PalettePath = {
    version: 1; id: string; name: string; enabled: boolean; mode: 'global' | 'radial';
    outside: 'hold' | 'manual'; textureSize: 512 | 1024 | 2048;
    stops: PalettePathStop[];
    /** Verified resource content on an ExpMap resume. Images remain in the image library. */
    resourceHashes?: Record<string, string>;
}

export function snapshotPathAppearance(source: Partial<MandelbrotParams>): PathAppearance {
    const out: PathAppearance = {
        colorStops: normalizeColorStops(source.colorStops ?? []),
        interpolationMode: ['rgb', 'lab', 'hcl', 'hsl', 'cubehelix'].includes(source.interpolationMode ?? '') ? source.interpolationMode! : 'lab',
        paletteMirror: !!source.paletteMirror,
        iterationPaletteCurve: normalizeIterationPaletteCurve(source.iterationPaletteCurve),
        textureMapping: normalizeTextureMappingFromLegacy(source),
    }
    for (const field of PATH_GLOBAL_FIELDS) {
        const value = source[field] ?? TRANSITION_DEFAULTS[field]
        if (!Number.isFinite(value)) throw new Error(`Paramètre de palette invalide : ${field}`)
        out[field] = value
    }
    for (const field of ['textureGuid', 'textureName', 'skyboxGuid', 'skyboxName'] as const) {
        if (typeof source[field] === 'string') out[field] = source[field]
    }
    return JSON.parse(JSON.stringify(out))
}

export function validatePalettePath(value: unknown): PalettePath {
    const p = value as PalettePath
    if (!p || p.version !== 1 || typeof p.id !== 'string' || !p.id || typeof p.name !== 'string' || !p.name.trim()
        || !['global', 'radial'].includes(p.mode) || !['hold', 'manual'].includes(p.outside)
        || ![512, 1024, 2048].includes(p.textureSize) || typeof p.enabled !== 'boolean'
        || !Array.isArray(p.stops) || p.stops.length < 2 || p.stops.length > PALETTE_PATH_MAX_STOPS) throw new Error('Parcours de palettes invalide.')
    if (p.resourceHashes && (typeof p.resourceHashes !== 'object' || Object.values(p.resourceHashes).some(h => typeof h !== 'string' || !/^sha256:[a-f0-9]{64}$/.test(h)))) throw new Error('Identités des images invalides.')
    const ids = new Set<string>()
    const stops = p.stops.map((s, i) => {
        if (!s || typeof s.id !== 'string' || ids.has(s.id) || !Number.isFinite(s.magnitude)
            || Math.abs(s.magnitude) > 100000 || (i && s.magnitude - p.stops[i - 1].magnitude < 0.0001)
            || (i && Math.fround(s.magnitude - p.stops[0].magnitude) <= Math.fround(p.stops[i - 1].magnitude - p.stops[0].magnitude))
            || !isStopTransferCurve(s.curve) || typeof s.name !== 'string'
            || !s.appearance?.colorStops?.length || s.appearance.colorStops.length > 200) throw new Error('Stops invalides : profondeurs distinctes et croissantes requises.')
        ids.add(s.id)
        return { id: s.id, magnitude: s.magnitude, name: s.name, curve: s.curve, appearance: snapshotPathAppearance(s.appearance) }
    })
    return { version: 1, id: p.id, name: p.name.trim().slice(0, 100), enabled: p.enabled,
        mode: p.mode, outside: p.outside, textureSize: p.textureSize, stops,
        ...(p.resourceHashes ? { resourceHashes: { ...p.resourceHashes } } : {}),
    }
}

export function newPalettePath(source: Partial<MandelbrotParams>, magnitude: number): PalettePath {
    return { version: 1, id: crypto.randomUUID(), name: 'Nouveau parcours', enabled: false, mode: 'radial', outside: 'hold', textureSize: 1024,
        stops: [magnitude, magnitude + 1].map(depth => ({ id: crypto.randomUUID(), magnitude: depth, name: 'Palette actuelle',
            appearance: snapshotPathAppearance(source), curve: 'linear' })),
    }
}

export function pathSegment(path: PalettePath, magnitude: number): { a: number; b: number; t: number } | null {
    const stops = path.stops
    if (magnitude < stops[0].magnitude) return path.outside === 'manual' ? null : { a: 0, b: 0, t: 0 }
    if (magnitude > stops[stops.length - 1].magnitude) return path.outside === 'manual' ? null : { a: stops.length - 1, b: stops.length - 1, t: 0 }
    for (let i = 0; i < stops.length - 1; i++) {
        if (magnitude <= stops[i + 1].magnitude) return { a: i, b: i + 1, t: (magnitude - stops[i].magnitude) / (stops[i + 1].magnitude - stops[i].magnitude) }
    }
    return { a: stops.length - 1, b: stops.length - 1, t: 0 }
}

// GPU nodes: depth/curve/image layers followed by 32 appearance scalars.
export const PATH_NODE_FLOATS = 40
export function pathNodeValues(stop: PalettePathStop, tileLayer: number, skyLayer: number, skyLevels: number): number[] {
    const a = stop.appearance, mapping = normalizeTextureMappingFromLegacy(a)
    const values = [stop.magnitude, ['linear', 'gaussian', 'square', 'exponential'].indexOf(stop.curve), tileLayer, skyLayer,
        ...PATH_GLOBAL_FIELDS.map(field => a[field] ?? TRANSITION_DEFAULTS[field]),
        a.paletteMirror ? 1 : 0, iterationPaletteCurveCode(normalizeIterationPaletteCurve(a.iterationPaletteCurve)),
        TEXTURE_MAPPING_VARIABLE_IDS[mapping.xVariable], TEXTURE_MAPPING_VARIABLE_IDS[mapping.yVariable], mapping.xScale, mapping.yScale, mapping.mirrored ? 1 : 0, skyLevels]
    while (values.length < PATH_NODE_FLOATS) values.push(0)
    return values
}
