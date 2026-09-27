// ── Render mode: interactive, or one export session ──
//
// The engine is either interactive (`session === null`) or running exactly
// one export session. Everything an export pins or overrides lives in the
// session value and disappears with it: the surface size, the HDR target, the
// AA budget per frame, the real-time settings to restore, the parked
// interactive loop, and the layout of the working grids:
//
//   direct  — one full surface (films, stills);
//   tiled   — a keyframe built tile by tile (films larger than the GPU);
//   expmap  — isolated blocks of an exponential map, one projection each.
//
// The policies below are pure: they decide from explicit inputs and never
// touch the GPU, so they are testable without an engine.

import type {ExpmapKernelProjection} from './expmap/producerProjection'
import type {RenderOptions} from './Engine'
import type {ApproximationMode} from './Mandelbrot'
import type {KeyframeTile, KeyframeTilePlan} from './tiledKeyframeExport'
import {estimateGpuWorkingSetBytes, fitSurfaceToGpuBudget} from './gpuCompatibility'
import {neutralSizeFor} from './viewGrids'
import {t} from './i18n'

/** Real-time values an export overrides, restored when it ends. */
export type RealtimeSettings = {
    zoomMagnificationThreshold: number
    dprMultiplier: number
    targetFps: number
    aaAuto: boolean
}

export type TiledLayout = {
    kind: 'tiled'
    plan: KeyframeTilePlan
    tileIndex: number
    /** Every tile of the current keyframe has converged. */
    complete: boolean
    /** The camera path rotates: tiles cover the circumscribed disc. */
    rotating: boolean
}

export type ExpmapLayout = {
    kind: 'expmap'
    /** Current block (uniforms copied, the caller may reuse its buffer). */
    projection: ExpmapKernelProjection
    appearance: RenderOptions
    /** Numerics the first block replaced with the recipe's, restored at the end. */
    savedNumerics: { mode: ApproximationMode; epsilon: number; skip: number; precision: string }
}

export type ExportLayout = { kind: 'direct' } | TiledLayout | ExpmapLayout

export type ExportSession = {
    /** Pinned compute surface (output × supersample). */
    surface: { width: number; height: number }
    hdr: boolean
    /** Jittered AA samples accumulated per exported frame. 1 = off. */
    aaSamples: number
    restore: RealtimeSettings
    /** Interactive draw callback parked for the duration of the export. */
    parkedDrawFn: (() => Promise<void>) | null
    layout: ExportLayout
}

export type ExportSessionSettings = {
    outputWidth: number
    outputHeight: number
    supersample: number
    magnificationThreshold: number
    batchTargetFps: number
    hdr?: boolean
    aaSamplesPerFrame?: number
    tiledKeyframePlan?: KeyframeTilePlan | null
    /** Camera angle interval of the path; meaningful with a tiled plan only. */
    angleRange?: { from: number; to: number }
}

export type ExportDevice = {
    maxTextureDimension: number
    gpuMemoryBudgetBytes: number
    orbitMetrics: boolean
    orbitTrap: boolean
}

/**
 * Check an export request against the device before anything is allocated.
 *
 * Only the degenerate threshold is refused: it governs how often a full
 * reconvergence is paid (the main lever on export speed), not sampling
 * density, so a high value is the caller's trade-off. The interactive path
 * clamps an oversized surface; an export must not, because silently shrinking
 * would change the film's resolution: refuse with the numbers instead. Over
 * the heuristic memory budget the export is still allowed (`overBudget`), the
 * real capacity is checked by the scoped allocation.
 */
export function validateExportSettings(settings: ExportSessionSettings, device: ExportDevice): {
    side: number
    estimatedBytes: number
    overBudget: boolean
} {
    if (!(settings.magnificationThreshold > 1)) {
        throw new Error(t('engine.export.thresholdTooLow'))
    }
    const surfaceWidth = settings.outputWidth * settings.supersample
    const surfaceHeight = settings.outputHeight * settings.supersample
    const side = neutralSizeFor(surfaceWidth, surfaceHeight)
    if (side > device.maxTextureDimension) {
        throw new Error(t('engine.export.surfaceTooLarge', {
            width: settings.outputWidth, height: settings.outputHeight, supersample: settings.supersample,
            side, maxDim: device.maxTextureDimension,
        }))
    }
    if (settings.tiledKeyframePlan) {
        if ((settings.aaSamplesPerFrame ?? 1) !== 1) {
            throw new Error(t('engine.export.tiledNoJitterAa'))
        }
        if (settings.tiledKeyframePlan.neutralSide !== side) {
            throw new Error(t('engine.export.tiledPlanMismatch', { planSide: settings.tiledKeyframePlan.neutralSide, side }))
        }
    }
    const estimatedBytes = settings.tiledKeyframePlan?.estimate.totalBytes
        ?? estimateGpuWorkingSetBytes({
            width: surfaceWidth,
            height: surfaceHeight,
            orbitMetrics: device.orbitMetrics,
            orbitTrap: device.orbitTrap,
        })
    return { side, estimatedBytes, overBudget: estimatedBytes > device.gpuMemoryBudgetBytes }
}

export function createExportSession(
    settings: ExportSessionSettings,
    restore: RealtimeSettings,
    parkedDrawFn: (() => Promise<void>) | null,
): ExportSession {
    const plan = settings.tiledKeyframePlan ?? null
    return {
        surface: {
            width: settings.outputWidth * settings.supersample,
            height: settings.outputHeight * settings.supersample,
        },
        hdr: settings.hdr ?? false,
        aaSamples: Math.max(1, Math.round(settings.aaSamplesPerFrame ?? 1)),
        restore,
        parkedDrawFn,
        layout: plan
            ? {
                kind: 'tiled',
                plan,
                tileIndex: 0,
                complete: false,
                rotating: !!settings.angleRange
                    && Math.abs(settings.angleRange.to - settings.angleRange.from) > 1e-12,
            }
            : { kind: 'direct' },
    }
}

/** Tile being built, null once the keyframe is complete. */
export function currentTile(layout: TiledLayout): KeyframeTile | null {
    return layout.complete ? null : layout.plan.tiles[layout.tileIndex] ?? null
}

/** The current tile converged: move to the next one, or complete the keyframe. */
export function advanceTile(layout: TiledLayout): 'nextTile' | 'keyframeComplete' {
    if (layout.tileIndex + 1 >= layout.plan.tiles.length) {
        layout.complete = true
        return 'keyframeComplete'
    }
    layout.tileIndex++
    return 'nextTile'
}

/** Start building the next keyframe from its first tile. */
export function restartKeyframe(layout: TiledLayout): void {
    layout.tileIndex = 0
    layout.complete = false
}

export type SurfaceInput = {
    cssWidth: number
    cssHeight: number
    devicePixelRatio: number
    maxTextureDimension: number
    gpuMemoryBudgetBytes: number
    orbitMetrics: boolean
    orbitTrap: boolean
    /** Active export: its pinned surface and, when tiled, the plan's estimate. */
    session: { surface: { width: number; height: number }; tiledEstimateBytes?: number } | null
}

export type SurfaceFit = {
    width: number
    height: number
    /** The interactive surface was reduced to fit the memory budget. */
    reduced: boolean
    scale: number
    estimatedBytes: number
}

/**
 * Physical compute surface.
 *
 * An export pins it to the film's geometry: following the window would make
 * the "threshold ≤ supersample" guarantee about the window, and the same
 * parcours not reproducible across window sizes. It also keeps the requested
 * resolution above the heuristic budget. The interactive surface follows the
 * canvas and is reduced to fit the budget.
 *
 * Every working texture is a SQUARE of the surface diagonal: past the device
 * limit WebGPU does not throw, it returns an invalid texture and renders
 * black. The surface is shrunk instead, keeping its aspect ratio.
 */
export function resolveSurface(input: SurfaceInput): SurfaceFit {
    let width = input.session
        ? Math.max(1, Math.round(input.session.surface.width))
        : Math.max(1, Math.round(input.cssWidth * input.devicePixelRatio))
    let height = input.session
        ? Math.max(1, Math.round(input.session.surface.height))
        : Math.max(1, Math.round(input.cssHeight * input.devicePixelRatio))
    const maxDim = input.maxTextureDimension
    width = Math.min(width, maxDim)
    height = Math.min(height, maxDim)
    const diagonal = neutralSizeFor(width, height)
    if (diagonal > maxDim) {
        const shrink = maxDim / diagonal
        width = Math.max(8, Math.floor(width * shrink))
        height = Math.max(8, Math.floor(height * shrink))
    }
    const memoryOptions = { width, height, orbitMetrics: input.orbitMetrics, orbitTrap: input.orbitTrap }
    if (input.session) {
        return {
            width,
            height,
            reduced: false,
            scale: 1,
            estimatedBytes: input.session.tiledEstimateBytes ?? estimateGpuWorkingSetBytes(memoryOptions),
        }
    }
    const fit = fitSurfaceToGpuBudget(memoryOptions, input.gpuMemoryBudgetBytes)
    return fit.reduced
        ? { width: fit.width, height: fit.height, reduced: true, scale: fit.scale, estimatedBytes: fit.estimatedBytes }
        : { width, height, reduced: false, scale: fit.scale, estimatedBytes: fit.estimatedBytes }
}
