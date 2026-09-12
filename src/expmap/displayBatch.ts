// Uniform offsets obey WebGPU's portable 256-byte alignment. Each draw owns
// its slot until submission. Later queue writes execute after that submission.
export const SHADER_BATCH_CAPACITY = 32
export const SHADER_BATCH_BYTES = SHADER_BATCH_CAPACITY * 256

export class ShaderDrawBatch {
  private count = 0
  private pending = false
  private commands?: GPUCommandEncoder
  private pass?: GPURenderPassEncoder
  private device: GPUDevice
  private uniform: GPUBuffer
  private target: GPUTextureView
  constructor(device: GPUDevice, uniform: GPUBuffer, target: GPUTextureView) {
    this.device = device
    this.uniform = uniform
    this.target = target
  }

  async draw(values: Float32Array<ArrayBuffer>, encode: (pass: GPURenderPassEncoder, offset: number) => void) {
    if (!this.pass) {
      this.commands = this.device.createCommandEncoder()
      this.pass = this.commands.beginRenderPass({ colorAttachments: [
        { view: this.target, loadOp: 'load', storeOp: 'store' },
      ] })
    }
    const offset = this.count * 256
    this.device.queue.writeBuffer(this.uniform, offset, values)
    encode(this.pass, offset)
    this.count++
    if (this.count === SHADER_BATCH_CAPACITY) this.submit()
  }

  private submit() {
    if (!this.pass) return
    this.pass.end()
    this.device.queue.submit([this.commands!.finish()])
    this.pending = true
    this.pass = undefined
    this.commands = undefined
    this.count = 0
  }

  /** Drain even an empty batch: full batches may already be in flight. */
  async flush() {
    this.submit()
    if (!this.pending) return
    await this.device.queue.onSubmittedWorkDone()
    this.pending = false
  }
}
