// ── Unfinished-pixel counter: GPU → CPU feedback of convergence ──
//
// Every iteration dispatch accumulates, in a 16-byte storage buffer, the
// pixels still unfinished, the weighted work consumed, the scheduling-weighted
// unfinished population and the pixels throttled by the periodic score. The
// buffer is copied into a small ring of mappable slots and read back
// asynchronously, so a mapping in flight never stalls the next frame.
//
// Two numbers keep the readbacks honest. `sequence` orders them: a slot that
// maps late never overwrites a newer count. `generation` changes whenever the
// field is invalidated (clear, pan, parameter change): a count sampled before
// that is rejected on arrival.

export const COUNTER_WORDS = 4
export const COUNTER_BYTES = COUNTER_WORDS * Uint32Array.BYTES_PER_ELEMENT
const COUNTER_READBACK_BUFFER_COUNT = 3
/** Frames between two counter samples (1 = every frame). */
export const COUNTER_SAMPLE_INTERVAL_FRAMES = 1

export type PixelCounterSample = {
    frame: number
    /** Pixels still unfinished after the dispatch. */
    unfinished: number
    /** Weighted work units the dispatch consumed (already rescaled). */
    actualWeightedWork: number
    /** Scheduling-weighted unfinished population (full=1, medium=1/4, strong periodic=1/8). */
    effectiveUnfinished: number
    /** Unfinished pixels whose periodic score reduced their local batch. */
    periodicThrottled: number
}

type Slot = {
    buffer: GPUBuffer
    pending: boolean
    sequence: number
    generation: number
}

/** Reservation of one readback slot for the frame being encoded. */
export type CounterReadback = {
    slot: Slot
    sequence: number
    generation: number
    frame: number
    /** Log2 scale the shader applied to the weighted-work word. */
    workCounterShift: number
}

export class PixelCounter {
    /** Pixels still needing work. -1 = not yet known, 0 = fully converged. */
    unfinished = -1
    effectiveUnfinished = -1
    periodicThrottled = -1
    /** Render frame at which the last applied count was sampled. */
    sampleFrame = -1

    private storage?: GPUBuffer
    private slots: Slot[] = []
    private writeIndex = 0
    private sequence = 0
    private latestAppliedSequence = 0
    private generation = 0
    private lastDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES

    /** Storage buffer bound to the iteration kernel (binding 6). */
    get buffer(): GPUBuffer | undefined { return this.storage }

    allocate(device: GPUDevice): void {
        this.destroy()
        this.storage = device.createBuffer({
            size: COUNTER_BYTES,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
            label: 'Engine Counter Storage',
        })
        this.slots = Array.from({ length: COUNTER_READBACK_BUFFER_COUNT }, (_, index) => ({
            buffer: device.createBuffer({
                size: COUNTER_BYTES,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: `Engine Counter Readback ${index}`,
            }),
            pending: false,
            sequence: 0,
            generation: 0,
        }))
        this.writeIndex = 0
    }

    destroy(): void {
        this.storage?.destroy?.()
        this.storage = undefined
        for (const slot of this.slots) slot.buffer.destroy?.()
        this.slots = []
    }

    /** The field changed under the counter: every count in flight is stale. */
    invalidate(): void {
        this.unfinished = -1
        this.effectiveUnfinished = -1
        this.periodicThrottled = -1
        this.generation++
        this.lastDispatchFrame = -COUNTER_SAMPLE_INTERVAL_FRAMES
        this.sampleFrame = -1
    }

    /** A readback of the current generation has not landed yet. */
    hasPendingForCurrentGeneration(): boolean {
        return this.slots.some(slot => slot.pending && slot.generation === this.generation)
    }

    /** Whether a frame should sample the counter (unknown count, or interval elapsed). */
    isSampleDue(frame: number): boolean {
        return this.unfinished < 0 || frame - this.lastDispatchFrame >= COUNTER_SAMPLE_INTERVAL_FRAMES
    }

    /** Reserve a free slot of the ring for this frame, or undefined when all are mapping. */
    reserve(frame: number, workCounterShift: number): CounterReadback | undefined {
        const slotCount = this.slots.length
        for (let i = 0; i < slotCount; i++) {
            const index = (this.writeIndex + i) % slotCount
            const slot = this.slots[index]
            if (!slot.pending) {
                this.writeIndex = (index + 1) % slotCount
                return { slot, sequence: 0, generation: this.generation, frame, workCounterShift }
            }
        }
        return undefined
    }

    /** Encode the copy of this frame's counter into its reserved slot. */
    encodeCopy(encoder: GPUCommandEncoder, readback: CounterReadback): void {
        readback.sequence = ++this.sequence
        readback.generation = this.generation
        encoder.copyBufferToBuffer(this.storage!, 0, readback.slot.buffer, 0, COUNTER_BYTES)
        this.lastDispatchFrame = readback.frame
    }

    /**
     * Map the slot after submission. `onSample` receives every decoded sample
     * (the batch controller learns from all of them); `onApplied` only those
     * that update the current count, with the count they replaced.
     */
    schedule(
        readback: CounterReadback,
        onSample: (sample: PixelCounterSample) => void,
        onApplied: (sample: PixelCounterSample, previousUnfinished: number) => void,
    ): void {
        const { slot } = readback
        slot.pending = true
        slot.sequence = readback.sequence
        slot.generation = readback.generation
        void (async () => {
            let mapped = false
            try {
                await slot.buffer.mapAsync(GPUMapMode.READ)
                mapped = true
                const data = new Uint32Array(slot.buffer.getMappedRange())
                const sample = decodeCounter(data, readback.frame, readback.workCounterShift)
                onSample(sample)
                const previous = this.apply(readback, sample)
                if (previous !== null) onApplied(sample, previous)
            } catch {
                // Buffer destruction or device loss can reject an outstanding readback.
            } finally {
                if (mapped) slot.buffer.unmap()
                slot.pending = false
            }
        })()
    }

    /** Adopt a sample unless stale; returns the replaced count, or null when rejected. */
    apply(readback: Pick<CounterReadback, 'sequence' | 'generation'>, sample: PixelCounterSample): number | null {
        if (readback.generation !== this.generation) return null
        if (readback.sequence <= this.latestAppliedSequence) return null
        this.latestAppliedSequence = readback.sequence
        const previous = this.unfinished
        this.unfinished = sample.unfinished
        this.effectiveUnfinished = sample.effectiveUnfinished
        this.periodicThrottled = sample.periodicThrottled
        this.sampleFrame = sample.frame
        return previous
    }
}

/** Decode the four counter words. Word 2 is in 1/8 pixel units. */
export function decodeCounter(words: Uint32Array, frame: number, workCounterShift: number): PixelCounterSample {
    return {
        frame,
        unfinished: words[0],
        actualWeightedWork: words[1] * 2 ** workCounterShift,
        effectiveUnfinished: words[2] / 8,
        periodicThrottled: words[3],
    }
}
