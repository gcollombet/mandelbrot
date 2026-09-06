import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureManifest } from './expmapFixtures'
import { changeExpmapDuration, changeExpmapSpeed, changeExpmapWindow, expmapVideoDefaults, exportExpmapVideo, validateExpmapVideoWindow } from '../../src/expmap/video'
import { planExpmap } from '../../src/expmap/plan'
import { interpolateScale, scaleDoublements } from '../../src/expmap/decimal'

const mock = vi.hoisted(() => ({ render: vi.fn(), add: vi.fn(), finalize: vi.fn(async () => null), cancel: vi.fn(async () => {}) }))
vi.mock('../../src/videoEncoderSink', () => ({ createVideoSink: async () => ({ addFrame: mock.add, finalize: mock.finalize, cancel: mock.cancel }) }))
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks() })
async function manifest() {
  const m = await fixtureManifest(); m.state = 'complete'
  m.projection = planExpmap({ domain: { cx: '0', cy: '0', startScale: '1048576e-1000000', endScale: '1e-1000000' }, width: 16, height: 12, density: 1 })
  return m
}
describe('ExpMap video timeline', () => {
  it('20 doublings at 2/s gives 10 seconds independently of fps and direction', async () => {
    const m = await manifest(), w = expmapVideoDefaults(m)
    expect(w.speed).toBe(2); expect(w.durationSeconds).toBe(10)
    const reverse = changeExpmapWindow(w, w.toScale, w.fromScale)
    expect(reverse.durationSeconds).toBe(10); validateExpmapVideoWindow(m, reverse)
    expect(changeExpmapDuration(w, 20).speed).toBe(1)
    expect(changeExpmapSpeed(w, 4).durationSeconds).toBe(5)
    const shorter = changeExpmapWindow(w, '1024e-1000000', w.toScale)
    expect(shorter.durationSeconds).toBe(5)
  })
  it('keeps positive-duration stationary rotations and exact extreme endpoints', async () => {
    const m = await manifest(), w = expmapVideoDefaults(m)
    const paused = changeExpmapWindow(w, w.fromScale, w.fromScale)
    expect(paused.speed).toBe(0); expect(paused.durationSeconds).toBeGreaterThan(0)
    validateExpmapVideoWindow(m, { ...paused, toAngle: Math.PI })
    expect(interpolateScale(w.fromScale, w.toScale, 0)).toBe(w.fromScale)
    expect(interpolateScale(w.fromScale, w.toScale, 1)).toBe(w.toScale)
    const a = '1.00000000000000000001e-1000000', b = '1e-1000000'
    expect(scaleDoublements(a, interpolateScale(a, b, 0.5))).toBeGreaterThan(0)
    expect(() => changeExpmapSpeed(w, 0)).toThrow()
    expect(() => changeExpmapDuration(w, NaN)).toThrow()
    expect(() => validateExpmapVideoWindow(m, { ...w, toScale: '1e-1000001' })).toThrow('domaine')
  })
  it('awaits complete frames in deterministic order with inclusive endpoints', async () => {
    const m = await manifest(), views: { scale: string; angle: number }[] = [], timestamps: number[] = []
    vi.stubGlobal('VideoFrame', class { constructor(_pixels: unknown, options: { timestamp: number }) { timestamps.push(options.timestamp) } close() {} })
    let active = false
    mock.render.mockImplementation(async (_source, view) => { expect(active).toBe(false); active = true; views.push(view); await Promise.resolve(); return new Uint8ClampedArray(16 * 12 * 4) })
    mock.add.mockImplementation(async () => { expect(active).toBe(true); await Promise.resolve(); active = false })
    const result = await exportExpmapVideo({ manifest: m }, { window: expmapVideoDefaults(m), width: 16, height: 12, fps: 2, codec: 'avc', destination: { kind: 'buffer' }, gpuRenderer: { render: view => mock.render({ manifest: m }, view) } })
    expect(result.framesEmitted).toBe(20); expect(mock.finalize).toHaveBeenCalledOnce()
    expect(views[0].scale).toBe(m.projection.domain.startScale); expect(views[19].scale).toBe(m.projection.domain.endScale)
    expect(timestamps).toEqual(Array.from({ length: 20 }, (_, i) => i * 500000))
  })
  it('cancels after the last complete frame without altering its document', async () => {
    const m = await manifest(), original = JSON.stringify(m), abort = new AbortController()
    vi.stubGlobal('VideoFrame', class { close() {} })
    mock.render.mockResolvedValue(new Uint8ClampedArray(16 * 12 * 4))
    mock.add.mockImplementation(async () => { abort.abort() })
    const result = await exportExpmapVideo({ manifest: m }, { window: expmapVideoDefaults(m), width: 16, height: 12, fps: 30, codec: 'avc', destination: { kind: 'buffer' }, gpuRenderer: { render: view => mock.render({ manifest: m }, view) }, signal: abort.signal })
    expect(result.cancelled).toBe(true); expect(result.framesEmitted).toBe(1)
    expect(mock.finalize).toHaveBeenCalledOnce(); expect(JSON.stringify(m)).toBe(original)
  })
})
