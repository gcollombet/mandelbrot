import { afterEach, describe, expect, it, vi } from 'vitest'
import { fixtureManifest } from './expmapFixtures'
import { changeExpmapDuration, changeExpmapSpeed, changeExpmapWindow, expmapVideoDefaults, exportExpmapVideo, validateExpmapVideoWindow, loadExpmapVideoWindow, saveExpmapVideoWindow } from '../../src/expmap/video'
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
    expect(shorter.durationSeconds).toBe(10)
    expect(changeExpmapWindow(changeExpmapSpeed(w, 2), '1024e-1000000', w.toScale).durationSeconds).toBe(5)
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
    const m = await manifest(), views: { scale: string; angle: number;maxSamples:number }[] = [], timestamps: number[] = []
    vi.stubGlobal('VideoFrame', class { constructor(_pixels: unknown, options: { timestamp: number }) { timestamps.push(options.timestamp) } close() {} })
    let active = false
    mock.render.mockImplementation(async (_source, view) => { expect(active).toBe(false); active = true; views.push(view); await Promise.resolve(); return new Uint8ClampedArray(16 * 12 * 4) })
    mock.add.mockImplementation(async () => { expect(active).toBe(true); await Promise.resolve(); active = false })
    const result = await exportExpmapVideo({ manifest: m }, { window: expmapVideoDefaults(m), width: 16, height: 12, fps: 2, codec: 'avc', destination: { kind: 'buffer' }, gpuRenderer: { render: view => mock.render({ manifest: m }, view) } })
    expect(result.framesEmitted).toBe(20); expect(mock.finalize).toHaveBeenCalledOnce()
    expect(views[0].scale).toBe(m.projection.domain.startScale); expect(views[19].scale).toBe(m.projection.domain.endScale)
    expect(views.every(view=>view.maxSamples===16)).toBe(true)
    expect(timestamps).toEqual(Array.from({ length: 20 }, (_, i) => i * 500000))
  })
  it('forwards the selected sampling ceiling and rejects invalid values before rendering',async()=>{
    const m=await manifest()
    vi.stubGlobal('VideoFrame',class {close(){}})
    mock.add.mockResolvedValue(undefined);mock.render.mockResolvedValue({})
    const request={window:expmapVideoDefaults(m),width:16,height:12,fps:1,codec:'avc' as const,destination:{kind:'buffer' as const},gpuRenderer:{render:mock.render},maxSamples:256}
    await exportExpmapVideo({manifest:m},request)
    expect(mock.render.mock.calls.every(([view])=>view.maxSamples===256)).toBe(true)
    mock.render.mockClear()
    await expect(exportExpmapVideo({manifest:m},{...request,maxSamples:32})).rejects.toThrow('Prélèvements')
    expect(mock.render).not.toHaveBeenCalled()
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
  it('slows both camera coordinates, reaches the exact endpoint and holds it across frames', async () => {
    const m = await manifest(), views: { scale: string; angle: number }[] = []
    vi.stubGlobal('VideoFrame', class { close() {} })
    mock.add.mockResolvedValue(undefined)
    const window = { ...changeExpmapDuration(expmapVideoDefaults(m), 4), toAngle: 5 * Math.PI, easeIn: 'smooth' as const, easeInSeconds: 1, easeOut: 'linger' as const, easeOutSeconds: 3, holdSeconds: 2 }
    const result = await exportExpmapVideo({ manifest: m }, { window, width:16, height:12, fps:10, codec:'avc', destination:{kind:'buffer'}, gpuRenderer:{render:async view => {views.push(view);return {} as OffscreenCanvas}} })
    expect(result.framesEmitted).toBe(60)
    expect(views[0]).toMatchObject({scale:window.fromScale,angle:0})
    for (const view of views.slice(40)) expect(view).toMatchObject({scale:window.toScale,angle:window.toAngle})
    for (let i=1;i<views.length;i++) expect(views[i].angle).toBeGreaterThanOrEqual(views[i-1].angle)
    expect(views[39].angle - views[38].angle).toBeLessThan((views[20].angle - views[19].angle) / 100)
    expect(views[59].scale).toBe(window.toScale)
  })
  it('restores legacy linear windows and persists independent easing and hold values', async () => {
    const m=await manifest(), values=new Map<string,string>()
    vi.stubGlobal('localStorage',{getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>values.set(key,value)})
    const {easeIn,easeOut,easeInSeconds,easeOutSeconds,holdSeconds,...legacy}=expmapVideoDefaults(m)
    saveExpmapVideoWindow(m.documentId,legacy)
    expect(loadExpmapVideoWindow(m)).toMatchObject({reset:false,window:{easeIn:'none',easeOut:'none',holdSeconds:0}})
    const window={...legacy,easeIn:'smooth' as const,easeOut:'linger' as const,easeInSeconds:1,easeOutSeconds:7,holdSeconds:3}
    saveExpmapVideoWindow(m.documentId,window)
    expect(loadExpmapVideoWindow(m)).toEqual({reset:false,window})
  })

  it('preserves endpoint angles even when subtraction loses precision', async () => {
    const m=await manifest(), views:{angle:number}[]=[]
    vi.stubGlobal('VideoFrame',class {close(){}});mock.add.mockResolvedValue(undefined)
    const window={...changeExpmapDuration(expmapVideoDefaults(m),1),fromAngle:1e16,toAngle:.1,holdSeconds:1}
    await exportExpmapVideo({manifest:m},{window,width:16,height:12,fps:2,codec:'avc',destination:{kind:'buffer'},gpuRenderer:{render:async v=>{views.push(v);return {} as OffscreenCanvas}}})
    expect(views[0].angle).toBe(1e16)
    expect(views[views.length-1].angle).toBe(.1)
  })

})

it('snapshots effects for every exported frame and rejects invalid effects before rendering', async () => {
  const m = await manifest()
  vi.stubGlobal('VideoFrame', class { close() {} })
  const effects = { droste: 30, kaleidoscope: 6, orientation: 15 }
  mock.render.mockImplementation(async () => { effects.droste = 99; return {} })
  mock.add.mockResolvedValue(undefined)
  const request = { window: expmapVideoDefaults(m), width: 16, height: 12, fps: 1, codec: 'avc' as const, destination: { kind: 'buffer' as const }, gpuRenderer: { render: mock.render }, effects }
  await exportExpmapVideo({ manifest: m }, request)
  expect(mock.render.mock.calls.length).toBeGreaterThan(1)
  expect(mock.render.mock.calls.every(([view]) => view.effects.droste === 30 && view.effects.kaleidoscope === 6 && view.effects.orientation === 15)).toBe(true)
  mock.render.mockClear()
  await expect(exportExpmapVideo({ manifest: m }, { ...request, effects: { ...effects, kaleidoscope: 1 } })).rejects.toThrow('Effets')
  expect(mock.render).not.toHaveBeenCalled()
})
