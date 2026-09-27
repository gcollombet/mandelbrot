import {describe, expect, it} from 'vitest'
import {bind, bindGroupLayoutDescriptor, computePipelineDescriptor, fullscreenPipelineDescriptor} from '../../src/gpuPipelines'

const FRAGMENT = 2, VERTEX = 1
const module = {} as GPUShaderModule
const layout = {} as GPUPipelineLayout

describe('gpu pipeline descriptors', () => {
    it('numbers bindings in declaration order and applies per-entry visibility', () => {
        const descriptor = bindGroupLayoutDescriptor('L', FRAGMENT, [
            bind.uniform(VERTEX | FRAGMENT),
            bind.data('2d-array'),
            bind.image(),
            bind.uint(),
            bind.storageTexture('write-only', 'rgba32float'),
            bind.sampler(),
            bind.readOnlyStorage(),
        ])
        expect(descriptor.label).toBe('L')
        expect([...descriptor.entries]).toEqual([
            { binding: 0, visibility: 3, buffer: { type: 'uniform' } },
            { binding: 1, visibility: 2, texture: { sampleType: 'unfilterable-float', viewDimension: '2d-array' } },
            { binding: 2, visibility: 2, texture: { sampleType: 'float', viewDimension: '2d' } },
            { binding: 3, visibility: 2, texture: { sampleType: 'uint', viewDimension: '2d' } },
            { binding: 4, visibility: 2, storageTexture: { access: 'write-only', format: 'rgba32float', viewDimension: '2d' } },
            { binding: 5, visibility: 2, sampler: { type: 'filtering' } },
            { binding: 6, visibility: 2, buffer: { type: 'read-only-storage' } },
        ])
    })

    it('builds a full-screen pass with default entry points and no empty keys', () => {
        const d = fullscreenPipelineDescriptor({ module, layout, targets: [{ format: 'rgba16float' }, null] })
        expect(d).toEqual({
            layout,
            vertex: { module, entryPoint: 'vs_main' },
            fragment: { module, entryPoint: 'fs_main', targets: [{ format: 'rgba16float' }, null] },
            primitive: { topology: 'triangle-list' },
        })
        const e = fullscreenPipelineDescriptor({ label: 'x', module, layout, targets: [], constants: { A: 1 }, vertexEntry: 'vs_b', fragmentEntry: 'fs_b' })
        expect(e.vertex.entryPoint).toBe('vs_b')
        expect(e.fragment).toMatchObject({ entryPoint: 'fs_b', constants: { A: 1 } })
        expect(e.label).toBe('x')
    })

    it('builds a compute pass on cs_main', () => {
        expect(computePipelineDescriptor({ label: 'c', module, layout, constants: { ENABLE_DEEP: 1 } })).toEqual({
            layout, label: 'c', compute: { module, entryPoint: 'cs_main', constants: { ENABLE_DEEP: 1 } },
        })
    })
})
