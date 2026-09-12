import { describe, expect, it, vi } from 'vitest'
import { ShaderDrawBatch } from '../../src/expmap/displayBatch'

function fixture(fence: () => Promise<void> = async () => {}) {
  const pass = { end: vi.fn() }
  const commands = { beginRenderPass: vi.fn(() => pass), finish: vi.fn(() => ({})) }
  const queue = { writeBuffer: vi.fn(), submit: vi.fn(), onSubmittedWorkDone: vi.fn(fence) }
  const device = { queue, createCommandEncoder: vi.fn(() => commands) }
  return { queue, device, batch: new ShaderDrawBatch(device as unknown as GPUDevice, {} as GPUBuffer, {} as GPUTextureView) }
}

describe('shader draw batching', () => {
  it('keeps distinct aligned parameters for 32 draws in one submission', async () => {
    const { batch, queue, device } = fixture()
    const offsets: number[] = []
    for (let i = 0; i < 32; i++) {
      await batch.draw(new Float32Array([i]), (_pass, offset) => offsets.push(offset))
      if (i < 31) expect(queue.submit).not.toHaveBeenCalled()
    }
    expect(new Set(offsets).size).toBe(32)
    expect(offsets.every(offset => offset % 256 === 0)).toBe(true)
    expect(queue.submit).toHaveBeenCalledTimes(1)
    expect(queue.onSubmittedWorkDone).not.toHaveBeenCalled()
    expect(device.createCommandEncoder).toHaveBeenCalledTimes(1)
    await batch.draw(new Float32Array([32]), (_pass, offset) => expect(offset).toBe(0))
    await batch.flush()
    expect(queue.submit).toHaveBeenCalledTimes(2)
  })

  it('waits for submitted full batches even when no partial batch remains', async () => {
    let complete!: () => void
    const { batch, queue } = fixture(() => new Promise<void>(resolve => { complete = resolve }))
    for (let i = 0; i < 64; i++) await batch.draw(new Float32Array([i]), () => {})
    expect(queue.submit).toHaveBeenCalledTimes(2)
    expect(queue.onSubmittedWorkDone).not.toHaveBeenCalled()
    const calls = queue.writeBuffer.mock.invocationCallOrder
    expect(queue.submit.mock.invocationCallOrder[0]).toBeGreaterThan(calls[31])
    expect(queue.submit.mock.invocationCallOrder[0]).toBeLessThan(calls[32])
    let released = false
    const eviction = batch.flush().then(() => { released = true })
    await Promise.resolve()
    expect(released).toBe(false)
    complete()
    await eviction
    expect(released).toBe(true)
    await batch.flush()
    expect(queue.onSubmittedWorkDone).toHaveBeenCalledTimes(1)
  })

  it('does not release a partial batch for eviction before the GPU fence', async () => {
    let complete!: () => void
    const { batch, queue } = fixture(() => new Promise<void>(resolve => { complete = resolve }))
    await batch.draw(new Float32Array([1]), () => {})
    let released = false
    const eviction = batch.flush().then(() => { released = true })
    await Promise.resolve()
    expect(queue.submit).toHaveBeenCalledTimes(1)
    expect(released).toBe(false)
    complete()
    await eviction
    expect(released).toBe(true)
    await batch.flush()
    expect(queue.submit).toHaveBeenCalledTimes(1)
  })
})
