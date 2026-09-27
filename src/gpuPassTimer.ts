// ── Per-pass GPU timing with timestamp queries ──
//
// Each timed pass writes begin/end timestamps into its slot of one query set.
// At the end of a frame the used slots are resolved and copied to a mappable
// buffer, read back off the critical path (a frame is skipped while the
// previous map is in flight). Timestamp queries are optional in WebGPU: a
// disabled timer encodes nothing and never reports.

import {PASS_SLOTS, TS_COUNT, partitionGpuPassTimestamps, shouldEncodeTimestampBoundary} from './gpuPassTimings'

const PASS_EMA_ALPHA = 0.2

export type PassTimingSample<Context> = {
    /** Robust GPU span of the frame (first begin → last end), when any pass ran. */
    spanMs?: number
    /** Duration of the iteration (compute) pass, when it ran. */
    iterationPassMs?: number
    /** Sum of every other timed pass of the frame. */
    otherPassesMs: number
    /** Caller context captured when the frame was resolved. */
    context: Context
}

export class GpuPassTimer<Context> {
    /** EMA per pass (ms), over the frames it ran. */
    passTimingsMs: Record<string, number> = {}
    /** Which passes ran in the last measured frame. */
    passActive: Record<string, boolean> = {}
    /** Σ of the timed passes that ran (breakdown; may overlap). */
    passGpuSumMs = 0
    /** Authoritative GPU frame time (EMA of the robust span). */
    passGpuSpanMs = 0
    /** Latest raw iteration-pass duration; the serial lets a benchmark record each sample once. */
    lastIterationPassMs = -1
    iterationPassTimingSerial = 0

    private querySet?: GPUQuerySet
    private resolveBuffer?: GPUBuffer
    private readBuffer?: GPUBuffer
    /** One-thread no-op dispatch: prevents browsers from eliminating marker-only passes. */
    private markerPipeline?: GPUComputePipeline
    private readbackFree = true
    private slotsUsedThisFrame = 0
    private pendingSlots = 0
    private pendingContext?: Context

    get enabled(): boolean { return !!this.querySet }

    allocate(device: GPUDevice): void {
        this.querySet = device.createQuerySet({ type: 'timestamp', count: TS_COUNT, label: 'Engine PerfTimestamps' })
        this.resolveBuffer = device.createBuffer({ size: TS_COUNT * 8, usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC, label: 'Engine TS Resolve' })
        this.readBuffer = device.createBuffer({ size: TS_COUNT * 8, usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ, label: 'Engine TS Readback' })
        this.markerPipeline = device.createComputePipeline({
            label: 'Engine Timestamp Marker Pipeline',
            layout: 'auto',
            compute: {
                module: device.createShaderModule({
                    label: 'Engine Timestamp Marker Shader',
                    code: '@compute @workgroup_size(1) fn main() {}',
                }),
                entryPoint: 'main',
            },
        })
    }

    /** Start encoding a frame. */
    beginFrame(): void {
        this.slotsUsedThisFrame = 0
    }

    /** Timestamp writes for an ordinary timed pass. */
    writes(slot: number): GPUComputePassTimestampWrites | undefined {
        if (!this.querySet) return undefined
        this.slotsUsedThisFrame |= (1 << slot)
        return { querySet: this.querySet, beginningOfPassWriteIndex: slot * 2, endOfPassWriteIndex: slot * 2 + 1 }
    }

    /**
     * One robust boundary around commands (notably texture copies) which cannot
     * carry pass timestampWrites themselves. Only the END marker of the no-op
     * dispatch is observed.
     */
    spanBoundary(encoder: GPUCommandEncoder, slot: number, edge: 'start' | 'end'): void {
        if (!shouldEncodeTimestampBoundary(this.enabled, !!this.querySet) || !this.markerPipeline) return
        this.slotsUsedThisFrame |= (1 << slot)
        const marker = encoder.beginComputePass({
            label: `Engine timing boundary ${PASS_SLOTS[slot].key}:${edge}`,
            timestampWrites: {
                querySet: this.querySet!,
                endOfPassWriteIndex: slot * 2 + (edge === 'start' ? 0 : 1),
            },
        })
        marker.setPipeline(this.markerPipeline)
        marker.dispatchWorkgroups(1)
        marker.end()
    }

    /** Only the robust END marker of an explicit span, on a real pass. */
    explicitSpanEnd(slot: number): GPUComputePassTimestampWrites | undefined {
        if (!this.querySet) return undefined
        this.slotsUsedThisFrame |= (1 << slot)
        return { querySet: this.querySet, endOfPassWriteIndex: slot * 2 + 1 }
    }

    /**
     * Resolve the frame's timestamps into the readback buffer when a pass was
     * timed and no previous readback is in flight. Returns whether `readback`
     * must be called after submission.
     */
    resolveFrame(encoder: GPUCommandEncoder, context: Context): boolean {
        if (!this.querySet || !this.resolveBuffer || !this.readBuffer
            || !this.readbackFree || this.slotsUsedThisFrame === 0) return false
        encoder.resolveQuerySet(this.querySet, 0, TS_COUNT, this.resolveBuffer, 0)
        encoder.copyBufferToBuffer(this.resolveBuffer, 0, this.readBuffer, 0, TS_COUNT * 8)
        this.pendingSlots = this.slotsUsedThisFrame
        this.pendingContext = context
        return true
    }

    /**
     * Deferred readback of the resolved frame into per-pass EMAs.
     *
     * Per-pass end−begin is UNRELIABLE on tiled/mobile GPUs: begin timestamps
     * cluster at frame start (fast command parse, deferred fragment work), so
     * it reads as cumulative-from-start. Passes run SEQUENTIALLY on the GPU
     * timeline, so the robust partition is the gap between consecutive END
     * markers; explicit copy/compound spans carry their own END boundaries.
     */
    readback(onSample: (sample: PassTimingSample<Context>) => void): void {
        const buffer = this.readBuffer
        if (!buffer) return
        this.readbackFree = false
        const pending = this.pendingSlots
        const context = this.pendingContext!
        void buffer.mapAsync(GPUMapMode.READ).then(() => {
            try {
                const data = new BigInt64Array(buffer.getMappedRange().slice(0))
                const timings: Record<string, number> = { ...this.passTimingsMs }
                const partition = partitionGpuPassTimestamps(data, pending)
                let iterationPassMs: number | undefined
                let sum = 0
                let otherPassesMs = 0
                for (const pass of partition.samples) {
                    const ms = pass.durationMs
                    if (pass.key === 'compute') iterationPassMs = ms
                    else otherPassesMs += ms
                    const previous = timings[pass.key]
                    timings[pass.key] = previous === undefined ? ms : previous * (1 - PASS_EMA_ALPHA) + ms * PASS_EMA_ALPHA
                    sum += timings[pass.key]
                }
                this.passTimingsMs = timings
                this.passActive = partition.active
                this.passGpuSumMs = sum
                const spanMs = partition.samples.length ? partition.spanMs : undefined
                if (spanMs !== undefined) {
                    this.passGpuSpanMs = this.passGpuSpanMs > 0
                        ? this.passGpuSpanMs * (1 - PASS_EMA_ALPHA) + spanMs * PASS_EMA_ALPHA
                        : spanMs
                }
                if (iterationPassMs !== undefined) {
                    this.lastIterationPassMs = iterationPassMs
                    this.iterationPassTimingSerial++
                }
                onSample({ spanMs, iterationPassMs, otherPassesMs, context })
            } catch { /* mapping raced with device loss */ }
            finally {
                try { buffer.unmap() } catch { /* already unmapped */ }
                this.readbackFree = true
            }
        }).catch(() => { this.readbackFree = true })
    }
}
