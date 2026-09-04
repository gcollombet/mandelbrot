import {describe, expect, it, vi} from 'vitest'
import {Engine} from '../../src/Engine'

vi.mock('mandelbrot', () => ({MandelbrotNavigator: class {}}))

function makeEngine(): any {
    return new Engine({} as HTMLCanvasElement, {colorStops: [], antialiasLevel: 1} as any)
}

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (error: Error) => void
    const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
    return {promise, resolve, reject}
}

describe('asynchronous iteration pipelines', () => {
    it('deduplicates a pending variant and reuses the completed pipeline', async () => {
        const engine = makeEngine()
        const compile = deferred<any>()
        engine.device = {createComputePipelineAsync: vi.fn(() => compile.promise)}
        const first = engine.precompileInplacePipeline(true)
        const second = engine.precompileInplacePipeline(true)
        expect(first).toBe(second)
        const pipeline = {}
        compile.resolve(pipeline)
        expect(await first).toBe(pipeline)
        expect(await engine.precompileInplacePipeline(true)).toBe(pipeline)
        expect(engine.device.createComputePipelineAsync).toHaveBeenCalledTimes(1)
    })

    it('does not let an abandoned device replace or remove a new-device compilation', async () => {
        const engine = makeEngine()
        const oldCompile = deferred<any>()
        engine.device = {createComputePipelineAsync: vi.fn(() => oldCompile.promise)}
        const oldRequest = engine.precompileInplacePipeline(false)
        const newCompile = deferred<any>()
        engine.device = {createComputePipelineAsync: vi.fn(() => newCompile.promise)}
        engine.inplacePipelinePending.clear()
        engine.inplacePipelineCache.clear()
        const newRequest = engine.precompileInplacePipeline(false)
        oldCompile.resolve({old: true})
        await oldRequest
        expect(engine.inplacePipelineCache.size).toBe(0)
        expect(engine.precompileInplacePipeline(false)).toBe(newRequest)
        const pipeline = {current: true}
        newCompile.resolve(pipeline)
        expect(await newRequest).toBe(pipeline)
        expect(await engine.precompileInplacePipeline(false)).toBe(pipeline)
    })

    it('propagates compilation failure and permits a later retry', async () => {
        const engine = makeEngine()
        const pipeline = {}
        engine.device = {createComputePipelineAsync: vi.fn()
            .mockRejectedValueOnce(new Error('shader rejected'))
            .mockResolvedValueOnce(pipeline)}
        await expect(engine.precompileInplacePipeline(true)).rejects.toThrow('shader rejected')
        expect(engine.inplacePipelinePending.size).toBe(0)
        expect(await engine.precompileInplacePipeline(true)).toBe(pipeline)
    })

    it('never caches a pipeline completed after destruction', async () => {
        const engine = makeEngine()
        const compile = deferred<any>()
        engine.device = {createComputePipelineAsync: () => compile.promise}
        const request = engine.precompileInplacePipeline(true)
        engine.destroyed = true
        compile.resolve({})
        await request
        expect(engine.inplacePipelineCache.size).toBe(0)
    })

    it.each(['mode', 'resize', 'options', 'destroy'])(
        'does not encode a stale frame when %s changes during compilation', async change => {
            const engine = makeEngine()
            const compile = deferred<any>()
            const createCommandEncoder = vi.fn()
            engine.device = {createComputePipelineAsync: () => compile.promise, createCommandEncoder}
            engine.needsMoreFrames = () => true
            for (const field of ['pipelineInplace', 'pipelineReprojectCs', 'pipelineResolve', 'pipelineColor',
                'bindGroupInplace', 'bindGroupReprojectCs', 'bindGroupResolve', 'bindGroupColor',
                'previousMandelbrot', 'previousRenderOptions', 'rawTexture']) engine[field] = {}
            const serial = engine.renderFrameSerial
            const frame = engine.render()
            if (change === 'mode') engine.renormEnabled = !engine.renormEnabled
            if (change === 'resize') engine.rawTexture = {}
            if (change === 'options') engine.previousRenderOptions = {}
            if (change === 'destroy') engine.destroyed = true
            compile.resolve({})
            await frame
            expect(createCommandEncoder).not.toHaveBeenCalled()
            expect(engine.renderFrameSerial).toBe(serial)
        },
    )
})

describe('color pipeline targets', () => {
    it.each([false, true])('preserves direct, rotation and linear AA semantics (surface=%s)', async surface => {
        const engine = makeEngine()
        engine.format = 'bgra8unorm'
        const device = {createRenderPipelineAsync: vi.fn(async descriptor => descriptor)}
        const layout = {}
        const pipelines = await engine.createColorPipelines(device, {}, layout, surface)
        for (const pipeline of Object.values(pipelines) as any[]) {
            expect(pipeline.layout).toBe(layout)
            expect(pipeline.fragment.constants.ENABLE_SURFACE_EFFECTS).toBe(Number(surface))
        }
        expect(pipelines.direct.fragment.entryPoint).toBe('fs_main_direct')
        expect(pipelines.direct.fragment.targets).toEqual([{format: 'bgra8unorm'}])
        expect(pipelines.rotation.vertex.entryPoint).toBe('vs_rotation_cache')
        expect(pipelines.rotation.fragment.entryPoint).toBe('fs_rotation_cache')
        expect(pipelines.clear.fragment.targets).toEqual([{format: 'rgba16float'}])
        expect(pipelines.accum.fragment.entryPoint).toBe('fs_main')
        expect(pipelines.accum.fragment.targets[0]).toEqual({
            format: 'rgba16float',
            blend: {
                color: {srcFactor: 'one', dstFactor: 'one', operation: 'add'},
                alpha: {srcFactor: 'one', dstFactor: 'one', operation: 'add'},
            },
        })
    })
})

function display(name: string, orbit: boolean, trap: boolean) {
    return {
        valuesArrayView: {name: name + ' values'},
        geometryView: {name: name + ' geometry'},
        metadataView: {name: name + ' metadata'},
        orbitGradientView: orbit ? {name: name + ' orbit'} : undefined,
        trapPayloadView: trap ? {name: name + ' trap'} : undefined,
    }
}

describe('merge display ownership', () => {
    it.each([[false, false], [true, false], [false, true], [true, true]])(
        'keeps input/output disjoint over successive merges (orbit=%s, trap=%s)', (orbit, trap) => {
            const engine = makeEngine()
            const live = display('live', orbit, trap)
            const frozen = display('frozen', orbit, trap)
            const destination = display('destination', orbit, trap)
            engine.resolvedDisplay = live
            engine.frozenDisplay = frozen
            engine.mergeDisplay = destination
            engine.uniformBufferMerge = {}
            engine.pipelineMerge = {getBindGroupLayout: () => ({})}
            engine.orbitGradientDummyView = {}
            engine.trapPayloadDummyView = {}
            engine.trapPayloadDummyStorageView = {}
            engine.device = {createBindGroup: vi.fn(descriptor => descriptor)}
            engine.rebuildColorBindGroup = vi.fn()
            engine.rebuildMergeBindGroup()
            for (const expectedFrozen of [destination, frozen]) {
                const entries = engine.bindGroupMerge.entries
                const resource = (binding: number) => entries.find((e: any) => e.binding === binding).resource
                expect(resource(1)).toBe(live.valuesArrayView)
                expect(resource(4)).toBe(engine.frozenDisplay.valuesArrayView)
                expect(resource(10)).not.toBe(resource(11))
                expect(resource(11)).toBe(engine.mergeDisplay.trapPayloadView ?? engine.trapPayloadDummyStorageView)
                engine.swapMergedDisplay()
                expect(engine.frozenDisplay).toBe(expectedFrozen)
                expect(engine.resolvedDisplay).toBe(live)
            }
            expect(engine.rebuildColorBindGroup).toHaveBeenCalledTimes(2)
        },
    )
})
