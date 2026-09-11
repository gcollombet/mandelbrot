import { readFileSync } from 'node:fs'
import ts from 'typescript'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { estimateGpuWorkingSetBytes, fitSurfaceToGpuBudget, formatGpuBytes } from '../../src/gpuCompatibility'

// Execute the production session/resize policy with an allocation stub, without
// importing the browser engine's WASM, workers or WebGPU shaders into Node.
const source = readFileSync(new URL('../../src/Engine.ts', import.meta.url), 'utf8')
const start = source.indexOf('    async beginVideoExportSession(settings:')
const end = source.indexOf('    /** Align a row stride', start)
const compiled = ts.transpileModule(`class Session { ${source.slice(start, end)} }`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
}).outputText
const Session = new Function('Engine', 'estimateGpuWorkingSetBytes', 'formatGpuBytes', `${compiled}; return Session`)(
    { workingTextureSideFor: (w: number, h: number) => Math.ceil(Math.hypot(w, h)) }, estimateGpuWorkingSetBytes, formatGpuBytes,
)
const memoryStart = source.lastIndexOf('        const memoryOptions = {')
const memoryEnd = source.indexOf('        this.canvas.width = this.width', memoryStart)
const resizeMemory = new Function('fitSurfaceToGpuBudget', 'estimateGpuWorkingSetBytes', 'formatGpuBytes', 'widthCSS', 'heightCSS', source.slice(memoryStart, memoryEnd))
const settings = { outputWidth: 3840, outputHeight: 2160, supersample: 1, magnificationThreshold: 2, batchTargetFps: 1 }
function engine() {
    return {
        gpuMemoryBudgetBytes: 256 * 1024 * 1024, width: 3840, height: 2160,
        videoExportActive: false, orbitMetricsEnabled: false, orbitTrapEnabled: false,
        device: { limits: { maxTextureDimension2D: 8192 }, pushErrorScope: vi.fn(), popErrorScope: vi.fn(async () => null) },
        stopRenderLoop: vi.fn(), endVideoExportSession: vi.fn(), resize: vi.fn(),
    }
}
afterEach(() => vi.restoreAllMocks())
describe('video export memory policy', () => {
    it('starts above the conservative estimate and attempts the requested allocation', async () => {
        const e = engine(), warning = vi.spyOn(console, 'warn').mockImplementation(() => {})
        await Session.prototype.beginVideoExportSession.call(e, settings)
        expect(e.videoExportActive).toBe(true)
        expect(e.resize).toHaveBeenCalledOnce()
        expect(warning).toHaveBeenCalledWith(expect.stringContaining('Export autorisé'))
        expect(e.device.popErrorScope).toHaveBeenCalledTimes(2)
    })
    it('still refuses a texture exceeding the real device limit before allocation', async () => {
        const e = engine(); e.device.limits.maxTextureDimension2D = 4096
        await expect(Session.prototype.beginVideoExportSession.call(e, settings)).rejects.toThrow('limite de cet appareil')
        expect(e.resize).not.toHaveBeenCalled()
    })
    it('reports actual GPU allocation failures and ends the session', async () => {
        const e = engine(); vi.spyOn(console, 'warn').mockImplementation(() => {})
        e.device.popErrorScope.mockResolvedValueOnce(null).mockResolvedValueOnce({ message: 'OOM' } as any)
        await expect(Session.prototype.beginVideoExportSession.call(e, settings)).rejects.toThrow('mémoire GPU insuffisante')
        expect(e.endVideoExportSession).toHaveBeenCalledOnce()
    })
    it('keeps export dimensions but still reduces the interactive surface', () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const e = { ...engine(), videoExportActive: true, forcedSurfaceSize: { width: 3840, height: 2160 } }
        resizeMemory.call(e, fitSurfaceToGpuBudget, estimateGpuWorkingSetBytes, formatGpuBytes, 3840, 2160)
        expect([e.width, e.height]).toEqual([3840, 2160])
        e.videoExportActive = false; e.forcedSurfaceSize = null
        resizeMemory.call(e, fitSurfaceToGpuBudget, estimateGpuWorkingSetBytes, formatGpuBytes, 3840, 2160)
        expect(e.width).toBeLessThan(3840)
        expect(e.height).toBeLessThan(2160)
    })
})
