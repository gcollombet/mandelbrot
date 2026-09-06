import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { planExpmap } from '../../src/expmap/plan'
import { octaveBlocks, octaveProjection, planExpmapOctaves } from '../../src/expmap/octaves'
import { scaleDoublements } from '../../src/expmap/decimal'
import { produceExpmapBlocks, type ExpmapProducerDeps } from '../../src/expmap/producer'
import { createDefaultAnimationConfig } from '../../src/AnimationConfig'
import type { RenderOptions } from '../../src/Engine'

const plan = planExpmap({ domain: { cx: '0', cy: '0', startScale: '2e-1000', endScale: '1e-1000' }, width: 6, height: 4, density: 1, blockSize: 32 })

describe('direct ExpMap producer', () => {
  it('GPU anchors match the continuous log-polar map, including tile halos', () => {
    const o=planExpmapOctaves(plan)
    for(const block of octaveBlocks(plan)) {
      const projected=octaveProjection(plan,block), p=projected.uniforms, tile=Number(block.id.split(':')[1])
      for(const [x,y] of [[0,0],[block.useful.x,block.useful.y],[block.codedWidth-1,block.codedHeight-1]]) {
        const gx=block.originX+x-block.useful.x-o.halo, gy=block.originY+y-block.useful.y-o.halo
        const expectedRadius=2*plan.radius/plan.height*2**(-tile-gy/o.rowsPerOctave)
        const actualRadius=2**(-scaleDoublements(plan.domain.startScale,projected.scale))*Math.exp(-y*p[6])
        expect(actualRadius).toBeCloseTo(expectedRadius,5)
        expect(Math.cos(2*Math.PI*(x+p[3])/p[5])).toBeCloseTo(Math.cos(2*Math.PI*gx/o.angularSamples),5)
      }
    }
  })
  it('restores the session and camera when convergence fails', async () => {
    const navigator = { origin: vi.fn(), scale: vi.fn(), angle: vi.fn(), cancel_transition: vi.fn(), start_transition: vi.fn() }
    const engine = { beginVideoExportSession: vi.fn(), endVideoExportSession: vi.fn(), prepareExpmapBlock: vi.fn(), beginVideoExportFrame: vi.fn(), waitForSubmittedWork: vi.fn(), videoFrameReady: () => false }
    const controller = { getNavigator: () => navigator, setExportTime: vi.fn(), drawOnce: vi.fn() }
    const animation = createDefaultAnimationConfig()
    Object.values(animation.tracks).forEach(track => { track.enabled = false })
    const appearance = { colorStops: [{ color: '#fff', position: 0 }], animation, heightPaletteShift: 0, phaseColoringStrength: 0 } as RenderOptions
    const restoreCamera = { cx: '1', cy: '2', scale: '1e-20', angle: 0.4 }
    const consume = vi.fn()
    await expect(produceExpmapBlocks({ engine, controller } as unknown as ExpmapProducerDeps, { plan, appearance, restoreCamera, consume, maxPumpsPerBlock: 2 })).rejects.toThrow('did not converge')
    expect(consume).not.toHaveBeenCalled()
    expect(engine.endVideoExportSession).toHaveBeenCalledOnce()
    expect(navigator.origin).toHaveBeenLastCalledWith('1', '2')
    expect(controller.setExportTime).toHaveBeenLastCalledWith(null)
  })
  it('closes a capture resolved during cancellation and restores the camera', async () => {
    const abort = new AbortController(), close = vi.fn()
    const navigator = { origin: vi.fn(), scale: vi.fn(), angle: vi.fn(), cancel_transition: vi.fn(), start_transition: vi.fn() }
    const engine = { beginVideoExportSession: vi.fn(), endVideoExportSession: vi.fn(), prepareExpmapBlock: vi.fn(), beginVideoExportFrame: vi.fn(), waitForSubmittedWork: vi.fn(), videoFrameReady: () => true,
      captureExportFrame: async () => { abort.abort(); return { close } } }
    const controller = { getNavigator: () => navigator, setExportTime: vi.fn(), drawOnce: vi.fn() }
    const animation = createDefaultAnimationConfig(); Object.values(animation.tracks).forEach(t => { t.enabled = false })
    await expect(produceExpmapBlocks({ engine, controller } as unknown as ExpmapProducerDeps, { plan,
      appearance: { colorStops: [{ color: '#fff', position: 0 }], animation, heightPaletteShift: 0, phaseColoringStrength: 0 } as RenderOptions,
      restoreCamera: { cx: '1', cy: '2', scale: '1e-30', angle: 0.2 }, consume: vi.fn(), signal: abort.signal })).rejects.toThrow()
    await Promise.resolve()
    expect(close).toHaveBeenCalledOnce(); expect(engine.endVideoExportSession).toHaveBeenCalledOnce()
    expect(navigator.scale).toHaveBeenLastCalledWith('1e-30')
  })
  it('isolates Cartesian AA, center snapping and incomplete-frame acceptance', () => {
    const engine = readFileSync(new URL('../../src/Engine.ts', import.meta.url), 'utf8')
    const controller = readFileSync(new URL('../../src/components/Mandelbrot.vue', import.meta.url), 'utf8')
    const color = readFileSync(new URL('../../src/assets/color.wgsl', import.meta.url), 'utf8')
    expect(engine).toContain('if (this.expmapProjection && this.unfinishedPixelCount !== 0) return false')
    expect(engine).toContain('!this.expmapProjection && this.aaAnalyticEnabled')
    expect(controller).toContain('canvas && !engine.isExpmapProductionActive ? canvas.width : undefined')
    const direct = color.slice(color.indexOf('fn fs_expmap'))
    expect(direct).not.toContain('shade_srgb(')
    expect(direct).not.toContain('sample_escaped_bilinear(')
  })
})
