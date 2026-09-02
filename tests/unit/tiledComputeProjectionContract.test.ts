import {readFileSync} from 'node:fs'
import {describe, expect, it} from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const brush = read('../../src/assets/mandelbrot_brush.wgsl')

describe('tiled compute projection contract', () => {
  it('keeps one global camera and reference for every tile and video frame', () => {
    expect(engine).not.toContain('projectMandelbrotForExport')
    expect(engine).toContain('const workerComputeScale = computeScale')
    expect(engine).toContain('this.resetReferenceJob(mandelbrot, workerScaleString, maxIterations)')
    expect(engine).toContain('this.syncReferenceWorkerView(mandelbrot, workerScaleString, maxIterations)')
  })

  it('maps the local tile lattice into full-frame UV before applying the global camera', () => {
    expect(brush).toContain('fn project_local_rot_to_output(local_rot: vec2<f32>)')
    expect(brush).toContain('let output_uv = vec2<f32>(mandelbrot.outputUvOriginX, mandelbrot.outputUvOriginY)')
    expect(brush).toContain('(output_uv.x * 2.0 - 1.0) * mandelbrot.outputFullAspect')
    expect(brush).toContain('let output_rot = project_local_rot_to_output(local_rot);')
    expect(brush).toContain('output_rot * mandelbrot.scale + vec2<f32>(mandelbrot.cx, mandelbrot.cy)')
  })

  it('preserves the exact historical coordinate path outside tiled export', () => {
    expect(brush).toContain('if (mandelbrot.outputTileProjection < 0.5) {\n    return local_rot;')
    expect(engine).toContain('tileViewProjection ? 1 : 0,         // 38: keep monolithic coordinate path bit-identical')
  })

  it('scales analytic geometry and AA reach to the final-frame pixel footprint', () => {
    expect(brush.match(/\+ log\(max\(output_texel_scale\(\), 1e-30\)\)/g)).toHaveLength(2)
    expect(engine).toContain('+ Math.log(tileViewProjection?.uvScaleY ?? 1)')
  })

  it('reprojects live and frozen history around the global frame centre', () => {
    const color = read('../../src/assets/color.wgsl')
    const merge = read('../../src/assets/merge_frozen.wgsl')
    expect(color).toContain('let zoomPivot = output_center_neutral_uv();')
    expect(color).toContain('(uv_neutral - zoomPivot) / lzf')
    expect(merge).toContain('(uv - zoomPivot) / uni.liveZoomFactor + zoomPivot')
    expect(engine).toContain('const zoomPivot = this.currentTileZoomPivot(mandelbrot.angle)')
  })

  it('bounds tile-local temporal reuse and rebuilds only unsafe frames', () => {
    expect(engine).toContain('projection.reuseMagnificationThreshold ?? 1.000001')
    expect(engine).toContain('const tiledScaleStepExceedsEnvelope')
    expect(engine).toContain('scaleStepRatio >= this.zoomMagnificationThreshold')
    expect(engine).toContain('const forceFreshTiledFrame = tiledCameraChanged || tiledScaleStepExceedsEnvelope')
  })
})
