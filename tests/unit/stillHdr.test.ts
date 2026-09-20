import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderStill, type StillExportDeps } from '../../src/stillExport'

afterEach(() => vi.unstubAllGlobals())
function fixture(fail = false) {
  const ctx = { drawImage: vi.fn() }
  vi.stubGlobal('document', { createElement: () => ({ getContext: () => ctx }) })
  let tile = 0
  const deps: StillExportDeps = {
    engine: {
      maxTextureDimension: 3,
      beginVideoExportSession: vi.fn(async () => {}), endVideoExportSession: vi.fn(),
      videoFrameReady: () => true, beginExportFrameAa: vi.fn(), waitForSubmittedWork: async () => {},
      captureExportFrame: vi.fn(),
      captureHdrFrame: vi.fn(async (w,h) => { if (fail) throw new Error('GPU capture failure'); return new Uint16Array(w*h*4).fill(++tile) }),
    },
    controller: { drawOnce: vi.fn(), setExportTime: vi.fn() },
    navigator: { cancel_transition: vi.fn(), origin: vi.fn(), scale: vi.fn(), angle: vi.fn(), translate_direct: vi.fn() },
  }
  return { deps, ctx }
}
const request = { hdr: true, width:4, height:4, aaSamples:4, magnificationThreshold:16, location:{cx:'-0.7',cy:'0',scale:'1e-400',angle:0} }
describe('HDR still session', () => {
  it('assembles float tiles without a VideoFrame or 8-bit canvas round trip and restores the camera', async () => {
    const { deps, ctx } = fixture()
    const result = await renderStill(deps, request)
    expect(Array.from(result.hdrPixels!.filter((_,i) => i%4 === 0))).toEqual([1,1,2,2,1,1,2,2,3,3,4,4,3,3,4,4])
    expect(deps.engine.beginVideoExportSession).toHaveBeenCalledWith(expect.objectContaining({hdr:true,aaSamplesPerFrame:4}))
    expect(deps.engine.captureExportFrame).not.toHaveBeenCalled()
    expect(ctx.drawImage).not.toHaveBeenCalled()
    expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
    expect(deps.navigator.scale).toHaveBeenLastCalledWith('1e-400')
    expect(deps.controller.setExportTime).toHaveBeenLastCalledWith(null)
  })
  it('restores session state when capture fails', async () => {
    const { deps } = fixture(true)
    await expect(renderStill(deps,request)).rejects.toThrow('GPU capture failure')
    expect(deps.engine.endVideoExportSession).toHaveBeenCalledOnce()
    expect(deps.navigator.origin).toHaveBeenLastCalledWith('-0.7','0')
  })
})
