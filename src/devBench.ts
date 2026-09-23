// Fixed test bench (dev builds only). Every scene of bench/scenes.json is
// rendered by the still-export path (renderStill — the app's screenshot
// render) in exact perturbation, then in each mode under test, and the modes
// are compared on the RAW iteration field (colour hides errors).
//
//   await __bench()                                        → all scenes, perturbation vs bla
//   await __bench({ scenes: ['seahorse-6'], modes: ['bla'], eps: 1e-8, repeats: 3 })
//
// Timings: orbit and table = compute time inside the reference worker; pure
// render = first dispatch → converged (renderStill.convergeMs), median of
// `repeats` renders. Speed-ups are against perturbation, render alone and
// render + table build (what one still costs when the table is not reused).
//
// Outputs land in bench/out/<runId>/ through the dev server sink:
//   <scene>/<mode>.png       the screenshot (fixed neutral look)
//   <scene>/<mode>.diff.png  failing modes only: red = inside/escaped disagreement,
//                            yellow = |Δν| > NU_TOLERANCE, blue = unfinished
//   <scene>/<mode>.nu.f32    failing modes only (or keepRaw): ν per pixel,
//                            little-endian f32, row 0 = top, −1 inside, −2 unfinished
//   report.json / report.md
//
// A mode passes with no inside/escaped disagreement with perturbation and a
// |Δν| outlier fraction within FRACTION_TOLERANCE.

import scenesFile from '../bench/scenes.json'
import type { Engine } from './Engine'
import type { ApproximationMode } from './Mandelbrot'
import { renderStill, type StillExportDeps } from './stillExport'

export type BenchScene = {
    id: string
    name: string
    regime: string
    sourcePreset: string
    cx: string
    cy: string
    scale: string
    mu: number
    maxIterationMultiplier: number
    /** Iteration target the engine must derive for this scene (asserted). */
    maxIterations: number
    /** Reference precision target, deeper than `scale`. */
    precisionBudget: string
    notes?: string
}

export type BenchFile = { version: number; size: number; look: Record<string, unknown>; scenes: BenchScene[] }

export const BENCH: BenchFile = scenesFile as BenchFile

export type BenchOptions = {
    /** Scene ids or names (default: all). */
    scenes?: string[]
    /** Modes compared with perturbation (default ['pade'], the engine default). */
    modes?: ApproximationMode[]
    eps?: number
    runId?: string
    /** Always write the ν fields and diff maps (default: failing modes only). */
    keepRaw?: boolean
    /** Renders per mode for the pure-render time (median; the first one also gives PNG and field). Default 3. */
    repeats?: number
    /** Refuse to run on a wasm package older than the Rust sources (default true). */
    requireFreshWasm?: boolean
}

/** Smooth iteration field, one value per output pixel, row 0 = top. */
export type RawField = { width: number; height: number; nu: Float32Array }
export const RAW_INSIDE = -1
export const RAW_UNFINISHED = -2

export type BenchDiff = {
    unfinished: number
    classMismatch: number
    nuOutliers: number
    nuOutlierFraction: number
    p99AbsDnu: number
    maxAbsDnu: number
}

export type BenchCaptureReport = {
    mode: string
    verdict: 'PASS' | 'FAIL'
    reasons: string[]
    shaderFlag: number
    maxIterations: number
    /** Wall time to get this scene's full reference (perturbation only; includes worker pacing). */
    referenceMs: number
    /** Worker compute time of the reference orbit (perturbation only). */
    orbitComputeMs: number
    /** Worker compute time at the instant referenceMs was taken — the same orbit prefix,
     *  so referenceMs / referenceComputeMs is the worker's pacing overhead. orbitComputeMs
     *  is read at capture time and may include the 2× headroom extension. */
    referenceComputeMs: number
    /** Worker build time of this mode's table (BLA; 0 when the mode has none). */
    tableBuildMs: number
    /** Pure render: first dispatch → converged, median over `repeats` renders. */
    renderMs: number
    renderSamplesMs: number[]
    /** perturbation renderMs / this renderMs. */
    renderSpeedup?: number
    /** perturbation renderMs / (this renderMs + tableBuildMs): break-even for one still. */
    renderWithTableSpeedup?: number
    pumps: number
    inside: number
    unfinished: number
    diff?: BenchDiff
}

export type BenchSceneReport = { id: string; name: string; regime: string; captures: BenchCaptureReport[]; error?: string }

export type BenchReport = {
    runId: string
    startedAt: string
    env: Record<string, unknown>
    eps: number
    size: number
    wallMs: number
    scenes: BenchSceneReport[]
}

export type DevBenchDeps = {
    getEngine: () => Engine | null
    getStillDeps: () => StillExportDeps | null
    /** Replace every viewer parameter by defaults + `patch` (no leftovers from the session). */
    resetParams: (patch: Record<string, unknown>) => void
    getView: () => { cx: string; cy: string; scale: string; angle: number }
    getEps: () => number
}

type EngineState = {
    orbitComputeTiming: { refId: number; ms: number }
    blaBuildTiming: { refId: number; ms: number }
    activeRef: { refId: number } | null
    stagingRef: { refId: number; orbitLen: number } | null
    currentBlaLevelCount: number
    referenceBlaReadyMaxIterations: number
    currentMaxIterations: number
    currentReferenceAvailableIter: number
    lastShaderApproxFlag: number
    clearHistoryNextFrame: boolean
}

const NU_TOLERANCE = 0.5
const FRACTION_TOLERANCE = 1e-3
const TABLE_TIMEOUT_MS = 60_000
const REFERENCE_TIMEOUT_MS = 300_000
const EXPECTED_FLAG: Partial<Record<string, number>> = { perturbation: 0, bla: 1, pade: 2 }

// A MessageChannel task is not clamped in a hidden tab (setTimeout is, to 1 s).
const macrotask = () => new Promise<void>(resolve => {
    const channel = new MessageChannel()
    channel.port1.onmessage = () => resolve()
    channel.port2.postMessage(0)
})

async function writeFile(path: string, body: BodyInit): Promise<void> {
    const response = await fetch(`/__bench/file?path=${encodeURIComponent(path)}`, { method: 'POST', body })
    if (!response.ok) throw new Error(`[bench] écriture refusée ${path} (${response.status}): ${await response.text()}`)
}

function canvasBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error('[bench] toBlob')), 'image/png'))
}

/**
 * Crop the neutral-space raw square to the output pixels (angle 0, same
 * screen→texel mapping as Engine.readIterPixel) and fold it to
 * ν = n + 1 − log2(ln|z|).
 */
function rawToField(raw: { side: number; iter: Float32Array; zx: Float32Array; zy: Float32Array }, width: number, height: number, mu: number): RawField {
    const aspect = width / height
    const extent = Math.sqrt(aspect * aspect + 1)
    const n = raw.side
    const nu = new Float32Array(width * height)
    for (let py = 0; py < height; py++) {
        const nY = ((1 - (py + 0.5) / height) * 2 - 1) / extent * 0.5 + 0.5
        const ty = Math.min(n - 1, Math.max(0, Math.floor((1 - nY) * n)))
        for (let px = 0; px < width; px++) {
            const nX = (((px + 0.5) / width) * 2 - 1) * aspect / extent * 0.5 + 0.5
            const i = ty * n + Math.min(n - 1, Math.max(0, Math.floor(nX * n)))
            const it = raw.iter[i]
            const r2 = raw.zx[i] * raw.zx[i] + raw.zy[i] * raw.zy[i]
            nu[py * width + px] = it === 0 ? RAW_INSIDE
                : it > 0 && r2 >= mu ? it + 1 - Math.log2(0.5 * Math.log(r2))
                : RAW_UNFINISHED
        }
    }
    return { width, height, nu }
}

function count(field: RawField, value: number): number {
    let n = 0
    for (const v of field.nu) if (v === value) n++
    return n
}

export function diffFields(base: RawField, other: RawField): { stats: BenchDiff; mask: Uint8Array } {
    // mask: 0 = same, 1 = |Δν| outlier, 2 = inside/escaped disagreement, 3 = unfinished
    const mask = new Uint8Array(base.nu.length)
    const diffs: number[] = []
    let unfinished = 0, classMismatch = 0, nuOutliers = 0, maxAbsDnu = 0
    for (let i = 0; i < base.nu.length; i++) {
        const a = base.nu[i], b = other.nu[i]
        if (a === RAW_UNFINISHED || b === RAW_UNFINISHED) { unfinished++; mask[i] = 3; continue }
        if ((a === RAW_INSIDE) !== (b === RAW_INSIDE)) { classMismatch++; mask[i] = 2; continue }
        if (a === RAW_INSIDE) continue
        const d = Math.abs(a - b)
        diffs.push(d)
        if (d > maxAbsDnu) maxAbsDnu = d
        if (d > NU_TOLERANCE) { nuOutliers++; mask[i] = 1 }
    }
    diffs.sort((x, y) => x - y)
    const p99AbsDnu = diffs.length ? diffs[Math.min(diffs.length - 1, Math.floor(diffs.length * 0.99))] : 0
    return {
        stats: { unfinished, classMismatch, nuOutliers, nuOutlierFraction: nuOutliers / Math.max(1, diffs.length), p99AbsDnu, maxAbsDnu },
        mask,
    }
}

function maskCanvas(base: HTMLCanvasElement, mask: Uint8Array): HTMLCanvasElement {
    const canvas = document.createElement('canvas')
    canvas.width = base.width
    canvas.height = base.height
    const ctx = canvas.getContext('2d')!
    const src = base.getContext('2d')!.getImageData(0, 0, base.width, base.height).data
    const image = ctx.createImageData(base.width, base.height)
    const colors: Record<number, [number, number, number]> = { 1: [255, 220, 0], 2: [255, 0, 0], 3: [0, 160, 255] }
    for (let i = 0; i < mask.length; i++) {
        const o = i * 4
        const c = colors[mask[i]]
        const grey = (src[o] + src[o + 1] + src[o + 2]) / 3 * 0.35
        image.data[o] = c ? c[0] : grey
        image.data[o + 1] = c ? c[1] : grey
        image.data[o + 2] = c ? c[2] : grey
        image.data[o + 3] = 255
    }
    ctx.putImageData(image, 0, 0)
    return canvas
}

function markdown(report: BenchReport): string {
    const lines = [
        `# Banc ${report.runId}`,
        '',
        `wasm \`${String(report.env.wasmSha256).slice(0, 12)}\` (build ${report.env.wasmBuiltAt}) · git \`${report.env.gitHead}\`${report.env.gitDirty ? ' (modifié)' : ''} · ε=${report.eps} · ${report.size}×${report.size} · ${(report.wallMs / 1000).toFixed(1)} s`,
        '',
        'Orbite / table : temps de calcul dans le worker. Rendu pur : premier dispatch → convergence, médiane. Accélérations vs perturbation.',
        '',
        '| Scène | Mode | Verdict | maxIter | Orbite ms | Table ms | Rendu pur ms | × rendu | × rendu+table | Intérieur | Désaccords classe | Δν > 0,5 | p99 Δν | max Δν |',
        '|---|---|---|---|---|---|---|---|---|---|---|---|---|---|',
    ]
    for (const s of report.scenes) {
        if (s.error) { lines.push(`| ${s.name} | — | ERREUR : ${s.error} | | | | | | | | | | | |`); continue }
        for (const c of s.captures) {
            const d = c.diff
            lines.push(`| ${s.name} | ${c.mode} | ${c.verdict}${c.reasons.length ? ' — ' + c.reasons.join(' ; ') : ''} | ${c.maxIterations} | ${c.orbitComputeMs ? Math.round(c.orbitComputeMs) : ''} | ${c.tableBuildMs ? Math.round(c.tableBuildMs) : ''} | ${c.renderMs.toFixed(1)} | ${c.renderSpeedup ? c.renderSpeedup.toFixed(2) : ''} | ${c.renderWithTableSpeedup ? c.renderWithTableSpeedup.toFixed(2) : ''} | ${c.inside} | ${d ? d.classMismatch : ''} | ${d ? (d.nuOutlierFraction * 100).toFixed(3) + ' %' : ''} | ${d ? d.p99AbsDnu.toExponential(1) : ''} | ${d ? d.maxAbsDnu.toExponential(1) : ''} |`)
        }
    }
    return lines.join('\n') + '\n'
}

export function createDevBench(deps: DevBenchDeps) {
    function ready(): { engine: Engine; state: EngineState; stillDeps: StillExportDeps } {
        const engine = deps.getEngine()
        const stillDeps = deps.getStillDeps()
        if (!engine || !stillDeps) throw new Error('[bench] viewer not ready')
        return { engine, state: engine as unknown as EngineState, stillDeps }
    }

    /** The app's screenshot render, plus a raw-field readback once converged. */
    async function screenshot(size: number, mu: number, withRaw: boolean): Promise<{ canvas: HTMLCanvasElement; raw?: RawField; pumps: number; convergeMs: number }> {
        const { engine, state, stillDeps } = ready()
        let raw: RawField | undefined
        state.clearHistoryNextFrame = true
        const result = await renderStill(stillDeps, {
            location: deps.getView(),
            width: size,
            height: size,
            aaSamples: 1,
            magnificationThreshold: 16,
            onTileConverged: withRaw ? async () => { raw = rawToField(await engine.readRawField(), size, size, Math.max(4, mu)) } : undefined,
        })
        return { canvas: result.canvas, raw, pumps: result.totalPumps, convergeMs: result.convergeMs }
    }

    /**
     * Arrive at the scene's view the way a user does before a screenshot: one
     * draw sends the view to the worker, then wait (no rAF: worker messages
     * only) until an orbit reaching maxIter exists for it, staged or active.
     * The worker may first publish a short orbit at the view centre (it
     * escapes early) before recentring: that one must not be rendered.
     * renderStill's first draw promotes a staged orbit.
     */
    async function waitReference(state: EngineState, refBefore: number): Promise<{ wallMs: number; computeMs: number }> {
        const { stillDeps } = ready()
        const t0 = performance.now()
        await stillDeps.controller.drawOnce()
        const full = () =>
            (state.stagingRef !== null && state.stagingRef.refId > refBefore && state.stagingRef.orbitLen >= state.currentMaxIterations)
            || (state.stagingRef === null && (state.activeRef?.refId ?? 0) > refBefore && state.currentReferenceAvailableIter >= state.currentMaxIterations)
        while (!full()) {
            if (performance.now() - t0 > REFERENCE_TIMEOUT_MS) throw new Error(`[bench] référence non construite après ${REFERENCE_TIMEOUT_MS} ms`)
            await macrotask()
        }
        return { wallMs: performance.now() - t0, computeMs: state.orbitComputeTiming.ms }
    }

    /**
     * A BLA table accepted after the mode switch (`previous` = the timing
     * record before it) for the ACTIVE reference; the worker message is
     * handled without rAF. Returns the worker build time.
     */
    async function waitTable(state: EngineState, previous: EngineState['blaBuildTiming']): Promise<number> {
        const t0 = performance.now()
        const fresh = () => state.blaBuildTiming !== previous && state.blaBuildTiming.refId === state.activeRef?.refId
        while (!(fresh() && state.currentBlaLevelCount > 0 && state.referenceBlaReadyMaxIterations >= state.currentMaxIterations)) {
            if (performance.now() - t0 > TABLE_TIMEOUT_MS) throw new Error(`[bench] table BLA absente après ${TABLE_TIMEOUT_MS} ms`)
            await macrotask()
        }
        return state.blaBuildTiming.ms
    }

    async function bench(options: BenchOptions = {}): Promise<BenchReport> {
        const t0 = performance.now()
        const env = await (await fetch('/__bench/env')).json() as Record<string, unknown>
        if (env.wasmStale && (options.requireFreshWasm ?? true)) {
            throw new Error(`[bench] wasm périmé ou absent (build ${env.wasmBuiltAt}, sources Rust ${env.rustSrcModifiedAt}) : `
                + 'reconstruire reference_calculus/pkg (wasm-pack build) et vérifier le lien node_modules/mandelbrot')
        }
        const size = BENCH.size
        const eps = options.eps ?? deps.getEps()
        const runId = options.runId ?? new Date().toISOString().replace(/[:.]/g, '-')
        const modes = (options.modes ?? ['pade']).filter(m => m !== 'perturbation')
        const selected = BENCH.scenes
            .map((scene, index) => ({ scene, index }))
            .filter(({ scene }) => !options.scenes || options.scenes.includes(scene.id) || options.scenes.includes(scene.name))
        if (!selected.length) throw new Error('[bench] aucune scène sélectionnée')
        const report: BenchReport = { runId, startedAt: new Date().toISOString(), env, eps, size, wallMs: 0, scenes: [] }

        for (const { scene, index } of selected) {
            const dir = `${runId}/${String(index + 1).padStart(2, '0')}-${scene.name}`.replace(/[^\w./-]/g, '_')
            const sceneReport: BenchSceneReport = { id: scene.id, name: scene.name, regime: scene.regime, captures: [] }
            report.scenes.push(sceneReport)
            try {
                const { state } = ready()
                const before = deps.getView()
                const sameView = before.cx === scene.cx && before.cy === scene.cy && before.scale === scene.scale
                const refBefore = state.activeRef?.refId ?? 0
                const params = {
                    ...BENCH.look,
                    cx: scene.cx, cy: scene.cy, scale: scene.scale, mu: scene.mu,
                    maxIterationMultiplier: scene.maxIterationMultiplier,
                    precisionBudget: scene.precisionBudget,
                    blaEpsilon: eps,
                }
                deps.resetParams({ ...params, approximationMode: 'perturbation' })
                await macrotask()
                const reference = sameView ? { wallMs: 0, computeMs: 0 } : await waitReference(state, refBefore)
                const referenceMs = reference.wallMs

                const repeats = Math.max(1, options.repeats ?? 3)
                const shots: Record<string, { canvas: HTMLCanvasElement; raw: RawField }> = {}
                const shoot = async (mode: ApproximationMode): Promise<BenchCaptureReport> => {
                    let tableBuildMs = 0
                    if (mode !== 'perturbation') {
                        const previousTable = state.blaBuildTiming
                        deps.resetParams({ ...params, approximationMode: mode })
                        await macrotask()
                        tableBuildMs = await waitTable(state, previousTable)
                    }
                    const first = await screenshot(size, scene.mu, true)
                    if (!first.raw) throw new Error('[bench] champ brut manquant')
                    const samples = [first.convergeMs]
                    for (let r = 1; r < repeats; r++) samples.push((await screenshot(size, scene.mu, false)).convergeMs)
                    const sorted = [...samples].sort((x, y) => x - y)
                    shots[mode] = { canvas: first.canvas, raw: first.raw }
                    await writeFile(`${dir}/${mode}.png`, await canvasBlob(first.canvas))
                    if (options.keepRaw) await writeFile(`${dir}/${mode}.nu.f32`, new Blob([first.raw.nu.buffer as ArrayBuffer]))
                    const reasons: string[] = []
                    const expected = EXPECTED_FLAG[mode]
                    if (expected !== undefined && state.lastShaderApproxFlag !== expected) reasons.push(`flag shader ${state.lastShaderApproxFlag} ≠ ${expected} (mode non appliqué)`)
                    const unfinished = count(first.raw, RAW_UNFINISHED)
                    if (unfinished) reasons.push(`${unfinished} pixels non terminés`)
                    const orbit = state.orbitComputeTiming
                    const entry: BenchCaptureReport = {
                        mode, verdict: 'PASS', reasons, shaderFlag: state.lastShaderApproxFlag,
                        maxIterations: state.currentMaxIterations,
                        referenceMs: mode === 'perturbation' ? referenceMs : 0,
                        orbitComputeMs: mode === 'perturbation' && orbit.refId === state.activeRef?.refId ? orbit.ms : 0,
                        referenceComputeMs: mode === 'perturbation' ? reference.computeMs : 0,
                        tableBuildMs,
                        renderMs: sorted[Math.floor(sorted.length / 2)],
                        renderSamplesMs: samples,
                        pumps: first.pumps,
                        inside: count(first.raw, RAW_INSIDE), unfinished,
                    }
                    sceneReport.captures.push(entry)
                    return entry
                }

                const base = await shoot('perturbation')
                // The still must have been rendered on this scene's orbit.
                if (!sameView && (state.activeRef?.refId ?? 0) <= refBefore) base.reasons.push('référence non renouvelée')
                if (state.stagingRef) base.reasons.push('référence encore en construction après le rendu')
                if (state.currentReferenceAvailableIter < state.currentMaxIterations) base.reasons.push(`orbite de référence courte (${state.currentReferenceAvailableIter} < ${state.currentMaxIterations})`)
                if (base.maxIterations !== scene.maxIterations) base.reasons.push(`maxIter ${base.maxIterations} ≠ ${scene.maxIterations} attendu`)
                base.verdict = base.reasons.length ? 'FAIL' : 'PASS'

                for (const mode of modes) {
                    const entry = await shoot(mode)
                    entry.renderSpeedup = base.renderMs / entry.renderMs
                    entry.renderWithTableSpeedup = base.renderMs / (entry.renderMs + entry.tableBuildMs)
                    const { stats, mask } = diffFields(shots.perturbation.raw, shots[mode].raw)
                    entry.diff = stats
                    if (stats.classMismatch) entry.reasons.push(`${stats.classMismatch} désaccords intérieur/extérieur`)
                    if (stats.nuOutlierFraction > FRACTION_TOLERANCE) entry.reasons.push(`Δν > ${NU_TOLERANCE} sur ${(stats.nuOutlierFraction * 100).toFixed(3)} %`)
                    entry.verdict = entry.reasons.length ? 'FAIL' : 'PASS'
                    if (entry.verdict === 'FAIL' || options.keepRaw) {
                        await writeFile(`${dir}/${mode}.diff.png`, await canvasBlob(maskCanvas(shots.perturbation.canvas, mask)))
                        if (!options.keepRaw) {
                            await writeFile(`${dir}/perturbation.nu.f32`, new Blob([shots.perturbation.raw.nu.buffer as ArrayBuffer]))
                            await writeFile(`${dir}/${mode}.nu.f32`, new Blob([shots[mode].raw.nu.buffer as ArrayBuffer]))
                        }
                    }
                }
            } catch (error) {
                sceneReport.error = error instanceof Error ? error.message : String(error)
            }
            const summary = sceneReport.error ?? sceneReport.captures.map(c => `${c.mode} ${c.verdict} ${c.renderMs.toFixed(1)} ms${c.renderSpeedup ? ` ×${c.renderSpeedup.toFixed(2)}` : ''}`).join(' · ')
            console.info(`[bench] ${scene.name}: ${summary}`)
        }
        report.wallMs = performance.now() - t0
        await writeFile(`${runId}/report.json`, JSON.stringify(report, null, 2))
        await writeFile(`${runId}/report.md`, markdown(report))
        console.info(`[bench] ${(report.wallMs / 1000).toFixed(1)} s → bench/out/${runId}/report.md`)
        return report
    }

    return { bench }
}
