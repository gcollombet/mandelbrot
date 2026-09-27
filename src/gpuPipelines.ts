// ── Declarative WebGPU pipeline and layout descriptors ──
//
// Every pass of the engine is one of two shapes: a full-screen triangle pair
// (`vs_main` → `fs_main`, triangle-list) or a compute kernel (`cs_main`). Its
// bind group layout is a list of bindings numbered in declaration order.
// These builders keep each pass to what distinguishes it: its bindings, its
// targets and its override constants.

export type BindingSpec =
    | { kind: 'buffer'; type: GPUBufferBindingType; visibility?: number }
    | { kind: 'texture'; sampleType: GPUTextureSampleType; dimension: GPUTextureViewDimension; visibility?: number }
    | { kind: 'storageTexture'; access: GPUStorageTextureAccess; format: GPUTextureFormat; dimension: GPUTextureViewDimension; visibility?: number }
    | { kind: 'sampler'; type: GPUSamplerBindingType; visibility?: number }

/** Binding shorthands. `visibility` overrides the layout's stage for one entry. */
export const bind = {
    uniform: (visibility?: number): BindingSpec => ({ kind: 'buffer', type: 'uniform', visibility }),
    storage: (visibility?: number): BindingSpec => ({ kind: 'buffer', type: 'storage', visibility }),
    readOnlyStorage: (visibility?: number): BindingSpec => ({ kind: 'buffer', type: 'read-only-storage', visibility }),
    /** Unfilterable f32 texture (textureLoad only). */
    data: (dimension: GPUTextureViewDimension = '2d'): BindingSpec => ({ kind: 'texture', sampleType: 'unfilterable-float', dimension }),
    /** Filterable f32 texture (sampled). */
    image: (dimension: GPUTextureViewDimension = '2d'): BindingSpec => ({ kind: 'texture', sampleType: 'float', dimension }),
    uint: (dimension: GPUTextureViewDimension = '2d'): BindingSpec => ({ kind: 'texture', sampleType: 'uint', dimension }),
    storageTexture: (access: GPUStorageTextureAccess, format: GPUTextureFormat, dimension: GPUTextureViewDimension = '2d'): BindingSpec =>
        ({ kind: 'storageTexture', access, format, dimension }),
    sampler: (): BindingSpec => ({ kind: 'sampler', type: 'filtering' }),
}

export function bindGroupLayoutDescriptor(label: string, visibility: number, bindings: BindingSpec[]): GPUBindGroupLayoutDescriptor {
    return {
        label,
        entries: bindings.map((spec, index): GPUBindGroupLayoutEntry => {
            const entry = { binding: index, visibility: spec.visibility ?? visibility }
            switch (spec.kind) {
                case 'buffer': return { ...entry, buffer: { type: spec.type } }
                case 'texture': return { ...entry, texture: { sampleType: spec.sampleType, viewDimension: spec.dimension } }
                case 'storageTexture': return { ...entry, storageTexture: { access: spec.access, format: spec.format, viewDimension: spec.dimension } }
                case 'sampler': return { ...entry, sampler: { type: spec.type } }
            }
        }),
    }
}

export type FullscreenPassSpec = {
    label?: string
    module: GPUShaderModule
    layout: GPUPipelineLayout
    targets: (GPUColorTargetState | null)[]
    constants?: Record<string, number>
    vertexEntry?: string
    fragmentEntry?: string
}

/** Full-screen pass: two triangles from `vs_main`, shaded by `fs_main`. */
export function fullscreenPipelineDescriptor(spec: FullscreenPassSpec): GPURenderPipelineDescriptor {
    return {
        layout: spec.layout,
        vertex: { module: spec.module, entryPoint: spec.vertexEntry ?? 'vs_main' },
        fragment: {
            module: spec.module,
            entryPoint: spec.fragmentEntry ?? 'fs_main',
            targets: spec.targets,
            ...(spec.constants ? { constants: spec.constants } : {}),
        },
        primitive: { topology: 'triangle-list' },
        ...(spec.label ? { label: spec.label } : {}),
    }
}

export type ComputePassSpec = {
    label: string
    module: GPUShaderModule
    layout: GPUPipelineLayout
    constants?: Record<string, number>
    entryPoint?: string
}

export function computePipelineDescriptor(spec: ComputePassSpec): GPUComputePipelineDescriptor {
    return {
        layout: spec.layout,
        compute: {
            module: spec.module,
            entryPoint: spec.entryPoint ?? 'cs_main',
            ...(spec.constants ? { constants: spec.constants } : {}),
        },
        label: spec.label,
    }
}

/** A shader module, its bind group layout and the matching pipeline layout. */
export type PassLayout = { module: GPUShaderModule; bindGroupLayout: GPUBindGroupLayout; pipelineLayout: GPUPipelineLayout }

export function createPassLayout(device: GPUDevice, name: string, code: string, visibility: number, bindings: BindingSpec[]): PassLayout {
    const module = device.createShaderModule({ code, label: `Engine ShaderModule ${name}` })
    const bindGroupLayout = device.createBindGroupLayout(bindGroupLayoutDescriptor(`Engine BindGroupLayout ${name}`, visibility, bindings))
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [bindGroupLayout] })
    return { module, bindGroupLayout, pipelineLayout }
}
