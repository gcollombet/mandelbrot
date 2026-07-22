import {MandelbrotNavigator} from 'mandelbrot'
import {memory as wasmMemory} from 'mandelbrot/mandelbrot_bg.wasm'
import type {ApproximationMode} from './Engine'

type ResetMessage = {
    type: 'reset'
    jobId: number
    cx: string
    cy: string
    scale: string
    angle: number
    approximationMode: ApproximationMode
    blaEpsilon: number
    gateEmission?: boolean
    dynamicBlockValidity?: boolean
    incrementalReferenceTable?: boolean
    maxBlaSkip: number
    maxIterations: number
    // Fixed precision budget as a target scale (e.g. "1e-30"). Sets the navigator's
    // descending-profile precision ahead of time; a budget change arrives as a fresh reset.
    precisionBudget: string
    // Engine's table-parameter generation at reset time — a fresh worker starts
    // at 0, so without this every blaReady it posts would be dropped as stale.
    tableGeneration: number
    // Canvas aspect (width/height): lets Rust replace the legacy 4×scale c_max
    // margin with the exact screen bound (sound under off-center references).
    viewportAspect?: number
}

type UpdateViewMessage = {
    type: 'updateView'
    jobId: number
    cx: string
    cy: string
    scale: string
    angle: number
    maxIterations: number
    viewportAspect?: number
}

type SetApproximationModeMessage = {
    type: 'setApproximationMode'
    jobId: number
    approximationMode: ApproximationMode
    tableGeneration: number
}

type SetBlaEpsilonMessage = {
    type: 'setBlaEpsilon'
    jobId: number
    blaEpsilon: number
    tableGeneration: number
}

type SetGateEmissionMessage = {
    type: 'setGateEmission'
    jobId: number
    on: boolean
    tableGeneration: number
}

type SetDynamicBlockValidityMessage = {
    type: 'setDynamicBlockValidity'
    jobId: number
    on: boolean
    tableGeneration: number
}

type SetIncrementalReferenceTableMessage = {
    type: 'setIncrementalReferenceTable'
    jobId: number
    on: boolean
    tableGeneration: number
}

type SetMaxBlaSkipMessage = {
    type: 'setMaxBlaSkip'
    jobId: number
    maxBlaSkip: number
    tableGeneration: number
}

type FindMinibrotMessage = {
    type: 'findMinibrot'
    jobId: number
    maxIter: number
    radiusFactor: number
}

type DisposeMessage = {
    type: 'dispose'
}

type ReferenceWorkerMessage =
    | ResetMessage
    | UpdateViewMessage
    | SetApproximationModeMessage
    | SetBlaEpsilonMessage
    | SetGateEmissionMessage
    | SetDynamicBlockValidityMessage
    | SetIncrementalReferenceTableMessage
    | SetMaxBlaSkipMessage
    | FindMinibrotMessage
    | DisposeMessage

type UnifiedTableStats = {
    coefficientsMs: number
    boundsMs: number
    radiiMs: number
    saN0: number
    periodicP: number
    periodicStatus: number
    periodicDetectedP: number
    bandLog2: number
    bandSpread: number
    gateCount: number
}

type OrbitChunkResponse = {
    type: 'orbitChunk'
    jobId: number
    // Monotonic id of the reference orbit this chunk belongs to. A new id is minted
    // every time the orbit restarts at offset 0 (fresh navigator, Rust-side recenter,
    // precision-budget rebuild), so the Engine routes chunks by id instead of
    // comparing reference coordinates.
    refId: number
    offset: number
    count: number
    maxIterations: number
    referenceCx: string
    referenceCy: string
    orbit: Float32Array<ArrayBuffer>
}

type TableKind = 'bla' | 'jet' | 'mobius' | 'unified'
type TableBuildStage = 'coefficients' | 'bounds' | 'radii' | 'transfer'

type TableProgressResponse = {
    type: 'tableProgress'
    jobId: number
    refId: number
    tableGeneration: number
    kind: TableKind
    /** Stage progress in [0, 1]. It is deliberately milestone-based, not a
     *  fabricated time estimate: Unified exposes three cooperative WASM phases. */
    progress: number
    stage: TableBuildStage
}

type DynamicValidityPayload = {
    version: number
    wordsPerBlock: number
    diagnosticsWordsPerBlock: number
    referenceLog2Dc: number
    envelopes: Float32Array<ArrayBuffer>
    diagnostics: Uint32Array<ArrayBuffer>
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
}

type OptionalHeadersPayload = {
    version: number
    revision: number
    /** Quantized log2 cmax of the view for which these headers were solved. */
    currentLog2CMax: number
    saLog2Dc: number
    periodicLog2Dc: number
    gateLog2Dc: number
    data: Float32Array<ArrayBuffer>
}

type BlaReadyResponse = {
    type: 'blaReady'
    jobId: number
    refId: number
    maxIterations: number
    // 'bla': BLA/Padé records (12 floats each) in `steps`, no `radii`.
    // 'jet': coefficient records (27 floats each) in `steps` + a separate radius
    // buffer (4 floats each, vec4-packed) in `radii` — the split "buffer de
    // rayons" so a radius re-solve re-uploads only the small array.
    // 'mobius': Möbius-c+ coefficient records (21 floats each: 7 × (x, y,
    // e-as-i32-bits) — [A, B, A', D, D', F, N₂], the [2/1]-c+ form) in
    // `steps` + the same 4-float vec4 radius sidecar.
    // 'unified': prefix-ordered records (27 floats each: 9 × (x, y,
    // e-as-i32-bits) — [A, B, D, A', D', a02, a30, a12, a03]) in `steps` +
    // the tagged-radius sidecar (4 floats: r, tag, f32safe, spare).
    kind: TableKind
    steps: Float32Array<ArrayBuffer>
    // Jet/mobius only: per-block radii (vec4-packed), index-aligned with `steps`.
    radii?: Float32Array<ArrayBuffer>
    optionalHeaders?: OptionalHeadersPayload
    // Unified debug path only: packed, versioned per-pixel proof records and
    // their own directory. Absent while dynamicBlockValidity is disabled.
    validity?: DynamicValidityPayload
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
    // Table build wall-clock (worker-side) + the unified stage mask for it
    // (1 = coeffs+levels, 2 = bounds, 4 = radii, 8 = packed validity;
    // 0/undefined = warm or
    // non-unified). Lets RenderStats tell a keyframe radii re-solve from a
    // cold build (Phase F, 7.2).
    buildMs?: number
    buildStages?: number
    // Table observability for the perf panel (unified only): certified SA
    // prefix skip, periodic period (0 = dormant), replay |dz| band
    // (log2 median / spread) and emitted §18 gate count.
    tableStats?: UnifiedTableStats
    // Echo of the table-parameter generation this table was built under (set by
    // the reset/setter messages). The Engine drops mismatches: builds that were
    // in flight when a parameter change was posted.
    tableGeneration: number
}

type RadiiReadyResponse = {
    // Radii-only re-solve (unified, build stages == 4): the coefficient table
    // last posted for this (refId, generation) is from the SAME build — only
    // the (ε, c_max)-keyed radius sidecar + level directory ship (~1/8 of the
    // full-table bytes; the win grows with depth as coefficients reach MBs).
    type: 'radiiReady'
    jobId: number
    refId: number
    maxIterations: number
    radii: Float32Array<ArrayBuffer>
    optionalHeaders?: OptionalHeadersPayload
    levels: Uint32Array<ArrayBuffer>
    levelCount: number
    buildMs?: number
    buildStages?: number
    tableStats?: UnifiedTableStats
    tableGeneration: number
}

type HeadersReadyResponse = {
    type: 'headersReady'
    jobId: number
    refId: number
    maxIterations: number
    optionalHeaders: OptionalHeadersPayload
    buildMs?: number
    buildStages?: number
    tableStats?: UnifiedTableStats
    tableGeneration: number
}

/** Append-only progressive Unified publication. `ranges` contains six u32s
 * per range: level, skip, slotStart, slotCount, payloadOffset, committedCount.
 * All payload arrays are block-concatenated in the same range order. */
type TableRangeResponse = {
    type: 'tableRange'
    jobId: number
    refId: number
    tableGeneration: number
    maxIterations: number
    capacityOrbitLength: number
    coveredOrbitLength: number
    builtOrbitLength: number
    reset: boolean
    hasMore: boolean
    ranges: Uint32Array<ArrayBuffer>
    coefficients: Float32Array<ArrayBuffer>
    radii: Float32Array<ArrayBuffer>
    envelopes: Float32Array<ArrayBuffer>
    diagnostics: Uint32Array<ArrayBuffer>
    validityVersion: number
    validityWordsPerBlock: number
    diagnosticsWordsPerBlock: number
    referenceLog2Dc: number
    /** Current quantized view extent; may exceed the immutable table domain. */
    currentLog2CMax: number
    cumulativeMerges: number
    cumulativeCoefficients: number
    cumulativeEnvelopes: number
    peakRetainedBytes: number
    cumulativeMergeCoefficientsMs: number
    cumulativeEnvelopeMs: number
    yields: number
    cancellations: number
}

type ErrorResponse = {
    type: 'error'
    jobId: number
    message: string
}

type ReadyResponse = {
    type: 'ready'
}

type MinibrotFoundResponse = {
    type: 'minibrotFound'
    jobId: number
    status: 'ok' | 'none' | 'nonewton'
    cx: string | null
    cy: string | null
    period: number | null
}

type ReferenceWorkerResponse =
    | OrbitChunkResponse
    | TableProgressResponse
    | BlaReadyResponse
    | RadiiReadyResponse
    | HeadersReadyResponse
    | TableRangeResponse
    | ErrorResponse
    | ReadyResponse
    | MinibrotFoundResponse

type WorkerContext = typeof globalThis & {
    postMessage(message: unknown, transfer?: Transferable[]): void
    close(): void
    onmessage: ((event: MessageEvent<ReferenceWorkerMessage>) => void) | null
}

const ctx = self as unknown as WorkerContext

let navigator: MandelbrotNavigator | undefined
let activeJobId = 0
let disposed = false
let lastBlaMaxIterations = 0
// A view-key refresh is distinct from table coverage.  It requests legacy
// radii or dynamic optional headers without discarding the largest orbit
// prefix already represented by the table.
let tableViewRefreshPending = false
// Table-parameter generation (ε/skip/gates/mode), set by reset and the setter
// messages and echoed in every blaReady — lets the Engine drop tables whose
// build was in flight when a parameter change was posted.
let tableGeneration = 0
let targetMaxIterations = 0
let computeLoopRunning = false
let needsReferenceValidation = false
// Monotonic across navigator recreations: every orbit restart (chunk at offset 0)
// mints a fresh id, so consumers can order references globally.
let refCounter = 0
let currentRefId = 0
// Quantized view c_max at the last view-key refresh. Legacy Jet/Mobius/Auto
// use it to re-solve their sidecars; dynamic one-shot refreshes optional
// headers only, and dynamic+incremental keeps the block table entirely out of
// this lifecycle.
let lastJetLog2CMax = Number.NaN
// (refId, generation) of the last FULL unified table posted: a radii-only
// re-solve (stages == 4) may then ship as `radiiReady` — the coefficient
// buffer the Engine holds is from the same build (orbit stage warm).
let lastFullTableRefId = -1
let lastFullTableGeneration = -1
// Monotonic independently of the block-table generation. It protects the GPU
// header tail against a delayed older cmax refresh for the same reference.
let optionalHeaderRevision = 0
let incrementalYieldCount = 0
let incrementalCancellationCount = 0
let lastIncrementalHeaderKey = ''

const ORBIT_CHUNK_SIZE = 100
// Compute the reference orbit to HEADROOM× the display maxIter, so interactive zoom-in (which
// raises maxIter) finds the orbit already long enough — no transient black frame while it
// catches up. Incremental Auto builds the matching table headroom from the same chunks; legacy
// one-shot modes retain their display-maxIter table policy.
// Capped at the GPU reference buffer's step capacity (mirrors Engine's 10M-step buffer).
const REFERENCE_ITER_HEADROOM = 2
const ORBIT_STEP_CAPACITY = 10_000_000
// One cooperative table unit absorbs every seed and every emitted block made available by one
// production orbit chunk. Since emitted dyadic levels begin at skip 4, a chunk creates fewer
// than ORBIT_CHUNK_SIZE envelopes. This prevents a permanent table backlog while preserving an
// event-loop yield after each reference/table pair.
const INCREMENTAL_ORBIT_QUOTA = ORBIT_CHUNK_SIZE
const INCREMENTAL_ENVELOPE_QUOTA = ORBIT_CHUNK_SIZE

function postResponse(message: ReferenceWorkerResponse, transfer?: Transferable[]) {
    ctx.postMessage(message, transfer ?? [])
}

function yieldToWorkerEvents(): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, 0))
}

function postError(jobId: number, error: unknown) {
    const message = error instanceof Error ? error.message : String(error)
    postResponse({ type: 'error', jobId, message })
}

function applyApproximationMode(mode: ApproximationMode) {
    if (!navigator) {
        return
    }
    if (mode === 'bla') {
        navigator.use_bla()
    } else if (mode === 'pade') {
        navigator.use_pade()
    } else if (mode === 'jet') {
        navigator.use_jet()
    } else if (mode === 'mobius') {
        navigator.use_mobius_cplus()
    } else if (mode === 'auto') {
        navigator.use_unified()
    } else {
        navigator.use_perturbation()
    }
}

function resetNavigator(message: ResetMessage) {
    console.log('[REF worker] RESET (fresh navigator)', message.cx.slice(0, 14), 'scale', message.scale.slice(0, 10))
    navigator?.free()
    navigator = new MandelbrotNavigator(
        message.cx,
        message.cy,
        message.scale,
        message.angle,
    )
    // Fix the precision budget ahead of time (descending-profile depth). A budget change
    // re-enters this reset path, so the orbit is always rebuilt at the current budget.
    navigator.set_precision_budget(message.precisionBudget)
    activeJobId = message.jobId
    lastBlaMaxIterations = 0
    tableViewRefreshPending = false
    tableGeneration = message.tableGeneration ?? 0
    targetMaxIterations = message.maxIterations
    needsReferenceValidation = false
    applyApproximationMode(message.approximationMode)
    navigator.set_bla_epsilon(message.blaEpsilon)
    navigator.set_gate_emission(!!message.gateEmission)
    navigator.set_dynamic_block_validity(!!message.dynamicBlockValidity)
    navigator.set_incremental_reference_table(!!message.incrementalReferenceTable)
    navigator.set_max_bla_skip(message.maxBlaSkip)
    navigator.set_viewport_aspect(message.viewportAspect ?? Number.NaN)
    lastJetLog2CMax = navigator.current_log2_c_max()
    lastFullTableRefId = -1
    lastFullTableGeneration = -1
    incrementalYieldCount = 0
    incrementalCancellationCount = 0
    lastIncrementalHeaderKey = ''
    void runComputeLoop(message.jobId)
}

// The WASM orbit is laid out 4 floats/step (zx, zy, then two inert padding slots
// that once held the orbit derivative / a double-float low word of z_n). The GPU
// shader reads only zx/zy, so deinterleave to 2 floats/step right here: this halves
// the orbit storage buffer and every chunk's CPU→GPU upload, and tightens getOrbit's
// stride (the hottest read in the iteration loop) from 16 to 8 bytes.
function copyOrbitSlice(ptr: number, offset: number, count: number): Float32Array<ArrayBuffer> {
    const SRC_STRIDE = 4
    const DST_STRIDE = 2
    const stepCount = Math.max(0, count - offset)
    const source = new Float32Array(
        wasmMemory.buffer,
        ptr + offset * SRC_STRIDE * Float32Array.BYTES_PER_ELEMENT,
        stepCount * SRC_STRIDE,
    )
    const copied: Float32Array<ArrayBuffer> = new Float32Array(stepCount * DST_STRIDE)
    for (let i = 0; i < stepCount; i++) {
        copied[i * DST_STRIDE] = source[i * SRC_STRIDE]         // zx
        copied[i * DST_STRIDE + 1] = source[i * SRC_STRIDE + 1] // zy
    }
    return copied
}

function copyOptionalHeaders(info: {
    optional_headers_ptr: number
    optional_headers_count: number
    optional_headers_version: number
    optional_sa_log2_dc: number
    optional_periodic_log2_dc: number
    optional_gate_log2_dc: number
}, currentLog2CMax: number): OptionalHeadersPayload | undefined {
    if (info.optional_headers_count <= 0) {
        return undefined
    }
    if (
        info.optional_headers_version <= 0
        || info.optional_headers_count < 11
        || Number.isNaN(info.optional_sa_log2_dc)
        || Number.isNaN(info.optional_periodic_log2_dc)
        || Number.isNaN(info.optional_gate_log2_dc)
        || !Number.isFinite(currentLog2CMax)
    ) {
        throw new Error(
            `invalid optional-header contract: version=${info.optional_headers_version} `
            + `records=${info.optional_headers_count} domains=`
            + `${info.optional_sa_log2_dc}/${info.optional_periodic_log2_dc}/${info.optional_gate_log2_dc}`,
        )
    }
    const source = new Float32Array(
        wasmMemory.buffer,
        info.optional_headers_ptr,
        info.optional_headers_count * 4,
    )
    const data: Float32Array<ArrayBuffer> = new Float32Array(source.length)
    data.set(source)
    return {
        version: info.optional_headers_version,
        revision: ++optionalHeaderRevision,
        currentLog2CMax,
        saLog2Dc: info.optional_sa_log2_dc,
        periodicLog2Dc: info.optional_periodic_log2_dc,
        gateLog2Dc: info.optional_gate_log2_dc,
        data,
    }
}

function nextPowerOfTwo(value: number): number {
    let result = 1
    const target = Math.max(1, Math.ceil(value))
    while (result < target) result *= 2
    return result
}

function incrementalUnitIsCurrent(
    unitNavigator: MandelbrotNavigator,
    jobId: number,
    refId: number,
    generation: number,
): boolean {
    return !disposed
        && navigator === unitNavigator
        && activeJobId === jobId
        && currentRefId === refId
        && tableGeneration === generation
}

/** Run one synchronous Rust unit, then copy/transfer only if all three epoch
 * identifiers still match. Returns whether more visible table work remains. */
function postIncrementalUnifiedUnit(
    jobId: number,
    targetIterations: number,
): { hasMore: boolean; published: boolean } {
    const unitNavigator = navigator
    if (
        !unitNavigator
        || unitNavigator.get_approximation_mode() !== 5
        || !unitNavigator.get_dynamic_block_validity()
        || !unitNavigator.get_incremental_reference_table()
    ) {
        return { hasMore: false, published: false }
    }
    const refId = currentRefId
    const generation = tableGeneration
    const currentLog2CMax = unitNavigator.current_log2_c_max()
    if (!incrementalUnitIsCurrent(unitNavigator, jobId, refId, generation)) {
        incrementalCancellationCount++
        return { hasMore: false, published: false }
    }
    const info = unitNavigator.advance_incremental_unified_reference(
        targetIterations,
        INCREMENTAL_ORBIT_QUOTA,
        INCREMENTAL_ENVELOPE_QUOTA,
    )
    try {
        if (!incrementalUnitIsCurrent(unitNavigator, jobId, refId, generation)) {
            incrementalCancellationCount++
            return { hasMore: false, published: false }
        }
        const rangesSource = new Uint32Array(wasmMemory.buffer, info.ranges_ptr, info.range_count * 6)
        const ranges: Uint32Array<ArrayBuffer> = new Uint32Array(rangesSource)
        const coefficientsSource = new Float32Array(
            wasmMemory.buffer,
            info.coeffs_ptr,
            info.coeffs_count * 27,
        )
        const coefficients: Float32Array<ArrayBuffer> = new Float32Array(coefficientsSource)
        const radiiSource = new Float32Array(
            wasmMemory.buffer,
            info.radii_ptr,
            info.radii_count * 4,
        )
        const radii: Float32Array<ArrayBuffer> = new Float32Array(radiiSource)
        const envelopesSource = new Float32Array(
            wasmMemory.buffer,
            info.validity_ptr,
            info.validity_count * info.validity_words_per_block,
        )
        const envelopes: Float32Array<ArrayBuffer> = new Float32Array(envelopesSource)
        const diagnosticsSource = new Uint32Array(
            wasmMemory.buffer,
            info.diagnostics_ptr,
            info.diagnostics_count * info.diagnostics_words_per_block,
        )
        const diagnostics: Uint32Array<ArrayBuffer> = new Uint32Array(diagnosticsSource)
        if (
            info.coeffs_count !== info.radii_count
            || info.coeffs_count !== info.validity_count
            || info.coeffs_count !== info.diagnostics_count
        ) {
            throw new Error(
                `incremental table payload mismatch ${info.coeffs_count}/${info.radii_count}/`
                + `${info.validity_count}/${info.diagnostics_count}`,
            )
        }
        if (!incrementalUnitIsCurrent(unitNavigator, jobId, refId, generation)) {
            incrementalCancellationCount++
            return { hasMore: false, published: false }
        }
        // Rust can only consume the orbit prefix that currently exists. Keep
        // the publication active while the worker still plans reference
        // headroom, even when this particular chunk was fully absorbed.
        const hasMore = info.has_more !== 0
            || info.covered_orbit_len < targetIterations + 1
        const published = ranges.length > 0 || info.reset !== 0
        if (published) {
            const tableMaxIterations = Math.max(
                targetIterations,
                Math.max(0, info.covered_orbit_len - 1),
            )
            postResponse({
                type: 'tableRange',
                jobId,
                refId,
                tableGeneration: generation,
                maxIterations: tableMaxIterations,
                capacityOrbitLength: nextPowerOfTwo(Math.max(1024, tableMaxIterations + 1)),
                coveredOrbitLength: info.published_orbit_len,
                builtOrbitLength: info.covered_orbit_len,
                reset: info.reset !== 0,
                hasMore,
                ranges,
                coefficients,
                radii,
                envelopes,
                diagnostics,
                validityVersion: info.validity_version,
                validityWordsPerBlock: info.validity_words_per_block,
                diagnosticsWordsPerBlock: info.diagnostics_words_per_block,
                referenceLog2Dc: info.reference_log2_dc,
                currentLog2CMax,
                cumulativeMerges: info.cumulative_merges,
                cumulativeCoefficients: info.cumulative_coefficients,
                cumulativeEnvelopes: info.cumulative_envelopes,
                peakRetainedBytes: info.peak_retained_bytes,
                cumulativeMergeCoefficientsMs: info.cumulative_merge_coefficients_ms,
                cumulativeEnvelopeMs: info.cumulative_envelope_ms,
                yields: incrementalYieldCount,
                cancellations: incrementalCancellationCount,
            }, [
                ranges.buffer,
                coefficients.buffer,
                radii.buffer,
                envelopes.buffer,
                diagnostics.buffer,
            ])
        }
        return { hasMore, published }
    } finally {
        info.free()
    }
}

function postIncrementalHeadersIfNeeded(jobId: number, maxIterations: number) {
    const unitNavigator = navigator
    if (!unitNavigator) return
    const refId = currentRefId
    const generation = tableGeneration
    const currentLog2CMax = unitNavigator.current_log2_c_max()
    const key = `${jobId}/${refId}/${generation}/${maxIterations}/${currentLog2CMax}`
    if (key === lastIncrementalHeaderKey) return
    const started = performance.now()
    const info = unitNavigator.compute_unified_header(maxIterations)
    try {
        if (!incrementalUnitIsCurrent(unitNavigator, jobId, refId, generation)) {
            incrementalCancellationCount++
            return
        }
        const optionalHeaders = copyOptionalHeaders(info, currentLog2CMax)
        if (!optionalHeaders) return
        lastIncrementalHeaderKey = key
        postResponse({
            type: 'headersReady',
            jobId,
            refId,
            maxIterations,
            optionalHeaders,
            buildMs: performance.now() - started,
            buildStages: 16,
            tableStats: {
                coefficientsMs: 0,
                boundsMs: 0,
                radiiMs: 0,
                saN0: unitNavigator.unified_last_sa_n0(),
                periodicP: unitNavigator.unified_last_periodic_p(),
                periodicStatus: unitNavigator.unified_last_periodic_status(),
                periodicDetectedP: unitNavigator.unified_last_periodic_detected_p(),
                bandLog2: Number.NaN,
                bandSpread: Number.NaN,
                gateCount: 0,
            },
            tableGeneration: generation,
        }, [optionalHeaders.data.buffer])
    } finally {
        info.free()
    }
}

function postBlaIfReady(jobId: number, maxIterations: number, availableIter: number) {
    if (!navigator || jobId !== activeJobId || disposed) {
        return
    }
    const mode = navigator.get_approximation_mode()
    // Jet/mobius rebuilds are ~10-20× costlier than BLA ones (exact degree-6
    // merges + majorant walks). During zoom-in maxIterations grows every
    // updateView; a rebuild per tick would keep the table permanently stale
    // (the engine then renders exact perturbation). Throttle: keep serving the
    // posted table until the target outgrows it by 1.5× — blocks then still
    // cover ≥⅔ of the iterations (the engine accepts partial tables for these
    // modes), the tail runs exact, and the ≥2-octave scale-drift repost
    // refreshes radii regardless.
    const jetStillFresh = (mode === 3 || mode === 4 || mode === 5)
        && lastBlaMaxIterations > 0
        && maxIterations <= Math.ceil(lastBlaMaxIterations * 1.5)
    const coverageFresh = lastBlaMaxIterations >= maxIterations || jetStillFresh
    const needsViewRefresh = tableViewRefreshPending && (mode === 3 || mode === 4 || mode === 5)
    const tableMaxIterations = coverageFresh
        ? lastBlaMaxIterations
        : Math.max(lastBlaMaxIterations, maxIterations)
    if (
        (coverageFresh && !needsViewRefresh)
        || availableIter < tableMaxIterations
        // Build/post the block table for BLA (1), Padé (2) and jet (3);
        // perturbation (0) needs no table.
        || mode === 0
    ) {
        return
    }

    const refId = currentRefId
    // Jet mode (3) ships its own table: a coefficient buffer (27-float records)
    // plus a SEPARATE radius buffer (3-float records) — the split "buffer de
    // rayons" (add-jet-approximation D6). BLA (1) / Padé (2) share the 12-float
    // BlaStep table with no separate radii. Both level directories are 4 × u32
    // per level (the last word is an f32 bit-pattern).
    const isJet = mode === 3
    const isMobius = mode === 4
    const isUnified = mode === 5
    const kind: TableKind = isUnified ? 'unified' : isMobius ? 'mobius' : isJet ? 'jet' : 'bla'
    const postTableProgress = (progress: number, stage: TableBuildStage) => {
        postResponse({
            type: 'tableProgress',
            jobId,
            refId,
            tableGeneration,
            kind,
            progress,
            stage,
        })
    }
    if (!isJet && !isMobius && !isUnified) {
        // BLA / Padé path: one 12-float BlaStep table.
        postTableProgress(0, 'coefficients')
        const info = navigator.compute_bla_reference_ptr(tableMaxIterations)
        postTableProgress(0.9, 'transfer')
        const stepsSource = new Float32Array(wasmMemory.buffer, info.ptr, info.count * 12)
        const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
        steps.set(stepsSource)
        const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * 4)
        const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
        levels.set(levelsSource)
        lastBlaMaxIterations = tableMaxIterations
        postResponse({
            type: 'blaReady',
            jobId,
            refId,
            maxIterations: tableMaxIterations,
            kind: 'bla',
            steps,
            levels,
            levelCount: info.level_count,
            tableGeneration,
        }, [steps.buffer, levels.buffer])
        return
    }

    // Jet/mobius path: coefficient buffer + radius sidecar + level directory.
    // NOTE: a header-first fast path exists Rust-side (compute_unified_header:
    // SA + periodic behind an empty directory, ~2 ms — meant to arm the
    // interior verdict ahead of the seconds-long cold build). Wiring it here
    // coincided with a GPU hang on the first field run, so it ships UNPLUGGED
    // until the hang is reproduced under a GPU debugger.
    const tableT0 = performance.now()
    let coefficientsMs = 0
    let boundsMs = 0
    let radiiMs = 0
    let info
    if (isUnified) {
        const coefficientsT0 = performance.now()
        navigator.begin_unified_reference(tableMaxIterations)
        coefficientsMs = performance.now() - coefficientsT0
        const boundsT0 = performance.now()
        navigator.continue_unified_reference_bounds(tableMaxIterations)
        boundsMs = performance.now() - boundsT0
        const radiiT0 = performance.now()
        info = navigator.finish_unified_reference(tableMaxIterations)
        radiiMs = performance.now() - radiiT0
    } else {
        postTableProgress(0, 'coefficients')
        info = isMobius
            ? navigator.compute_mobius_reference(tableMaxIterations)
            : navigator.compute_jet_reference(tableMaxIterations)
    }
    // These builds are the worker's single big synchronous chunk (exact
    // degree-6 merges + majorant walks): surface it so slow-mode reports can
    // tell build latency from per-application cost.
    const buildMs = performance.now() - tableT0
    const buildStages = isUnified ? navigator.unified_last_stages() : undefined
    if (isUnified && buildStages !== undefined) {
        // Report only phases that actually ran.  Entering the cooperative WASM
        // API with a warm cache is not a coefficient/bounds/radii rebuild.
        if ((buildStages & 1) !== 0) postTableProgress(1 / 3, 'coefficients')
        if ((buildStages & 2) !== 0) postTableProgress(2 / 3, 'bounds')
        if ((buildStages & (4 | 8)) !== 0) postTableProgress(0.85, 'radii')
        if ((buildStages & (1 | 2 | 4 | 8)) !== 0) postTableProgress(0.9, 'transfer')
        if ((buildStages & 1) === 0) coefficientsMs = 0
        if ((buildStages & 2) === 0) boundsMs = 0
        if ((buildStages & (4 | 8)) === 0) radiiMs = 0
    } else {
        postTableProgress(0.9, 'transfer')
    }
    const tableStats = isUnified ? {
        coefficientsMs,
        boundsMs,
        radiiMs,
        saN0: navigator.unified_last_sa_n0(),
        periodicP: navigator.unified_last_periodic_p(),
        periodicStatus: navigator.unified_last_periodic_status(),
        periodicDetectedP: navigator.unified_last_periodic_detected_p(),
        bandLog2: navigator.unified_last_band_log2(),
        bandSpread: navigator.unified_last_band_spread(),
        gateCount: navigator.unified_last_gate_count(),
    } : undefined
    console.log(`[REF worker] ${isMobius ? 'mobius' : isUnified ? 'unified' : 'jet'} table built in ${buildMs.toFixed(0)}ms (maxIter ${tableMaxIterations}${buildStages !== undefined ? `, stages ${buildStages}` : ''})`)

    const optionalHeaders = isUnified
        ? copyOptionalHeaders(info, navigator.current_log2_c_max())
        : undefined
    if (isUnified && !optionalHeaders) {
        throw new Error('unified table omitted its mandatory optional-header payload')
    }
    lastBlaMaxIterations = Math.max(lastBlaMaxIterations, tableMaxIterations)
    tableViewRefreshPending = false

    // Dynamic cmax-only motion refreshes just the optional tail. Coefficients,
    // legacy f32-safe sidecar, directories and validity envelopes remain the
    // exact buffers already on the GPU.
    if (
        isUnified
        && navigator.get_dynamic_block_validity()
        && buildStages === 16
        && lastFullTableRefId === refId
        && lastFullTableGeneration === tableGeneration
    ) {
        postResponse({
            type: 'headersReady',
            jobId,
            refId,
            maxIterations: tableMaxIterations,
            optionalHeaders: optionalHeaders!,
            buildMs,
            buildStages,
            tableStats,
            tableGeneration,
        }, [optionalHeaders!.data.buffer])
        return
    }

    const radiiSource = new Float32Array(wasmMemory.buffer, info.radii_ptr, info.radii_count * 4)
    const radii: Float32Array<ArrayBuffer> = new Float32Array(radiiSource.length)
    radii.set(radiiSource)

    const levelsSource = new Uint32Array(wasmMemory.buffer, info.levels_ptr, info.level_count * 4)
    const levels: Uint32Array<ArrayBuffer> = new Uint32Array(levelsSource.length)
    levels.set(levelsSource)
    // Radii-only re-solve against coefficients the Engine already holds from
    // the SAME build (stages == 4 ⇒ the orbit stage stayed warm): skip the
    // coefficient copy + upload — the sidecar is ~1/8 of the table, and the
    // saving grows with depth (piste "radiiReady").
    if (
        isUnified
        && buildStages !== undefined
        && (buildStages & 4) !== 0
        && (buildStages & ~(4 | 16)) === 0
        && lastFullTableRefId === refId
        && lastFullTableGeneration === tableGeneration
    ) {
        postResponse({
            type: 'radiiReady',
            jobId,
            refId,
            maxIterations: tableMaxIterations,
            radii,
            optionalHeaders,
            levels,
            levelCount: info.level_count,
            buildMs,
            buildStages,
            tableStats,
            tableGeneration,
        }, [
            radii.buffer,
            levels.buffer,
            ...(optionalHeaders ? [optionalHeaders.data.buffer] : []),
        ])
        return
    }

    // Strides must match the Rust #[repr(C)] JetCoeffs / MobiusCoeffs /
    // JetRadii / MobiusRadius and Engine's *_FLOATS constants.
    const coeffFloats = isMobius ? 21 : 27
    const stepsSource = new Float32Array(wasmMemory.buffer, info.coeffs_ptr, info.coeffs_count * coeffFloats)
    const steps: Float32Array<ArrayBuffer> = new Float32Array(stepsSource.length)
    steps.set(stepsSource)

    let validity: DynamicValidityPayload | undefined
    if (isUnified && info.validity_count > 0) {
        if (
            info.validity_version <= 0
            || info.validity_words_per_block <= 0
            || info.validity_diagnostics_words_per_block <= 0
            || info.validity_count !== info.coeffs_count
            || info.validity_diagnostics_count !== info.validity_count
            || info.validity_level_count !== info.level_count
            || !Number.isFinite(info.validity_reference_log2_dc)
        ) {
            throw new Error(
                `invalid dynamic-validity buffer contract: version=${info.validity_version} `
                + `words=${info.validity_words_per_block} records=${info.validity_count}/${info.coeffs_count} `
                + `diagnostics=${info.validity_diagnostics_words_per_block}x${info.validity_diagnostics_count} `
                + `levels=${info.validity_level_count}/${info.level_count} domain=${info.validity_reference_log2_dc}`,
            )
        }
        const envelopeSource = new Float32Array(
            wasmMemory.buffer,
            info.validity_ptr,
            info.validity_count * info.validity_words_per_block,
        )
        const envelopes: Float32Array<ArrayBuffer> = new Float32Array(envelopeSource.length)
        envelopes.set(envelopeSource)
        const diagnosticsSource = new Uint32Array(
            wasmMemory.buffer,
            info.validity_diagnostics_ptr,
            info.validity_diagnostics_count * info.validity_diagnostics_words_per_block,
        )
        const diagnostics: Uint32Array<ArrayBuffer> = new Uint32Array(diagnosticsSource.length)
        diagnostics.set(diagnosticsSource)
        const validityLevelsSource = new Uint32Array(
            wasmMemory.buffer,
            info.validity_levels_ptr,
            info.validity_level_count * 4,
        )
        const validityLevels: Uint32Array<ArrayBuffer> = new Uint32Array(validityLevelsSource.length)
        validityLevels.set(validityLevelsSource)
        validity = {
            version: info.validity_version,
            wordsPerBlock: info.validity_words_per_block,
            diagnosticsWordsPerBlock: info.validity_diagnostics_words_per_block,
            referenceLog2Dc: info.validity_reference_log2_dc,
            envelopes,
            diagnostics,
            levels: validityLevels,
            levelCount: info.validity_level_count,
        }
    }

    if (isUnified) {
        lastFullTableRefId = refId
        lastFullTableGeneration = tableGeneration
    }
    const response: BlaReadyResponse = {
        type: 'blaReady',
        jobId,
        refId,
        maxIterations: tableMaxIterations,
        kind: isMobius ? 'mobius' : isUnified ? 'unified' : 'jet',
        steps,
        radii,
        optionalHeaders,
        validity,
        levels,
        levelCount: info.level_count,
        buildMs,
        buildStages,
        tableStats,
        tableGeneration,
    }
    const transfer: Transferable[] = [steps.buffer, radii.buffer, levels.buffer]
    if (optionalHeaders) {
        transfer.push(optionalHeaders.data.buffer)
    }
    if (validity) {
        transfer.push(validity.envelopes.buffer, validity.diagnostics.buffer, validity.levels.buffer)
    }
    postResponse(response, transfer)
}

function computeAndPostOrbitChunk(jobId: number, maxIterations: number, orbitTarget: number): number {
    if (!navigator) return 0
    const info = navigator.compute_reference_orbit_chunk(ORBIT_CHUNK_SIZE, orbitTarget)
    needsReferenceValidation = false
    const orbit = copyOrbitSlice(info.ptr, info.offset, info.count)
    const [referenceCx, referenceCy] = navigator.get_reference_params()
    if (info.offset === 0) {
        currentRefId = ++refCounter
        lastBlaMaxIterations = 0
        tableViewRefreshPending = false
        lastIncrementalHeaderKey = ''
        console.log('[REF worker] orbit (re)start refId=', currentRefId, 'ref=', referenceCx.slice(0, 14))
    }
    const availableIter = Math.max(0, info.count - 1)
    postResponse({
        type: 'orbitChunk',
        jobId,
        refId: currentRefId,
        offset: info.offset,
        count: info.count,
        maxIterations,
        referenceCx,
        referenceCy,
        orbit,
    }, [orbit.buffer])
    return availableIter
}

async function runComputeLoop(jobId: number) {
    if (computeLoopRunning) {
        return
    }
    computeLoopRunning = true
    let loopFailed = false

    try {
        while (!disposed && navigator && jobId === activeJobId) {
            const maxIterations = targetMaxIterations
            const visibleOrbitTarget = Math.min(maxIterations, ORBIT_STEP_CAPACITY)
            const orbitTarget = Math.min(maxIterations * REFERENCE_ITER_HEADROOM, ORBIT_STEP_CAPACITY)
            const availableBefore = Math.max(0, navigator.get_reference_orbit_len())
            const incremental = navigator.get_approximation_mode() === 5
                && navigator.get_dynamic_block_validity()
                && navigator.get_incremental_reference_table()

            // Priority 1: make the visible reference prefix available. A view
            // validation may also restart the orbit, so it runs before table work.
            if (needsReferenceValidation || availableBefore < visibleOrbitTarget) {
                const availableIter = computeAndPostOrbitChunk(
                    jobId,
                    maxIterations,
                    visibleOrbitTarget,
                )
                if (incremental && availableIter > 0) {
                    // Consume exactly the prefix that now exists. The Rust builder reads the
                    // new slice in place and binary-carries every newly enabled level once.
                    postIncrementalUnifiedUnit(jobId, orbitTarget)
                }
                incrementalYieldCount += incremental ? 1 : 0
                await yieldToWorkerEvents()
                continue
            }

            if (incremental) {
                // Priority 2: drain bounded coefficient/envelope units for the
                // visible prefix. Every publication is followed by an event-loop
                // yield, even the final one, so queued cancellation wins before
                // any headroom work starts.
                const unit = postIncrementalUnifiedUnit(jobId, maxIterations)
                if (unit.published || unit.hasMore) {
                    incrementalYieldCount++
                    await yieldToWorkerEvents()
                    continue
                }
                lastBlaMaxIterations = Math.max(lastBlaMaxIterations, maxIterations)

                // Priority 3: reference headroom for future zoom-in.
                if (availableBefore < orbitTarget) {
                    const availableIter = computeAndPostOrbitChunk(jobId, maxIterations, orbitTarget)
                    // Headroom is useful only when its matching table is warm too. Publish the
                    // newly completed ranges before yielding, just like a visible chunk.
                    if (availableIter > 0) {
                        postIncrementalUnifiedUnit(jobId, orbitTarget)
                    }
                    incrementalYieldCount++
                    await yieldToWorkerEvents()
                    continue
                }

                // A mode/epsilon switch can start a fresh builder while the reference already
                // owns headroom. Drain that resident prefix cooperatively instead of waiting for
                // another orbit append that may never happen.
                const headroomUnit = postIncrementalUnifiedUnit(
                    jobId,
                    Math.min(availableBefore, orbitTarget),
                )
                if (headroomUnit.published || headroomUnit.hasMore) {
                    incrementalYieldCount++
                    await yieldToWorkerEvents()
                    continue
                }

                // Priority 4: optional shortcuts and diagnostics. They never
                // invalidate the already committed coefficient/proof ranges.
                postIncrementalHeadersIfNeeded(jobId, maxIterations)
                await yieldToWorkerEvents()
                if (targetMaxIterations <= maxIterations && !needsReferenceValidation) {
                    break
                }
                continue
            }

            // Legacy one-shot modes retain their original headroom-first path.
            if (availableBefore >= orbitTarget) {
                postBlaIfReady(jobId, maxIterations, availableBefore)
                await yieldToWorkerEvents()
                if (targetMaxIterations <= maxIterations) break
                continue
            }
            const availableIter = computeAndPostOrbitChunk(jobId, maxIterations, orbitTarget)
            postBlaIfReady(jobId, maxIterations, availableIter)
            await yieldToWorkerEvents()
        }
    } catch (error) {
        loopFailed = true
        postError(jobId, error)
    } finally {
        computeLoopRunning = false
        if (!loopFailed && !disposed && navigator) {
            const availableIter = Math.max(0, navigator.get_reference_orbit_len())
            // tableStale: a setter (or octave-drift repost) zeroed
            // lastBlaMaxIterations while this loop was between its last
            // postBlaIfReady and its exit — its own runComputeLoop call was a
            // no-op (loop still running), so without a restart the rebuilt
            // table would never be posted. Converges: the restarted loop posts
            // once and lastBlaMaxIterations becomes non-zero. Perturbation
            // (mode 0) posts no table — excluded to avoid restarting forever.
            const tableStale = (lastBlaMaxIterations === 0 || tableViewRefreshPending)
                && navigator.get_approximation_mode() !== 0
            if (jobId !== activeJobId || availableIter < targetMaxIterations || needsReferenceValidation || tableStale) {
                void runComputeLoop(activeJobId)
            }
        }
    }
}

ctx.onmessage = (event: MessageEvent<ReferenceWorkerMessage>) => {
    const message = event.data
    try {
        switch (message.type) {
            case 'reset':
                if (!disposed) {
                    resetNavigator(message)
                }
                break
            case 'updateView':
                if (navigator && message.jobId === activeJobId) {
                    console.log('[REF worker] updateView (reuse navigator)', message.cx.slice(0, 14), 'scale', message.scale.slice(0, 10))
                    navigator.origin(message.cx, message.cy)
                    navigator.scale(message.scale)
                    navigator.angle(message.angle)
                    if (message.viewportAspect !== undefined) {
                        navigator.set_viewport_aspect(message.viewportAspect)
                    }
                    targetMaxIterations = message.maxIterations
                    needsReferenceValidation = true
                    // Jet/mobius radii depend on the per-view c_max (scale,
                    // aspect AND reference→center offset). Growth past the
                    // posted rung uncertifies border pixels — re-post NOW
                    // (cheap closed-form re-solve Rust-side); ≥ 2 octaves of
                    // shrink re-posts for tightness only.
                    const driftMode = navigator.get_approximation_mode()
                    if (driftMode === 3 || driftMode === 4 || driftMode === 5) {
                        const log2CMax = navigator.current_log2_c_max()
                        if (
                            !Number.isFinite(lastJetLog2CMax)
                            || log2CMax > lastJetLog2CMax
                            || log2CMax < lastJetLog2CMax - 2
                        ) {
                            lastJetLog2CMax = log2CMax
                            const incremental = driftMode === 5
                                && navigator.get_dynamic_block_validity()
                                && navigator.get_incremental_reference_table()
                            if (!incremental) tableViewRefreshPending = true
                        }
                    }
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setApproximationMode':
                if (message.jobId === activeJobId) {
                    applyApproximationMode(message.approximationMode)
                    if (navigator?.get_incremental_reference_table()) {
                        navigator.set_incremental_reference_table(false)
                        navigator.set_incremental_reference_table(true)
                    }
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setBlaEpsilon':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_bla_epsilon(message.blaEpsilon)
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setGateEmission':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_gate_emission(message.on)
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setDynamicBlockValidity':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_dynamic_block_validity(message.on)
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setIncrementalReferenceTable':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_incremental_reference_table(message.on)
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'setMaxBlaSkip':
                if (navigator && message.jobId === activeJobId) {
                    navigator.set_max_bla_skip(message.maxBlaSkip)
                    lastBlaMaxIterations = 0
                    tableViewRefreshPending = false
                    lastIncrementalHeaderKey = ''
                    tableGeneration = message.tableGeneration
                    void runComputeLoop(message.jobId)
                }
                break
            case 'findMinibrot':
                if (navigator && message.jobId === activeJobId) {
                    // The worker navigator already tracks the current view (set on
                    // every updateView); detect the atom period at full precision
                    // and refine to its nucleus.
                    const res = navigator.find_minibrot(message.maxIter, message.radiusFactor)
                    const status = res[0] as 'ok' | 'none' | 'nonewton'
                    postResponse({
                        type: 'minibrotFound',
                        jobId: message.jobId,
                        status,
                        cx: status === 'ok' ? res[1] : null,
                        cy: status === 'ok' ? res[2] : null,
                        period:
                            status === 'ok'
                                ? Number(res[3])
                                : status === 'nonewton'
                                  ? Number(res[1])
                                  : null,
                    })
                }
                break
            case 'dispose':
                disposed = true
                navigator?.free()
                navigator = undefined
                ctx.close()
                break
        }
    } catch (error) {
        postError('jobId' in message ? message.jobId : activeJobId, error)
    }
}

postResponse({ type: 'ready' })
