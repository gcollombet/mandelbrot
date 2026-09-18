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

describe('in-place kernel specialisation ladder', () => {
    function refusing(refuse: (constants: Record<string, number>) => boolean) {
        return vi.fn(async (descriptor: any) => {
            const constants = descriptor.compute.constants
            if (refuse(constants)) throw new Error('VK_ERROR_INITIALIZATION_FAILED')
            return {constants}
        })
    }

    it('keeps both full kernels when the driver accepts them', async () => {
        const engine = makeEngine()
        engine.device = {createComputePipelineAsync: refusing(() => false)}
        const {deep, shallow} = await engine.compileInplacePipelines()
        expect(deep.constants).toMatchObject({ENABLE_DEEP: 1, ENABLE_PORTFOLIO: 1, ENABLE_PERIODIC_SCHEDULING: 1})
        expect(shallow.constants).toMatchObject({ENABLE_DEEP: 0, ENABLE_PORTFOLIO: 1, ENABLE_PERIODIC_SCHEDULING: 1})
        expect(engine.inplacePortfolioUnavailable).toBe(false)
        expect(engine.inplacePeriodicSchedulingUnavailable).toBe(false)
        expect(engine.inplaceDeepUnavailable).toBe(false)
    })

    it('drops the deep kernel alone when only it is refused', async () => {
        const engine = makeEngine()
        engine.device = {createComputePipelineAsync: refusing(c => c.ENABLE_DEEP === 1)}
        const {deep, shallow} = await engine.compileInplacePipelines()
        expect(deep).toBeUndefined()
        expect(shallow.constants).toMatchObject({ENABLE_PORTFOLIO: 1, ENABLE_PERIODIC_SCHEDULING: 1})
        expect(engine.inplaceDeepUnavailable).toBe(true)
        expect(engine.inplacePortfolioUnavailable).toBe(false)
    })

    it('compiles portfolio out when the driver refuses the shallow kernel with it', async () => {
        const engine = makeEngine()
        engine.device = {createComputePipelineAsync: refusing(c => c.ENABLE_PORTFOLIO === 1)}
        const {deep, shallow} = await engine.compileInplacePipelines()
        expect(shallow.constants).toMatchObject({ENABLE_DEEP: 0, ENABLE_PORTFOLIO: 0, ENABLE_PERIODIC_SCHEDULING: 1})
        // The deep kernel is retried with the reduced tier set.
        expect(deep.constants).toMatchObject({ENABLE_DEEP: 1, ENABLE_PORTFOLIO: 0})
        expect(engine.inplaceDeepUnavailable).toBe(false)
        expect(engine.inplacePortfolioUnavailable).toBe(true)
        expect(engine.inplacePeriodicSchedulingUnavailable).toBe(false)
        // Runtime lookups keep asking for portfolio and land on the reduced kernel.
        engine.portfolioEnabled = true
        const {key, descriptor} = engine.inplacePipelineSpec(false, true, false, true)
        expect(descriptor.compute.constants.ENABLE_PORTFOLIO).toBe(0)
        expect(engine.inplacePipelineCache.get(key)).toBe(shallow)
    })

    it('then compiles periodic scheduling out, and retries deep with the reduced set', async () => {
        const engine = makeEngine()
        engine.device = {createComputePipelineAsync: refusing(c =>
            c.ENABLE_PORTFOLIO === 1 || c.ENABLE_PERIODIC_SCHEDULING === 1 || c.ENABLE_DEEP === 1)}
        const {deep, shallow} = await engine.compileInplacePipelines()
        expect(shallow.constants).toMatchObject({ENABLE_DEEP: 0, ENABLE_PORTFOLIO: 0, ENABLE_PERIODIC_SCHEDULING: 0})
        expect(deep).toBeUndefined()
        expect(engine.inplaceDeepUnavailable).toBe(true)
        expect(engine.inplacePortfolioUnavailable).toBe(true)
        expect(engine.inplacePeriodicSchedulingUnavailable).toBe(true)
        // Full, portfolio-off, both-off for shallow; two deep attempts.
        expect(engine.device.createComputePipelineAsync).toHaveBeenCalledTimes(5)
    })

    it('fails initialisation with the first driver error once the ladder is exhausted', async () => {
        const engine = makeEngine()
        engine.device = {createComputePipelineAsync: refusing(() => true)}
        await expect(engine.compileInplacePipelines()).rejects.toThrow(/VK_ERROR_INITIALIZATION_FAILED/)
        expect(engine.inplacePortfolioUnavailable).toBe(true)
        expect(engine.inplacePeriodicSchedulingUnavailable).toBe(true)
    })

    it('does not pin tiers off for a device abandoned during compilation', async () => {
        const engine = makeEngine()
        const createComputePipelineAsync = vi.fn(async () => {
            // A setup retry replaced the device while this compile was in flight.
            engine.device = {createComputePipelineAsync}
            throw new Error('lost')
        })
        engine.device = {createComputePipelineAsync}
        await expect(engine.compileInplacePipelines()).rejects.toThrow('lost')
        expect(engine.inplacePortfolioUnavailable).toBe(false)
        expect(engine.inplaceDeepUnavailable).toBe(false)
    })
})
