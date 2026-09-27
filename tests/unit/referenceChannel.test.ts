import {describe, expect, it, vi} from 'vitest'
import {
    ReferenceChannel,
    orbitProgress,
    TABLE_CLEAR_FALLBACK_MS,
    type ReferenceHost,
    type ReferenceWorkerRequest,
    type ReferenceWorkerResponse,
} from '../../src/referenceChannel'

const view = { cx: '-0.75', cy: '0.1', scale: '1e-3', angle: 0, maxIterations: 1000, viewportAspect: 16 / 9 }
const parameters = { approximationMode: 'bla' as const, blaEpsilon: 1e-6, maxBlaSkip: 65536, precisionBudget: '1e-30' }

function setup(maxIterations = 1000) {
    const posted: ReferenceWorkerRequest[] = []
    const worker = { postMessage: vi.fn((m: ReferenceWorkerRequest) => posted.push(m)), terminate: vi.fn(), onmessage: null as any, onerror: null as any }
    const host = {
        maxIterations: vi.fn(() => maxIterations),
        writeOrbit: vi.fn(),
        writeBlaTable: vi.fn(),
        reanchor: vi.fn(),
        requestRender: vi.fn(),
        requestClear: vi.fn(),
        invalidateCounter: vi.fn(),
    } satisfies ReferenceHost
    const channel = new ReferenceChannel(host, () => worker as any)
    channel.start()
    const send = (message: ReferenceWorkerResponse) => channel.handleMessage(message)
    const job = () => (posted.filter(m => m.type === 'reset').at(-1) as any)?.jobId as number
    return { channel, host, worker, posted, send, job }
}

const chunk = (jobId: number, refId: number, offset: number, count: number, cx = '-0.75') => ({
    type: 'orbitChunk' as const, jobId, refId, offset, count, maxIterations: 1000,
    referenceCx: cx, referenceCy: '0.1', orbit: new Float32Array((count - offset) * 2), computeMs: 1,
})
const table = (jobId: number, refId: number, tableGeneration: number) => ({
    type: 'blaReady' as const, jobId, refId, tableGeneration, buildMs: 1,
    steps: new Float32Array(11), levels: new Uint32Array(5), levelCount: 3, maxIterations: 1000,
})

describe('ReferenceChannel', () => {
    it('queues requests until the worker is ready, then flushes them in order', () => {
        const { channel, worker, send } = setup()
        channel.syncView(view, parameters)
        expect(worker.postMessage).not.toHaveBeenCalled()
        send({ type: 'ready' })
        expect(worker.postMessage.mock.calls.map(([m]) => m.type)).toEqual(['reset', 'updateView'])
    })

    it('ignores every response of an older job', () => {
        const { channel, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job() - 1, 1, 0, 10))
        expect(channel.staging).toBeNull()
    })

    it('cold start: the first chunk promotes at once and the orbit streams to the GPU', () => {
        const { channel, host, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 100))
        expect(channel.promoteIfReady()).toBe(true)
        expect(channel.active?.refId).toBe(1)
        expect(host.reanchor).toHaveBeenCalledWith('-0.75', '0.1')
        expect(host.writeOrbit).toHaveBeenCalledWith(0, expect.any(Float32Array))
        expect(channel.consumeOrbitReset()).toBe(true)
        expect(channel.consumeOrbitReset()).toBe(false)
        expect(channel.progress).toMatchObject({ availableIter: 99, guardedMaxIter: 99, incomplete: true })

        host.requestRender.mockClear()
        send(chunk(job(), 1, 100, 1001))
        expect(host.writeOrbit).toHaveBeenLastCalledWith(100 * 2 * 4, expect.any(Float32Array))
        expect(channel.progress).toMatchObject({ availableIter: 1000, incomplete: false })
        expect(host.requestRender).toHaveBeenCalledOnce()     // the frame that completes the visible orbit
        host.requestRender.mockClear()
        send(chunk(job(), 1, 1001, 1500))                     // headroom beyond maxIter: no render
        expect(host.requestRender).not.toHaveBeenCalled()
    })

    it('keeps the active reference until the staged one covers the visible orbit', () => {
        const { channel, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 1001))
        channel.promoteIfReady()
        send(chunk(job(), 2, 0, 500, '-0.7'))
        expect(channel.promoteIfReady()).toBe(false)
        send(chunk(job(), 2, 500, 1001, '-0.7'))
        expect(channel.promoteIfReady()).toBe(true)
        expect(channel.active?.cx).toBe('-0.7')
    })

    it('drops a staging chunk that would leave a hole, and lets a newer refId supersede staging', () => {
        const { channel, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 1001))
        channel.promoteIfReady()
        send(chunk(job(), 2, 0, 100))
        send(chunk(job(), 2, 200, 300))                       // hole: dropped
        expect(channel.staging?.orbitLen).toBe(100)
        send(chunk(job(), 3, 50, 100))                        // unknown ref, non-zero offset: dropped
        expect(channel.staging?.refId).toBe(2)
        send(chunk(job(), 3, 0, 10))
        expect(channel.staging?.refId).toBe(3)
        send(chunk(job(), 2, 0, 10))                          // older than staging: ignored
        expect(channel.staging?.refId).toBe(3)
    })

    it('defers the clear of a table-parameter change until the matching table lands', () => {
        const { channel, host, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 1001))
        channel.promoteIfReady()
        channel.setBlaEpsilon(1e-5, true)
        expect(channel.tableClearPending).toBe(true)
        expect(host.requestClear).not.toHaveBeenCalled()
        send(table(job(), 1, channel.tableGeneration - 1))    // built under the old ε: dropped
        expect(channel.blaLevelCount).toBe(0)
        send(table(job(), 1, channel.tableGeneration))
        expect(host.requestClear).toHaveBeenCalledWith('tableReady')
        expect(channel.tableClearPending).toBe(false)
        expect(channel.blaLevelCount).toBe(3)
        expect(host.writeBlaTable).toHaveBeenCalledOnce()
    })

    it('clears at the deadline when the table never comes, and at once in perturbation', () => {
        const { channel, host } = setup()
        channel.setMaxBlaSkip(1024, true)
        channel.checkTableClearDeadline(performance.now())
        expect(host.requestClear).not.toHaveBeenCalled()
        channel.checkTableClearDeadline(performance.now() + TABLE_CLEAR_FALLBACK_MS + 1)
        expect(host.requestClear).toHaveBeenCalledWith('tableDeadline')
        channel.setApproximationMode('perturbation')
        expect(host.requestClear).toHaveBeenLastCalledWith('tableClear')
        expect(channel.tableClearPending).toBe(false)
    })

    it('keeps a staged table with its reference and uploads it on promotion', () => {
        const { channel, host, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 1001))
        channel.promoteIfReady()
        send(chunk(job(), 2, 0, 1001, '-0.7'))
        send(table(job(), 2, channel.tableGeneration))
        expect(host.writeBlaTable).not.toHaveBeenCalled()
        channel.promoteIfReady()
        expect(host.writeBlaTable).toHaveBeenCalledOnce()
        expect(channel.blaLevelCount).toBe(3)
    })

    it('a worker error stops posting and releases export waits', () => {
        const { channel, send, job, worker } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send({ type: 'error', jobId: job(), message: 'boom' })
        expect(channel.failed).toBe(true)
        expect(channel.progress.incomplete).toBe(false)
        expect(channel.exportPending(1000)).toBe(false)
        const calls = worker.postMessage.mock.calls.length
        channel.setBlaEpsilon(1e-5, true)
        expect(worker.postMessage.mock.calls.length).toBe(calls)
    })

    it('a precision budget change restarts the job without dropping the active reference', () => {
        const { channel, posted, send, job } = setup()
        send({ type: 'ready' })
        channel.syncView(view, parameters)
        send(chunk(job(), 1, 0, 1001))
        channel.promoteIfReady()
        channel.restartAtNextView()
        channel.syncView(view, { ...parameters, precisionBudget: '1e-300' })
        expect(posted.filter(m => m.type === 'reset')).toHaveLength(2)
        expect(channel.active?.refId).toBe(1)
    })
})

describe('orbitProgress', () => {
    it('caps the shader at the computed orbit', () => {
        expect(orbitProgress(0, 500, false)).toEqual({ availableIter: 0, remainingIter: 500, guardedMaxIter: 0, incomplete: true })
        expect(orbitProgress(301, 500, false)).toEqual({ availableIter: 300, remainingIter: 200, guardedMaxIter: 300, incomplete: true })
        expect(orbitProgress(2001, 500, false)).toEqual({ availableIter: 2000, remainingIter: 0, guardedMaxIter: 500, incomplete: false })
        expect(orbitProgress(10, 500, true).incomplete).toBe(false)
    })
})
