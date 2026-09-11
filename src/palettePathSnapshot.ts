import { rgb } from 'd3-color'
import { Palette } from './Palette'
import { applyStopTransferCurve, type ColorStop } from './ColorStop'
import { EFFECT_FIELD_NAMES } from './effectFieldConfig'
import type { MandelbrotParams } from './Mandelbrot'
import { PATH_GLOBAL_FIELDS, pathSegment, snapshotPathAppearance, validatePalettePath, type PalettePath } from './palettePath'
import type { PaletteRecord } from './paletteStore'

/** Editable approximation of the GPU's palette rows, including every material field. */
export function snapshotPalettePath(path: PalettePath, magnitude: number, manual: Partial<MandelbrotParams>): PaletteRecord {
    if (!Number.isFinite(magnitude)) throw new Error('Magnitude de capture invalide.')
    const checked = validatePalettePath(path)
    const segment = checked.enabled ? pathSegment(checked, magnitude) : null
    const shared = { orbitTrap: manual.orbitTrap, orbitTrapStrength: manual.orbitTrapStrength, stripeFrequency: manual.stripeFrequency }
    const name = `${checked.name} · ${magnitude.toFixed(3)}`
    if (!segment) return { ...shared, ...snapshotPathAppearance(manual), name }
    const a = checked.stops[segment.a].appearance, b = checked.stops[segment.b].appearance
    const t = applyStopTransferCurve(checked.stops[segment.a].curve, segment.t)
    if (t === 0 || t === 1) return { ...shared, ...snapshotPathAppearance(t === 0 ? a : b), name }
    // Discrete controls switch at 50%, just like path_choice in color.wgsl.
    const out: PaletteRecord = { ...shared, ...snapshotPathAppearance(t < 0.5 ? a : b), name, interpolationMode: 'rgb' }
    const lerp = (x: number, y: number) => x + (y - x) * t
    for (const field of PATH_GLOBAL_FIELDS) out[field] = lerp(a[field]!, b[field]!)
    out.textureMapping = { ...out.textureMapping!, xScale: lerp(a.textureMapping!.xScale, b.textureMapping!.xScale), yScale: lerp(a.textureMapping!.yScale, b.textureMapping!.yScale) }
    const pa = new Palette(a.colorStops, a.interpolationMode), pb = new Palette(b.colorStops, b.interpolationMode)
    const mixColor = (x: string, y: string) => {
        const ca = rgb(x), cb = rgb(y)
        return rgb(lerp(ca.r, cb.r), lerp(ca.g, cb.g), lerp(ca.b, cb.b)).formatHex()
    }
    // Keep the ordinary palette/path 200-stop contract. Source knots take priority
    // when possible; regular samples preserve nonlinear color spaces and curves.
    const knots = [...new Set([0, 1, ...a.colorStops.map(s => s.position), ...b.colorStops.map(s => s.position)])].sort((x, y) => x - y)
    const positions = knots.length <= 200 ? knots : Array.from({ length: 200 }, (_, i) => i / 199)
    while (positions.length < 200) {
        let gap = 0
        for (let i = 1; i < positions.length - 1; i++) if (positions[i + 1] - positions[i] > positions[gap + 1] - positions[gap]) gap = i
        positions.splice(gap + 1, 0, (positions[gap] + positions[gap + 1]) / 2)
    }
    out.colorStops = positions.map(position => {
        const stop: ColorStop = { position, color: mixColor(pa.getColorAt(position), pb.getColorAt(position)), transferCurve: 'linear' }
        for (const field of EFFECT_FIELD_NAMES) stop[field] = lerp(pa.getEffectAt(position, field), pb.getEffectAt(position, field))
        const ia = pa.getIridescenceAt(position), ib = pb.getIridescenceAt(position)
        stop.iridescenceColor = mixColor(ia.color, ib.color)
        stop.iridescencePower = lerp(ia.strength, ib.strength)
        return stop
    })
    return JSON.parse(JSON.stringify(out))
}

/** Match the shader's premultiplied tile blend and linear-light sky blend. */
export function mixSnapshotPixels(a: Uint8ClampedArray, b: Uint8ClampedArray, t: number, sky: boolean): Uint8ClampedArray {
    const out = new Uint8ClampedArray(a.length)
    const linear = (v: number) => v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
    const srgb = (v: number) => v <= 0.0031308 ? v * 12.92 : 1.055 * v ** (1 / 2.4) - 0.055
    for (let i = 0; i < a.length; i += 4) {
        const alpha = (a[i + 3] * (1 - t) + b[i + 3] * t) / 255
        for (let c = 0; c < 3; c++) out[i + c] = sky
            ? 255 * srgb(linear(a[i + c] / 255) * (1 - t) + linear(b[i + c] / 255) * t)
            : (a[i + c] * a[i + 3] * (1 - t) + b[i + c] * b[i + 3] * t) / Math.max(alpha * 255, 1e-8)
        out[i + 3] = sky ? 255 : alpha * 255
    }
    return out
}
