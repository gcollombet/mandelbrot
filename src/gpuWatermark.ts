import { WATERMARK, WATERMARK_ACTIVITY_FULL, type WatermarkSettings } from './exportWatermark'

// ── Export watermark on the GPU ──
// The pass the SDR export runs between the reduction and the readback: it
// reads the finished 8-bit frame and writes it back with the mark on blue.
// Same maths as `applyWatermark` (exportWatermark.ts), which stays the
// reference the tests pin down; doing it per pixel in JS halved the export rate.

const SHADER = /* wgsl */`
struct Params { k1: vec2<f32>, k2: vec2<f32>, centre: vec2<f32>, amplitude: f32, flatShare: f32 }
@group(0) @binding(0) var source: texture_2d<f32>;
@group(0) @binding(1) var<uniform> p: Params;
@vertex fn vs(@builtin(vertex_index) i: u32) -> @builtin(position) vec4<f32> {
  var corners = array<vec2<f32>, 3>(vec2<f32>(-1.0, -1.0), vec2<f32>(3.0, -1.0), vec2<f32>(-1.0, 3.0));
  return vec4<f32>(corners[i], 0.0, 1.0);
}
@fragment fn fs(@builtin(position) pos: vec4<f32>) -> @location(0) vec4<f32> {
  let at = vec2<i32>(pos.xy);
  let src = textureLoad(source, at, 0);
  // pos.xy is the pixel centre (x + 0.5), the origin the waves are phased on.
  let uv = pos.xy - p.centre;
  let pattern = cos(dot(p.k1, uv)) + cos(dot(p.k2, uv));
  // How busy the picture is here: green against the pixels two to the left and two above.
  let g = src.g * 255.0;
  var change = 0.0;
  if (at.x >= 2) { change += abs(g - textureLoad(source, at - vec2<i32>(2, 0), 0).g * 255.0); }
  if (at.y >= 2) { change += abs(g - textureLoad(source, at - vec2<i32>(0, 2), 0).g * 255.0); }
  let strength = p.amplitude * (p.flatShare + (1.0 - p.flatShare) * min(1.0, change / ${WATERMARK_ACTIVITY_FULL}.0));
  // Interleaved gradient noise keeps fractional amplitudes on average.
  let noise = fract(52.9829189 * fract(dot(vec2<f32>(at), vec2<f32>(0.06711056, 0.00583715))));
  let blue = clamp(round(src.b * 255.0) + floor(strength * pattern + noise), 0.0, 255.0);
  return vec4<f32>(src.r, src.g, blue / 255.0, src.a);
}`

export class GpuWatermark {
  private pipeline?: GPURenderPipeline
  private pipelineFormat?: GPUTextureFormat
  private uniform?: GPUBuffer
  private target?: GPUTexture
  private targetKey = ''
  private bindGroup?: GPUBindGroup
  private bindSource?: GPUTexture

  /** Encode the pass and return the texture to read the marked frame from. */
  encode(device: GPUDevice, encoder: GPUCommandEncoder, source: GPUTexture, format: GPUTextureFormat, width: number, height: number,
    settings: Pick<WatermarkSettings, 'amplitude' | 'flatShare'>): GPUTexture {
    if (!this.pipeline || this.pipelineFormat !== format) {
      const module = device.createShaderModule({ code: SHADER, label: 'Engine ShaderModule Watermark' })
      this.pipeline = device.createRenderPipeline({
        layout: 'auto', label: 'Engine Pipeline Watermark',
        vertex: { module, entryPoint: 'vs' }, fragment: { module, entryPoint: 'fs', targets: [{ format }] },
      })
      this.pipelineFormat = format
      this.bindGroup = undefined
    }
    this.uniform ??= device.createBuffer({ size: 32, usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST, label: 'Engine Watermark Uniform' })
    const key = `${width}x${height}:${format}`
    if (!this.target || this.targetKey !== key) {
      this.target?.destroy()
      this.target = device.createTexture({ size: [width, height], format, usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC, label: 'Engine Watermark Output' })
      this.targetKey = key
    }
    if (!this.bindGroup || this.bindSource !== source) {
      this.bindGroup = device.createBindGroup({ layout: this.pipeline.getBindGroupLayout(0), entries: [
        { binding: 0, resource: source.createView() }, { binding: 1, resource: { buffer: this.uniform } },
      ] })
      this.bindSource = source
    }
    const a1 = WATERMARK.baseAngle * Math.PI / 180, a2 = a1 + WATERMARK.angleBetween * Math.PI / 180
    const w1 = 2 * Math.PI * WATERMARK.baseFrequency / height, w2 = w1 * WATERMARK.frequencyRatio
    device.queue.writeBuffer(this.uniform, 0, new Float32Array([
      w1 * Math.cos(a1), w1 * Math.sin(a1), w2 * Math.cos(a2), w2 * Math.sin(a2), width / 2, height / 2, settings.amplitude, settings.flatShare,
    ]))
    const pass = encoder.beginRenderPass({
      colorAttachments: [{ view: this.target.createView(), loadOp: 'clear', storeOp: 'store', clearValue: { r: 0, g: 0, b: 0, a: 1 } }],
      label: 'Engine ExportCapture Watermark',
    })
    pass.setPipeline(this.pipeline)
    pass.setBindGroup(0, this.bindGroup)
    pass.draw(3)
    pass.end()
    return this.target
  }

  destroy(): void {
    this.target?.destroy()
    this.uniform?.destroy()
    this.target = undefined; this.uniform = undefined; this.bindGroup = undefined; this.pipeline = undefined
  }
}
