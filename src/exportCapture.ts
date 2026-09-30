// ── Export frame capture: linear colour → reduction → readback ──
//
// An exported frame is rendered at output × supersample into a LINEAR
// rgba16float target, reduced to the output size by the present shader, and
// read back (SDR VideoFrame, or HDR planes). Never through the sRGB direct
// colour pipeline: averaging encoded values is the gamma mistake, it darkens
// every edge of the film.
//
// A capture is requested between frames and fulfilled at the END of the next
// render(), reusing that frame's colour bind group. The output resolution is
// independent of the canvas: the colour pass derives its coordinates from
// normalised vertex UVs, so the target size only changes sampling density,
// which is what keeps the same parcours reproducible across window sizes.

import {readHdrGpuOutput, type HdrGpuOptions} from './hdrGpuOutput'
import {fullscreenPipelineDescriptor} from './gpuPipelines'
import {t} from './i18n'

export type CaptureRequest = {
    outputWidth: number
    outputHeight: number
    supersample: number
    timestampMicros: number
    durationMicros: number
}

type PendingCapture = CaptureRequest & {
    resolve: (frame: VideoFrame) => void
    resolveHdr?: (pixels: Uint16Array) => void
    hdrOptions?: HdrGpuOptions
    reject: (error: unknown) => void
}

/** What the capture needs from the frame that fulfils it. */
export type CaptureFrameContext = {
    device: GPUDevice
    /** SDR file format (the canvas may present in HDR). */
    format: GPUTextureFormat
    canvasFormat: GPUTextureFormat
    hdrRendering: boolean
    presentModule: GPUShaderModule
    presentLayout: GPUBindGroupLayout
    swapchainView: () => GPUTextureView
    colorBindGroup: GPUBindGroup
    /** Colour pipeline writing linear light for one sample (sample 0 of AA). */
    linearPipeline: GPURenderPipeline
    /** AA accumulator holding the frame (linear sum, sample count in alpha), when used. */
    accumulator: GPUTextureView | null
    /** Size of the accumulator raster (the canvas), for the tilted view. */
    accumulatorSize?: { width: number; height: number }
    /**
     * Cast shadows: size the height raster (may rebuild the colour group, which
     * is returned) and encode it for the linear pass. Absent when disabled.
     */
    /**
     * Tilted 3D view: encode the tilt of the linear source (w x h raster,
     * sample count in alpha) and return the present bind group the reduction
     * reads instead. Absent when the view is not tilted.
     */
    tiltView?: (encoder: GPUCommandEncoder, source: GPUTextureView, width: number, height: number) => GPUBindGroup
    castShadow?: {
        prepare: (width: number, height: number) => GPUBindGroup
        encode: (encoder: GPUCommandEncoder, width: number, height: number) => void
    }
}

/** Align a row stride to WebGPU's 256-byte copyTextureToBuffer requirement. */
export function alignRowBytes(bytes: number): number {
    return (bytes + 255) & ~255
}

export class ExportCapture {
    private pending?: PendingCapture
    /** Supersampled LINEAR render target: the reduction happens after it. */
    private linearTexture?: GPUTexture
    private linearView?: GPUTextureView
    /** Output-resolution target the present pass reduces into. */
    private outputTexture?: GPUTexture
    private outputView?: GPUTextureView
    private readbackBuffer?: GPUBuffer
    /** Reduction pipelines keyed by factor — DOWNSCALE is a creation constant. */
    private readonly presentPipelines = new Map<number, GPURenderPipeline>()
    private presentBindGroup?: GPUBindGroup
    /** Reduce-pass binding onto the AA accumulator, rebuilt when it changes. */
    private accumBindGroup?: GPUBindGroup
    private accumBindGroupSource?: GPUTextureView
    /** Present pipeline at 1:1, mirroring each exported frame on screen. */
    private mirrorPipeline?: GPURenderPipeline
    private resourceKey = ''

    get isPending(): boolean { return this.pending !== undefined }

    /** Request an SDR frame. `maxDimension` is the device texture limit. */
    requestFrame(request: CaptureRequest, maxDimension: number): Promise<VideoFrame> {
        if (this.pending) return Promise.reject(new Error(t('engine.export.captureAlreadyPending')))
        if (!Number.isInteger(request.supersample) || request.supersample < 1) {
            return Promise.reject(new Error(
                `Capture supersample must be a positive integer (got ${request.supersample}). `
                + 'A fractional factor has no exact box filter.',
            ))
        }
        const superWidth = request.outputWidth * request.supersample
        const superHeight = request.outputHeight * request.supersample
        if (superWidth > maxDimension || superHeight > maxDimension) {
            return Promise.reject(new Error(t('engine.export.captureTargetTooLarge', { width: superWidth, height: superHeight, maxDim: maxDimension })))
        }
        return new Promise<VideoFrame>((resolve, reject) => {
            this.pending = { ...request, resolve, reject }
        })
    }

    /** Request HDR planes. */
    requestHdr(width: number, height: number, supersample: number, hdrOptions: HdrGpuOptions, maxDimension: number): Promise<Uint16Array> {
        if (this.pending) return Promise.reject(new Error(t('engine.export.captureAlreadyPending')))
        if (!Number.isSafeInteger(supersample) || supersample < 1
            || ![width, height].every(n => Number.isSafeInteger(n) && n > 0 && n * supersample <= maxDimension)) {
            return Promise.reject(new Error(t('engine.export.hdrDimensionsInvalid')))
        }
        return new Promise((resolveHdr, reject) => {
            this.pending = {
                outputWidth: width, outputHeight: height, supersample,
                timestampMicros: 0, durationMicros: 1,
                resolve: frame => frame.close(), resolveHdr, hdrOptions, reject,
            }
        })
    }

    /** The presentation format changed: the on-screen mirror must be rebuilt. */
    invalidateMirror(): void {
        this.mirrorPipeline = undefined
    }

    destroy(reason: string): void {
        this.cancel(reason)
        this.linearTexture?.destroy?.()
        this.outputTexture?.destroy?.()
        this.readbackBuffer?.destroy?.()
    }

    /** Abandon the pending capture (session end, engine destroyed). */
    cancel(reason: string): void {
        this.pending?.reject(new Error(reason))
        this.pending = undefined
    }

    /** Fulfil the pending capture from the frame being rendered. */
    async fulfil(frame: CaptureFrameContext): Promise<void> {
        const request = this.pending
        if (!request) return
        this.pending = undefined
        try {
            const { outputWidth, outputHeight, supersample } = request
            const hdr = !!request.resolveHdr
            this.ensureResources(frame, outputWidth, outputHeight, supersample, hdr)
            const { device } = frame
            const encoder = device.createCommandEncoder({ label: 'Engine ExportCapture' })

            // With AA on, the frame already lives in the accumulator as a linear
            // sum with the sample count in alpha — exactly what the reduce pass
            // expects (present.wgsl normalises by alpha). Re-rendering a single
            // sample would throw the accumulation away. Otherwise render sample
            // 0: linear RGB, alpha 1, never discarded by the per-pixel AA gate.
            let reduceSource: GPUBindGroup
            if (frame.accumulator) {
                if (this.accumBindGroupSource !== frame.accumulator) {
                    this.accumBindGroup = device.createBindGroup({
                        layout: frame.presentLayout,
                        entries: [{ binding: 0, resource: frame.accumulator }],
                        label: 'Engine BindGroup ExportAccum',
                    })
                    this.accumBindGroupSource = frame.accumulator
                }
                reduceSource = this.accumBindGroup!
                if (frame.tiltView) {
                    const size = frame.accumulatorSize
                    if (size) reduceSource = frame.tiltView(encoder, frame.accumulator, size.width, size.height)
                }
            } else {
                const linearWidth = outputWidth * supersample
                const linearHeight = outputHeight * supersample
                let colorBindGroup = frame.colorBindGroup
                if (frame.castShadow) {
                    colorBindGroup = frame.castShadow.prepare(linearWidth, linearHeight)
                    frame.castShadow.encode(encoder, linearWidth, linearHeight)
                }
                const linear = encoder.beginRenderPass({
                    colorAttachments: [{ view: this.linearView!, clearValue: { r: 0, g: 0, b: 0, a: 0 }, loadOp: 'clear', storeOp: 'store' }],
                    label: 'Engine ExportCapture Linear',
                })
                linear.setPipeline(frame.linearPipeline)
                linear.setBindGroup(0, colorBindGroup)
                linear.draw(6, 1, 0, 0)
                linear.end()
                reduceSource = frame.tiltView
                    ? frame.tiltView(encoder, this.linearView!, linearWidth, linearHeight)
                    : this.presentBindGroup!
            }

            const reduce = encoder.beginRenderPass({
                colorAttachments: [{ view: this.outputView!, clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
                label: 'Engine ExportCapture Reduce',
            })
            reduce.setPipeline(this.presentPipelines.get(supersample)!)
            reduce.setBindGroup(0, reduceSource)
            reduce.draw(6, 1, 0, 0)
            reduce.end()

            // Mirror the exported frame onto the canvas: the interactive loop is
            // parked for the session, so otherwise the user watches a black
            // screen for the whole render.
            try {
                const mirror = encoder.beginRenderPass({
                    colorAttachments: [{ view: frame.swapchainView(), clearValue: { r: 0, g: 0, b: 0, a: 1 }, loadOp: 'clear', storeOp: 'store' }],
                    label: 'Engine ExportCapture Mirror',
                })
                mirror.setPipeline(this.mirrorPipeline!)
                mirror.setBindGroup(0, reduceSource)
                mirror.draw(6, 1, 0, 0)
                mirror.end()
            } catch {
                // A missing swapchain texture must never fail the export.
            }

            if (request.resolveHdr) {
                device.queue.submit([encoder.finish()])
                request.resolveHdr(await readHdrGpuOutput(device, this.outputTexture!, outputWidth, outputHeight, request.hdrOptions!))
                return
            }
            const bytesPerRow = alignRowBytes(outputWidth * 4)
            encoder.copyTextureToBuffer(
                { texture: this.outputTexture! },
                { buffer: this.readbackBuffer!, offset: 0, bytesPerRow },
                { width: outputWidth, height: outputHeight, depthOrArrayLayers: 1 },
            )
            device.queue.submit([encoder.finish()])
            await this.readbackBuffer!.mapAsync(GPUMapMode.READ)
            const pixels = new Uint8Array(this.readbackBuffer!.getMappedRange().slice(0))
            this.readbackBuffer!.unmap()
            request.resolve(new VideoFrame(pixels, {
                format: frame.format === 'bgra8unorm' ? 'BGRA' : 'RGBA',
                codedWidth: outputWidth,
                codedHeight: outputHeight,
                timestamp: request.timestampMicros,
                duration: request.durationMicros,
                layout: [{ offset: 0, stride: bytesPerRow }],
                colorSpace: { primaries: 'bt709', transfer: 'iec61966-2-1', matrix: 'bt709', fullRange: true },
            }))
        } catch (error) {
            request.reject(error)
        }
    }

    /** (Re)allocate the chain when the requested geometry or format changes. */
    private ensureResources(frame: CaptureFrameContext, outputWidth: number, outputHeight: number, supersample: number, hdr: boolean): void {
        const { device } = frame
        const key = `${outputWidth}x${outputHeight}@${supersample}:${frame.format}:${hdr}`
        if (this.resourceKey !== key) {
            this.presentPipelines.clear()
            this.mirrorPipeline = undefined
            this.linearTexture?.destroy?.()
            this.outputTexture?.destroy?.()
            this.readbackBuffer?.destroy?.()
            this.linearTexture = device.createTexture({
                size: { width: outputWidth * supersample, height: outputHeight * supersample },
                format: 'rgba16float',
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING,
                label: 'Engine ExportLinearTexture',
            })
            this.linearView = this.linearTexture.createView({ label: 'Engine ExportLinearView' })
            this.outputTexture = device.createTexture({
                size: { width: outputWidth, height: outputHeight },
                format: hdr ? 'rgba16float' : frame.format,
                usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
                label: 'Engine ExportOutputTexture',
            })
            this.outputView = this.outputTexture.createView({ label: 'Engine ExportOutputView' })
            this.readbackBuffer = hdr ? undefined : device.createBuffer({
                size: alignRowBytes(outputWidth * 4) * outputHeight,
                usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
                label: 'Engine ExportReadback',
            })
            this.presentBindGroup = device.createBindGroup({
                layout: frame.presentLayout,
                entries: [{ binding: 0, resource: this.linearView }],
                label: 'Engine BindGroup ExportPresent',
            })
            this.resourceKey = key
        }
        const presentLayout = () => device.createPipelineLayout({ bindGroupLayouts: [frame.presentLayout] })
        if (!this.mirrorPipeline) {
            // Mirrors the supersampled linear target onto the swapchain 1:1: the
            // compute surface is pinned to output × supersample, exactly the
            // linear target's size, so DOWNSCALE stays 1.
            this.mirrorPipeline = device.createRenderPipeline(fullscreenPipelineDescriptor({
                label: 'Engine RenderPipeline ExportMirror',
                module: frame.presentModule,
                layout: presentLayout(),
                targets: [{ format: frame.canvasFormat }],
                constants: { DOWNSCALE: 1, HDR_OUTPUT: frame.hdrRendering ? 1 : 0 },
            }))
        }
        if (!this.presentPipelines.has(supersample)) {
            this.presentPipelines.set(supersample, device.createRenderPipeline(fullscreenPipelineDescriptor({
                label: `Engine RenderPipeline ExportPresent x${supersample}`,
                module: frame.presentModule,
                layout: presentLayout(),
                targets: [{ format: hdr ? 'rgba16float' : frame.format }],
                // Mitchell rather than a block average: the box reduction folds
                // ~7x more energy back across the output Nyquist, and on a
                // fractal that fold-back is what makes boundary detail crawl
                // between frames of the film. Set to 0 to A/B the box.
                constants: { DOWNSCALE: supersample, REDUCE_MITCHELL: 1, LINEAR_OUTPUT: hdr ? 1 : 0 },
            })))
        }
    }
}
