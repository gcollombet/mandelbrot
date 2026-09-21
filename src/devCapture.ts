// Console tooling (dev builds only): deterministic still captures for A/B
// tests between the exact perturbation and the BLA kernel paths.
//
//   __capture({ mode: 'bla', eps: 1e-8 })            → one still, returns { canvas, dataUrl, ... }
//   __compare({ eps: 1e-8, width: 1024, height: 576 }) → exact vs BLA at the current view,
//                                                        returns the diff statistics and
//                                                        downloads exact / bla / diff PNGs
//
// A capture drives the engine's export session (renderStill), so it only
// returns once every pixel has converged; in BLA mode it also waits for the
// block table of the current reference before rendering.

import type { Engine } from './Engine'
import type { ApproximationMode } from './Mandelbrot'
import { renderStill, type StillExportDeps } from './stillExport'

export type CaptureOptions = {
    mode?: ApproximationMode
    eps?: number
    width?: number
    height?: number
    aa?: number
    download?: boolean
    /** Table wait limit in ms (BLA mode). */
    timeoutMs?: number
}

export type CaptureResult = {
    canvas: HTMLCanvasElement
    dataUrl: string
    mode: ApproximationMode
    eps: number
    pumps: number
    ms: number
    /** Mode flag the shader actually received on the last frame (0 exact, 1 BLA). */
    shaderFlag: number
    blaLevels: number
}

export type CompareOptions = Omit<CaptureOptions, 'mode'> & {
    /** Per-channel difference (0..255) above which a pixel counts as different. */
    threshold?: number
}

export type CompareResult = {
    exact: CaptureResult
    bla: CaptureResult
    diff: HTMLCanvasElement
    differing: number
    total: number
    fraction: number
}

export type DevCaptureDeps = {
    getEngine: () => Engine | null
    getStillDeps: () => StillExportDeps | null
    getLocation: () => { cx: string; cy: string; scale: string; angle: number }
    getMode: () => ApproximationMode
    getEps: () => number
    setMode: (mode: ApproximationMode) => void
    setEps: (eps: number) => void
    download: (canvas: HTMLCanvasElement, suffix: string) => Promise<void>
    magnificationThreshold: () => number
}

type EngineState = {
    currentBlaLevelCount: number
    referenceBlaReadyMaxIterations: number
    currentMaxIterations: number
    currentReferenceAvailableIter: number
    lastShaderApproxFlag: number
    pendingRefActive: boolean
}

function engineState(engine: Engine): EngineState {
    return engine as unknown as EngineState
}

const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms))

async function waitForReference(engine: Engine, mode: ApproximationMode, timeoutMs: number): Promise<void> {
    const t0 = performance.now()
    for (;;) {
        const s = engineState(engine)
        const orbitReady = !s.pendingRefActive && s.currentReferenceAvailableIter >= s.currentMaxIterations
        const tableReady = mode !== 'bla'
            || (s.currentBlaLevelCount > 0 && s.referenceBlaReadyMaxIterations >= s.currentMaxIterations)
        if (orbitReady && tableReady) return
        if (performance.now() - t0 > timeoutMs) {
            throw new Error(`[capture] référence non prête après ${Math.round(timeoutMs)} ms `
                + `(orbite ${s.currentReferenceAvailableIter}/${s.currentMaxIterations}, `
                + `table ${s.referenceBlaReadyMaxIterations}, niveaux ${s.currentBlaLevelCount})`)
        }
        await sleep(100)
    }
}

export function createDevCapture(deps: DevCaptureDeps) {
    async function capture(options: CaptureOptions = {}): Promise<CaptureResult> {
        const engine = deps.getEngine()
        const stillDeps = deps.getStillDeps()
        if (!engine || !stillDeps) throw new Error('[capture] viewer not ready')
        const mode = options.mode ?? deps.getMode()
        const eps = options.eps ?? deps.getEps()
        const width = options.width ?? 1024
        const height = options.height ?? 576
        if (mode !== deps.getMode()) deps.setMode(mode)
        if (eps !== deps.getEps()) deps.setEps(eps)
        // Let the watchers post the mode / ε to the worker before polling.
        await sleep(50)
        await waitForReference(engine, mode, options.timeoutMs ?? 120_000)
        const t0 = performance.now()
        const result = await renderStill(stillDeps, {
            location: deps.getLocation(),
            width,
            height,
            aaSamples: options.aa ?? 1,
            magnificationThreshold: deps.magnificationThreshold(),
        })
        const ms = performance.now() - t0
        const s = engineState(engine)
        const out: CaptureResult = {
            canvas: result.canvas,
            dataUrl: result.canvas.toDataURL('image/png'),
            mode,
            eps,
            pumps: result.totalPumps,
            ms,
            shaderFlag: s.lastShaderApproxFlag,
            blaLevels: s.currentBlaLevelCount,
        }
        console.info(`[capture] ${mode} ε=${eps} ${width}×${height} flag=${out.shaderFlag} levels=${out.blaLevels} pumps=${out.pumps} ${Math.round(ms)} ms`)
        if (options.download) await deps.download(result.canvas, `${mode}-${width}x${height}`)
        return out
    }

    function diffCanvases(a: HTMLCanvasElement, b: HTMLCanvasElement, threshold: number): { diff: HTMLCanvasElement; differing: number; total: number } {
        const width = Math.min(a.width, b.width)
        const height = Math.min(a.height, b.height)
        const read = (c: HTMLCanvasElement) => {
            const ctx = c.getContext('2d')
            if (!ctx) throw new Error('[capture] canvas 2D indisponible')
            return ctx.getImageData(0, 0, width, height).data
        }
        const pa = read(a)
        const pb = read(b)
        const diff = document.createElement('canvas')
        diff.width = width
        diff.height = height
        const ctx = diff.getContext('2d')
        if (!ctx) throw new Error('[capture] canvas 2D indisponible')
        const image = ctx.createImageData(width, height)
        let differing = 0
        for (let i = 0; i < width * height; i++) {
            const o = i * 4
            const d = Math.max(Math.abs(pa[o] - pb[o]), Math.abs(pa[o + 1] - pb[o + 1]), Math.abs(pa[o + 2] - pb[o + 2]))
            const hit = d > threshold
            if (hit) differing++
            // Grey = exact render dimmed; red = differing pixel.
            const grey = (pa[o] + pa[o + 1] + pa[o + 2]) / 3 * 0.35
            image.data[o] = hit ? 255 : grey
            image.data[o + 1] = hit ? 0 : grey
            image.data[o + 2] = hit ? 0 : grey
            image.data[o + 3] = 255
        }
        ctx.putImageData(image, 0, 0)
        return { diff, differing, total: width * height }
    }

    async function compare(options: CompareOptions = {}): Promise<CompareResult> {
        const download = options.download ?? true
        const initialMode = deps.getMode()
        const initialEps = deps.getEps()
        try {
            const exact = await capture({ ...options, mode: 'perturbation', download })
            const bla = await capture({ ...options, mode: 'bla', download })
            const { diff, differing, total } = diffCanvases(exact.canvas, bla.canvas, options.threshold ?? 8)
            const fraction = differing / Math.max(1, total)
            console.info(`[compare] ε=${bla.eps} pixels différents: ${differing}/${total} (${(fraction * 100).toFixed(2)} %)`)
            if (download) await deps.download(diff, `diff-${diff.width}x${diff.height}`)
            return { exact, bla, diff, differing, total, fraction }
        } finally {
            deps.setMode(initialMode)
            deps.setEps(initialEps)
        }
    }

    return { capture, compare }
}
