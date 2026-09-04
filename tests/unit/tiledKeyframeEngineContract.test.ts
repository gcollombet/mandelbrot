import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8')
const engine = read('../../src/Engine.ts')
const runner = read('../../src/videoExportRunner.ts')

function methodSource(name: string, nextName: string): string {
  const start = engine.indexOf(name)
  const end = engine.indexOf(nextName, start + name.length)
  return engine.slice(start, end < 0 ? undefined : end)
}

describe('tiled keyframe engine contract', () => {
  it('allocates raw/resolve at tile size, both keyframes at full size, and no merge display', () => {
    expect(engine).toContain('const textureSize = this.tiledKeyframePlan?.tileSide ?? fullTextureSize')
    expect(engine).toContain("this.resolvedDisplay = createDisplaySet('Engine ResolvedDisplay')")
    expect(engine).toContain("? createDisplaySet('Engine TiledLiveKeyframe', fullTextureSize)")
    expect(engine).toContain("this.tiledKeyframePlan ? 'Engine TiledFrozenKeyframe'")
    expect(engine).toContain("createLayeredTexture('Engine RawTexture (A)', rawLayers")
    expect(engine).toContain("this.mergeDisplay = this.tiledKeyframePlan ? undefined : createDisplaySet('Engine MergeDisplay')")
  })

  it('exposes allocation-derived bytes per texel for both scales', () => {
    expect(engine).toContain('static tiledExportMemoryProfileFor')
    expect(engine).toContain('squareBytesPerTexel: 2 * (24 + optionalDisplayBytes) + 8')
    expect(engine).toContain('tileBytesPerTexel: 2 * rawLayers * 4')
  })

  it('swaps keyframe roles without a full-image texture copy', () => {
    const source = methodSource('private beginNextTiledKeyframe()', 'private copyDisplayTile(')
    expect(source).toContain('this.tiledLiveDisplay = this.frozenDisplay')
    expect(source).toContain('this.frozenDisplay = completedLive')
    expect(source).not.toContain('copyTextureToTexture')
    expect(source).toContain('this.rebuildColorBindGroup()')
  })

  it('resets tile-local state while preserving the reference worker', () => {
    const source = methodSource('private finishCurrentTiledKeyframeTile()', 'isViewFullyConverged()')
    expect(source).toContain('this.clearHistoryNextFrame = true')
    expect(source).toContain('this.rawOriginX = 0')
    expect(source).toContain('this.resetAaState()')
    expect(source).toContain('this.invalidateCounterReadback()')
    expect(source).not.toContain('resetReference')
    expect(source).not.toContain('referenceWorker')
  })

  it('does not report readiness before every tile was copied', () => {
    const source = methodSource('videoFrameReady(): boolean', 'private beginNextTiledKeyframe()')
    expect(source).toContain('if (!this.tiledKeyframeComplete) return this.finishCurrentTiledKeyframeTile()')
    expect(engine).toContain('this.tiledKeyframeTileIndex + 1 >= this.tiledKeyframePlan!.tiles.length')
  })

  it('passes the plan and rotation interval without replacing the frame loop', () => {
    expect(runner).toContain('tiledKeyframePlan,')
    expect(runner).toContain('{ from: request.from.angle, to: request.to.angle }')
    expect(runner).toContain('runVideoExport(')
    expect(runner).not.toContain('for (let index = 0; index < totalFrames; index++)')
  })

  it('reports keyframes, converted tiles, pumps per tile and free frames', () => {
    for (const field of ['keyframesBuilt', 'tilesConverted', 'pumpsPerTile', 'freeFrames']) {
      expect(engine).toContain(field)
      expect(runner).toContain(field)
    }
  })
})
