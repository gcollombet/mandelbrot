import { describe, expect, it, vi } from 'vitest'
import { Engine } from '../../src/Engine'
vi.mock('mandelbrot', () => ({MandelbrotNavigator: class {}}))

function fixture(confirm = true) {
  const engine: any = new Engine({} as HTMLCanvasElement, {colorStops:[],antialiasLevel:1} as any)
  const family = (name: string) => ({direct:name,clear:name+' clear',accum:name+' accum',rotation:name+' rotation'})
  engine.format = 'bgra8unorm'
  engine.colorPipelines = { full:family('SDR'),simple:family('SDR simple') }
  engine.hdrColorPipelines = { full:family('HDR'),simple:family('HDR simple') }
  engine.presentationPipelines = {sdr:'SDR present',hdr:'HDR present',rotationSdr:'SDR rotation',rotationHdr:'HDR rotation'}
  let config: any = {}
  engine.ctx = {
    configure: vi.fn(c => {config = {...c, toneMapping:{mode:confirm ? c.toneMapping.mode : 'standard'}}}),
    getConfiguration: () => config, getCurrentTexture: () => ({}),
  }
  engine.device = {pushErrorScope: vi.fn(),popErrorScope:vi.fn(async () => null)}
  return engine
}
describe('HDR presentation and capture separation', () => {
  it('switches presentation, invalidates SDR accumulation, and retains the SDR file format', async () => {
    const engine = fixture(); engine.aaAccumulatedSamples = 16; engine.rotationColorCacheReady = true
    await engine.setHdrDisplay(true)
    expect(engine.outputDiagnostics).toMatchObject({format:'rgba16float',toneMapping:'extended'})
    expect(engine.pipelineColor).toBe('HDR'); expect(engine.pipelinePresent).toBe('HDR present')
    expect(engine.format).toBe('bgra8unorm'); expect(engine.aaAccumulatedSamples).toBe(0)
    expect(engine.rotationColorCacheReady).toBe(false)
    await engine.setHdrDisplay(false)
    expect(engine.outputDiagnostics.format).toBe('bgra8unorm')
    expect(engine.pipelineColor).toBe('SDR')
  })
  it('rolls back when the browser ignores the extended tone mapping request', async () => {
    const engine = fixture(false)
    await expect(engine.setHdrDisplay(true)).rejects.toThrow('ne confirme pas')
    expect(engine.outputDiagnostics).toMatchObject({hdrRequested:false,format:'bgra8unorm',toneMapping:'standard'})
    expect(engine.pipelineColor).toBe('SDR')
  })
  it('renders SDR exports in SDR even with HDR requested, then restores HDR presentation', async () => {
    const engine = fixture(); await engine.setHdrDisplay(true)
    engine.videoExportActive = true; engine.hdrExport = false; engine.configureOutput()
    expect(engine.outputDiagnostics.format).toBe('bgra8unorm'); expect(engine.pipelineColor).toBe('SDR')
    engine.videoExportActive = false; engine.configureOutput()
    expect(engine.pipelineColor).toBe('HDR'); expect(engine.outputDiagnostics.toneMapping).toBe('extended')
  })
  it('can render a float HDR export without an HDR display', () => {
    const engine = fixture(); engine.videoExportActive = true; engine.hdrExport = true; engine.configureOutput()
    expect(engine.pipelineColor).toBe('HDR')
    expect(engine.outputDiagnostics).toMatchObject({format:'rgba16float',toneMapping:'standard',hdrRequested:false})
  })
})
