import shader from './assets/hdr_output.wgsl?raw'

export const HDR_CLIPPING_WARNING = 'Certaines hautes lumières ont été écrêtées à 10 000 nits. L’export continue ; réduire l’exposition HDR pour conserver leurs détails.'

export type HdrGpuOptions = {
  format: 'video' | 'png'
  onWarning?: (message: string) => void
  exposure?: number
  originX?: number
  originY?: number
  signal?: { readonly aborted: boolean }
}
const pipelines = new WeakMap<GPUDevice, Map<string, Promise<GPUComputePipeline>>>()
const abort = (options: HdrGpuOptions) => {
  if (options.signal?.aborted) throw new DOMException('Export annulé', 'AbortError')
}
/** Packed output: I420P10 for video, big-endian RGB16 bytes for PNG.
 * Stripe the readback so 8K PNG works within maxStorageBufferBindingSize.
 * No float pixels are read by JS; JS only copies whole planes/stripes.
 */
export async function readHdrGpuOutput(device: GPUDevice, source: GPUTexture, width: number, height: number, options: HdrGpuOptions): Promise<Uint16Array> {
  const video = options.format === 'video', exposure = options.exposure ?? 0
  if (!['video','png'].includes(options.format) || ![width,height].every(n => Number.isSafeInteger(n) && n > 0) || (video && (width % 2 || height % 2))) throw new Error('Dimensions HDR invalides.')
  if (!Number.isFinite(exposure) || Math.abs(exposure) > 16) throw new Error('Exposition HDR invalide.')
  if (![options.originX ?? 0,options.originY ?? 0].every(n => Number.isSafeInteger(n) && n >= 0 && n <= 0xffffffff)) throw new Error('Origine HDR invalide.')
  abort(options)
  const rowBytes = width * (video ? 3 : 6)
  const limit = Math.min(32 * 1024 * 1024, device.limits.maxStorageBufferBindingSize, device.limits.maxBufferSize - 4)
  const multiple = video ? 2 : 1
  const rows = Math.min(height, Math.floor(limit / rowBytes / multiple) * multiple)
  if (rows < multiple) throw new Error('Limite GPU insuffisante pour la sortie HDR.')
  const size = Math.ceil(rowBytes * rows / 4) * 4
  let formats = pipelines.get(device)
  if (!formats) { formats = new Map(); pipelines.set(device, formats) }
  let pending = formats.get(options.format)
  if (!pending) {
    pending = device.createComputePipelineAsync({layout:'auto', compute:{module:device.createShaderModule({code:shader}), entryPoint:options.format}})
    formats.set(options.format, pending)
    void pending.catch(() => formats!.delete(options.format))
  }
  const pipeline = await pending
  abort(options)
  const buffers: GPUBuffer[] = []
  let failure: unknown
  device.pushErrorScope('out-of-memory'); device.pushErrorScope('validation')
  try {
    const make = (size: number, usage: GPUBufferUsageFlags) => {
      const buffer = device.createBuffer({size,usage}); buffers.push(buffer); return buffer
    }
    const output = make(size,GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST)
    const status = make(4,GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST)
    const readback = make(size + 4,GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST)
    const uniform = make(32,GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
    const bind = device.createBindGroup({layout:pipeline.getBindGroupLayout(0), entries:[
      {binding:0,resource:source.createView()}, {binding:1,resource:{buffer:uniform}},
      {binding:2,resource:{buffer:output}}, {binding:3,resource:{buffer:status}},
    ]})
    const result = new Uint16Array(width * height * (video ? 1.5 : 3))
    const params = new ArrayBuffer(32), ints = new Uint32Array(params), floats = new Float32Array(params)
    ints.set([width,height,0,rows]); floats[4] = 203 * 2 ** exposure
    ints[5] = options.originX ?? 0; ints[6] = options.originY ?? 0
    let clipped = false
    for (let y = 0; y < height; y += rows) {
      abort(options)
      const count = Math.min(rows,height-y), shorts = width*count*(video?1.5:3), bytes = Math.ceil(shorts*2/4)*4
      ints[2] = y; ints[3] = count
      device.queue.writeBuffer(uniform,0,params)
      const encoder = device.createCommandEncoder()
      encoder.clearBuffer(output); encoder.clearBuffer(status)
      const pass = encoder.beginComputePass()
      pass.setPipeline(pipeline); pass.setBindGroup(0,bind)
      pass.dispatchWorkgroups(Math.ceil(width/(video?16:8)),Math.ceil(count/(video?16:8))); pass.end()
      encoder.copyBufferToBuffer(output,0,readback,0,bytes)
      encoder.copyBufferToBuffer(status,0,readback,size,4)
      device.queue.submit([encoder.finish()])
      await readback.mapAsync(GPUMapMode.READ)
      try {
        abort(options)
        const mapped = readback.getMappedRange()
        const flags = new Uint32Array(mapped,size,1)[0]
        if (flags & 1) throw new Error('Luminance HDR non finie. Vérifier le rendu et les matériaux.')
        clipped ||= !!(flags & 2)
        const data = new Uint16Array(mapped,0,shorts)
        if (video) {
          const n = width*count, full = width*height
          result.set(data.subarray(0,n),y*width)
          result.set(data.subarray(n,n+n/4),full+y*width/4)
          result.set(data.subarray(n+n/4),full+full/4+y*width/4)
        } else result.set(data,y*width*3)
      } finally { readback.unmap() }
    }
    if (clipped) options.onWarning?.(HDR_CLIPPING_WARNING)
    return result
  } catch (error) { failure = error; throw error }
  finally {
    for (const buffer of buffers) buffer.destroy()
    const validation = await device.popErrorScope(), memory = await device.popErrorScope()
    if (!failure && (validation || memory)) throw new Error((validation || memory)!.message)
  }
}
