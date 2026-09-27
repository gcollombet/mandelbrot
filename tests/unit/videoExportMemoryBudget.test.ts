import { afterEach, describe, expect, it, vi } from 'vitest'
import { Engine } from '../../src/Engine'
import { advanceTile, createExportSession, currentTile, resolveSurface, restartKeyframe, validateExportSettings, type TiledLayout } from '../../src/exportSession'
vi.mock('mandelbrot', () => ({MandelbrotNavigator: class {}}))

const settings = { outputWidth: 3840, outputHeight: 2160, supersample: 1, magnificationThreshold: 2, batchTargetFps: 1 }
const device = { maxTextureDimension: 8192, gpuMemoryBudgetBytes: 256 * 1024 * 1024, orbitMetrics: false, orbitTrap: false }

/** Just the engine state beginVideoExportSession reads and writes. */
function engine() {
    return {
        session: null as unknown,
        gpuMemoryBudgetBytes: device.gpuMemoryBudgetBytes, orbitMetricsEnabled: false, orbitTrapEnabled: false,
        zoomMagnificationThreshold: 16, dprMultiplier: 1, targetFps: 60, aaAuto: true, _drawFn: null,
        device: { limits: { maxTextureDimension2D: 8192 }, pushErrorScope: vi.fn(), popErrorScope: vi.fn(async () => null) },
        stopRenderLoop: vi.fn(), endVideoExportSession: vi.fn(), resize: vi.fn(),
    }
}
const begin = (e: ReturnType<typeof engine>, s = settings) => Engine.prototype.beginVideoExportSession.call(e, s)

afterEach(() => vi.restoreAllMocks())
describe('video export memory policy', () => {
    it('flags a request above the conservative estimate without refusing it', () => {
        const result = validateExportSettings(settings, device)
        expect(result.side).toBe(Math.ceil(Math.hypot(3840, 2160)))
        expect(result.overBudget).toBe(true)
    })

    it('refuses a degenerate threshold, an oversized square and a mismatched tile plan', () => {
        expect(() => validateExportSettings({ ...settings, magnificationThreshold: 1 }, device)).toThrow()
        expect(() => validateExportSettings(settings, { ...device, maxTextureDimension: 4096 })).toThrow("beyond this device's limit")
        const plan = { neutralSide: 1, tiles: [], estimate: { totalBytes: 0 } } as any
        expect(() => validateExportSettings({ ...settings, tiledKeyframePlan: plan }, device)).toThrow()
        expect(() => validateExportSettings({ ...settings, tiledKeyframePlan: plan, aaSamplesPerFrame: 4 }, device)).toThrow()
    })

    it('starts above the conservative estimate and attempts the requested allocation', async () => {
        const e = engine(), warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        await begin(e)
        expect(e.session).toMatchObject({ surface: { width: 3840, height: 2160 }, layout: { kind: 'direct' } })
        expect(e.stopRenderLoop).toHaveBeenCalledOnce()
        expect(e.resize).toHaveBeenCalledOnce()
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('Export autorisé'))
        expect(e.device.popErrorScope).toHaveBeenCalledTimes(2)
    })

    it('still refuses a texture exceeding the real device limit before allocation', async () => {
        const e = engine(); e.device.limits.maxTextureDimension2D = 4096
        await expect(begin(e)).rejects.toThrow("beyond this device's limit")
        expect(e.session).toBeNull()
        expect(e.resize).not.toHaveBeenCalled()
    })

    it('reports actual GPU allocation failures and ends the session', async () => {
        const e = engine(); vi.spyOn(console, 'warn').mockImplementation(() => {})
        e.device.popErrorScope.mockResolvedValueOnce(null).mockResolvedValueOnce({ message: 'OOM' } as any)
        await expect(begin(e)).rejects.toThrow('insufficient GPU memory')
        expect(e.endVideoExportSession).toHaveBeenCalledOnce()
    })

    it('keeps export dimensions but still reduces the interactive surface', () => {
        const input = {
            cssWidth: 3840, cssHeight: 2160, devicePixelRatio: 1, maxTextureDimension: 8192,
            gpuMemoryBudgetBytes: device.gpuMemoryBudgetBytes, orbitMetrics: false, orbitTrap: false,
        }
        const pinned = resolveSurface({ ...input, cssWidth: 100, cssHeight: 100, session: { surface: { width: 3840, height: 2160 } } })
        expect([pinned.width, pinned.height, pinned.reduced]).toEqual([3840, 2160, false])
        const interactive = resolveSurface({ ...input, session: null })
        expect(interactive.reduced).toBe(true)
        expect(interactive.width).toBeLessThan(3840)
        expect(interactive.height).toBeLessThan(2160)
    })
})

describe('export session value', () => {
    const restore = { zoomMagnificationThreshold: 16, dprMultiplier: 1, targetFps: 60, aaAuto: true }

    it('is direct without a plan, tiled with one', () => {
        expect(createExportSession(settings, restore, null).layout).toEqual({ kind: 'direct' })
        const plan = { tiles: [{}, {}], tileSide: 512 } as any
        const tiled = createExportSession({ ...settings, tiledKeyframePlan: plan, angleRange: { from: 0, to: 1 } }, restore, null)
        expect(tiled.layout).toMatchObject({ kind: 'tiled', tileIndex: 0, complete: false, rotating: true })
        const still = createExportSession({ ...settings, tiledKeyframePlan: plan, angleRange: { from: 1, to: 1 } }, restore, null)
        expect(still.layout).toMatchObject({ rotating: false })
    })

    it('pins the supersampled surface and normalises the AA budget', () => {
        const session = createExportSession({ ...settings, supersample: 2, aaSamplesPerFrame: 3.6, hdr: true }, restore, null)
        expect(session.surface).toEqual({ width: 7680, height: 4320 })
        expect(session.aaSamples).toBe(4)
        expect(session.hdr).toBe(true)
    })
})

describe('tiled keyframe progression', () => {
    it('walks every tile once, completes, then restarts from the first', () => {
        const tiles = [{ index: 0 }, { index: 1 }, { index: 2 }] as any[]
        const layout: TiledLayout = { kind: 'tiled', plan: { tiles } as any, tileIndex: 0, complete: false, rotating: false }
        const seen = []
        for (;;) {
            seen.push(currentTile(layout))
            if (advanceTile(layout) === 'keyframeComplete') break
        }
        expect(seen).toEqual(tiles)
        expect(currentTile(layout)).toBeNull()
        restartKeyframe(layout)
        expect(currentTile(layout)).toBe(tiles[0])
    })
})
