// Tilted 3D view (tilt_view.wgsl): an orthographic camera leaning over the
// relief height field of the current frame. The frame only holds what the
// top-down view computed, so the tilted view is zoomed in (`fit` < 1) until
// every ray, from the top plane z = 0 down to the floor z = -1, lands inside it.

/** interiorDepth: depth D of the interior basin (0 = flat plateau at the rim, 1 = down to the floor). */
export type TiltViewSettings = { tilt: number; heading: number; relief: number; interiorDepth?: number }

export const TILT_VIEW_MAX_DEGREES = 50
export const DEFAULT_TILT_VIEW: TiltViewSettings = { tilt: 0, heading: 0, relief: 10, interiorDepth: 1 }
/** Basin length scale per unit of depth: the slope at the rim is 1 / this (here 3). */
export const TILT_VIEW_BASIN_RADIUS_PER_DEPTH = 1 / 3

export function normalizeTiltView(value?: Partial<TiltViewSettings>): TiltViewSettings {
    const finite = (v: unknown, fallback: number) => typeof v === 'number' && Number.isFinite(v) ? v : fallback
    return {
        tilt: Math.max(0, Math.min(TILT_VIEW_MAX_DEGREES, finite(value?.tilt, 0))),
        heading: ((finite(value?.heading, 0) % 360) + 360) % 360,
        relief: Math.max(0, Math.min(40, finite(value?.relief, 10))),
        interiorDepth: Math.max(0, Math.min(1, finite(value?.interiorDepth, 1))),
    }
}

/**
 * Largest view scale k <= 1 such that, for every output corner (±aspect, ±1)·k,
 * the ground crossed from depth 0 to depth 1 (k·A + (d - 1/2)·B, the segment
 * centred on the frame) stays inside [-aspect, aspect] x [-1, 1].
 * A = sx·r + sy/cos(tilt)·e, B = tan(tilt)·e.
 */
export function tiltViewFit(aspect: number, tiltRadians: number, headingRadians: number): number {
    const e = [Math.cos(headingRadians), Math.sin(headingRadians)]
    const r = [e[1], -e[0]]
    const cos = Math.max(Math.cos(tiltRadians), 1e-3)
    const tan = Math.tan(tiltRadians)
    const bounds = [aspect, 1]
    let k = 1
    for (const sx of [-aspect, aspect]) for (const sy of [-1, 1]) {
        const a = [sx * r[0] + sy / cos * e[0], sx * r[1] + sy / cos * e[1]]
        for (const depth of [0, 1]) for (const c of [0, 1]) {
            const b = (depth - 0.5) * tan * e[c]
            if (Math.abs(a[c]) < 1e-9) continue
            // |k·a + b| <= L  with k > 0  =>  k <= (L - b·sign(a)) / |a|
            k = Math.min(k, (bounds[c] - b * Math.sign(a[c])) / Math.abs(a[c]))
        }
    }
    return Math.max(0.05, Math.min(1, k))
}

/** Uniform block of tilt_view.wgsl (12 floats). */
export function tiltViewUniforms(width: number, height: number, aspect: number, settings: TiltViewSettings): Float32Array {
    const tilt = settings.tilt * Math.PI / 180
    const heading = settings.heading * Math.PI / 180 + Math.PI / 2 // 0° = the screen's up
    return new Float32Array([
        width, height, aspect, tilt,
        Math.cos(heading), Math.sin(heading), settings.relief, tiltViewFit(aspect, tilt, heading),
        settings.interiorDepth ?? 1, (settings.interiorDepth ?? 1) * TILT_VIEW_BASIN_RADIUS_PER_DEPTH, 0, 0,
    ])
}
