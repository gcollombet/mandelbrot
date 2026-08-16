import {describe, expect, it} from 'vitest'
import {
    VideoExportFrameTimeout,
    elapsedForFrame,
    runVideoExport,
    totalFramesFor,
    validateVideoExportSettings,
    type VideoExportDriver,
    type VideoExportFrame,
    type VideoExportSettings,
} from '../../src/videoExportSession'

const SETTINGS: VideoExportSettings = {
    fps: 30,
    durationSeconds: 1,
    maxPumpsPerFrame: 50,
}

type FakeDriverOptions = {
    /** Pumps each frame needs before it converges. Default: 0 (already ready). */
    pumpsNeeded?: (frameIndex: number) => number
    emitThrowsOn?: number
}

function fakeDriver(options: FakeDriverOptions = {}) {
    const pumpsNeeded = options.pumpsNeeded ?? (() => 0)
    const clockCalls: (number | null)[] = []
    const emitted: VideoExportFrame[] = []
    let frameIndex = -1
    let pumpsThisFrame = 0
    let draws = 0

    const driver: VideoExportDriver = {
        setExportTime(elapsedSeconds) {
            clockCalls.push(elapsedSeconds)
            if (elapsedSeconds !== null) {
                frameIndex++
                pumpsThisFrame = 0
            }
        },
        async drawOnce() {
            draws++
            pumpsThisFrame++
        },
        isFrameReady() {
            return pumpsThisFrame >= pumpsNeeded(frameIndex)
        },
        async emitFrame(frame) {
            if (options.emitThrowsOn === frame.index) throw new Error('sink exploded')
            emitted.push(frame)
        },
    }

    return {
        driver,
        clockCalls,
        emitted,
        get draws() { return draws },
        /** Absolute times the camera was placed at, in order. */
        get placements() { return clockCalls.filter((t): t is number => t !== null) },
    }
}

describe('totalFramesFor', () => {
    it('rounds up so a parcours is never cut short of its duration', () => {
        expect(totalFramesFor({fps: 30, durationSeconds: 1})).toBe(30)
        expect(totalFramesFor({fps: 30, durationSeconds: 30})).toBe(900)
        expect(totalFramesFor({fps: 24, durationSeconds: 1 / 3})).toBe(8)
        expect(totalFramesFor({fps: 30, durationSeconds: 0.51})).toBe(16)
    })
})

describe('elapsedForFrame', () => {
    // Stepping by 1/fps would leave the last frame at (N-1)/fps — a travel shot
    // that stops just before arriving. Both endpoints must be exact.
    it('places the first frame on A and the last exactly on B', () => {
        for (const [fps, duration] of [
            [30, 2], [30, 30], [30, 0.5], [60, 1.5], [24, 5], [25, 12.5], [24, 1 / 3],
        ] as const) {
            const total = totalFramesFor({fps, durationSeconds: duration})
            expect(elapsedForFrame(0, total, duration)).toBe(0)
            expect(elapsedForFrame(total - 1, total, duration)).toBe(duration)
        }
    })

    it('is monotonic across the parcours', () => {
        const total = totalFramesFor({fps: 30, durationSeconds: 3})
        for (let i = 1; i < total; i++) {
            expect(elapsedForFrame(i, total, 3)).toBeGreaterThan(elapsedForFrame(i - 1, total, 3))
        }
    })

    // Re-derived from the index rather than accumulated: summing 1/fps in f64
    // does not reliably reach the duration.
    it('never drifts past the duration', () => {
        const total = totalFramesFor({fps: 30, durationSeconds: 0.5})
        for (let i = 0; i < total; i++) {
            expect(elapsedForFrame(i, total, 0.5)).toBeLessThanOrEqual(0.5)
        }
    })

    it('degenerates safely to a single frame on B', () => {
        expect(elapsedForFrame(0, 1, 4)).toBe(4)
    })
})

describe('validateVideoExportSettings', () => {
    it('accepts sane settings', () => {
        expect(validateVideoExportSettings(SETTINGS)).toEqual([])
    })

    it.each([
        ['zero fps', {fps: 0}],
        ['negative duration', {durationSeconds: -1}],
        ['NaN duration', {durationSeconds: Number.NaN}],
        ['zero pump budget', {maxPumpsPerFrame: 0}],
    ])('rejects %s', (_label, override) => {
        expect(validateVideoExportSettings({...SETTINGS, ...override}).length).toBeGreaterThan(0)
    })
})

describe('runVideoExport', () => {
    it('emits exactly one frame per parcours position, in order', async () => {
        const fake = fakeDriver()
        const result = await runVideoExport(fake.driver, SETTINGS)

        expect(result.totalFrames).toBe(30)
        expect(result.framesEmitted).toBe(30)
        expect(fake.emitted.map(f => f.index)).toEqual([...Array(30).keys()])
        expect(fake.emitted[0].elapsedSeconds).toBe(0)
        expect(fake.emitted[29].elapsedSeconds).toBe(1)
    })

    // The whole point of the frozen/live cycle: most frames need no compute at
    // all, and the loop must not spend a pump proving it.
    it('counts frames that needed no pump as free', async () => {
        const fake = fakeDriver({pumpsNeeded: i => (i % 10 === 0 ? 3 : 0)})
        const result = await runVideoExport(fake.driver, SETTINGS)

        expect(result.freeFrames).toBe(27)
        expect(result.totalPumps).toBe(9)
        expect(fake.draws).toBe(9)
    })

    // Idempotence of setExportTime is what makes pumping safe; the loop must
    // still only place the camera once per frame.
    it('places the camera once per frame regardless of pumps spent', async () => {
        const fake = fakeDriver({pumpsNeeded: () => 7})
        await runVideoExport(fake.driver, SETTINGS)

        expect(fake.placements).toHaveLength(30)
        expect(fake.draws).toBe(30 * 7)
    })

    it('never emits a frame before it is ready', async () => {
        const readyAt = new Map<number, number>()
        const fake = fakeDriver({pumpsNeeded: i => i % 4})
        await runVideoExport(fake.driver, SETTINGS)

        for (const frame of fake.emitted) {
            expect(frame.pumps).toBe(frame.index % 4)
            readyAt.set(frame.index, frame.pumps)
        }
        expect(readyAt.size).toBe(30)
    })

    it('reports progress as frames emitted over total', async () => {
        const fake = fakeDriver()
        const seen: string[] = []
        await runVideoExport(fake.driver, SETTINGS, {
            onProgress: p => seen.push(`${p.framesEmitted}/${p.totalFrames}`),
        })

        expect(seen).toHaveLength(30)
        expect(seen[0]).toBe('1/30')
        expect(seen[29]).toBe('30/30')
    })

    describe('a frame that will not converge', () => {
        it('fails with the offending frame index instead of emitting it', async () => {
            const fake = fakeDriver({pumpsNeeded: i => (i === 3 ? 999 : 0)})
            const settings = {...SETTINGS, maxPumpsPerFrame: 5}

            await expect(runVideoExport(fake.driver, settings))
                .rejects.toBeInstanceOf(VideoExportFrameTimeout)

            expect(fake.emitted.map(f => f.index)).toEqual([0, 1, 2])
            expect(fake.emitted.some(f => f.index === 3)).toBe(false)
        })

        it('carries the frame index on the error', async () => {
            const fake = fakeDriver({pumpsNeeded: i => (i === 3 ? 999 : 0)})
            const error = await runVideoExport(fake.driver, {...SETTINGS, maxPumpsPerFrame: 5})
                .catch((e: unknown) => e as VideoExportFrameTimeout)

            expect(error).toBeInstanceOf(VideoExportFrameTimeout)
            expect((error as VideoExportFrameTimeout).frameIndex).toBe(3)
        })
    })

    describe('cancellation', () => {
        it('stops between frames and reports how far it got', async () => {
            const signal = {aborted: false}
            const fake = fakeDriver()
            const result = await runVideoExport(fake.driver, SETTINGS, {
                signal,
                onProgress: p => { if (p.framesEmitted === 5) signal.aborted = true },
            })

            expect(result.cancelled).toBe(true)
            expect(result.framesEmitted).toBe(5)
            expect(fake.emitted).toHaveLength(5)
        })

        it('stops mid-frame without emitting a partial frame', async () => {
            const signal = {aborted: false}
            let draws = 0
            const driver: VideoExportDriver = {
                setExportTime() {},
                async drawOnce() { draws++; if (draws === 3) signal.aborted = true },
                isFrameReady() { return false },
                async emitFrame() { throw new Error('must not emit') },
            }

            const result = await runVideoExport(driver, SETTINGS, {signal})
            expect(result.cancelled).toBe(true)
            expect(result.framesEmitted).toBe(0)
        })
    })

    // Leaving the engine pinned to an export time would freeze the interactive
    // view at the last rendered frame, long after the export ended.
    describe('releases the clock on every exit path', () => {
        it('after a successful run', async () => {
            const fake = fakeDriver()
            await runVideoExport(fake.driver, SETTINGS)
            expect(fake.clockCalls.at(-1)).toBeNull()
        })

        it('after cancellation', async () => {
            const signal = {aborted: false}
            const fake = fakeDriver()
            await runVideoExport(fake.driver, SETTINGS, {
                signal,
                onProgress: () => { signal.aborted = true },
            })
            expect(fake.clockCalls.at(-1)).toBeNull()
        })

        it('after a frame times out', async () => {
            const fake = fakeDriver({pumpsNeeded: () => 999})
            await runVideoExport(fake.driver, {...SETTINGS, maxPumpsPerFrame: 2}).catch(() => {})
            expect(fake.clockCalls.at(-1)).toBeNull()
        })

        it('after the frame sink throws', async () => {
            const fake = fakeDriver({emitThrowsOn: 2})
            await runVideoExport(fake.driver, SETTINGS).catch(() => {})
            expect(fake.clockCalls.at(-1)).toBeNull()
        })
    })

    it('rejects invalid settings before touching the driver', async () => {
        const fake = fakeDriver()
        await expect(runVideoExport(fake.driver, {...SETTINGS, fps: 0})).rejects.toThrow(/Invalid/)
        expect(fake.clockCalls).toHaveLength(0)
    })
})
