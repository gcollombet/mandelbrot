import {describe, expect, it} from 'vitest'
import {
    DESKTOP_GPU_MEMORY_BUDGET_BYTES,
    estimateGpuWorkingSetBytes,
    fitSurfaceToGpuBudget,
    HIGH_PERFORMANCE_GPU_MEMORY_BUDGET_BYTES,
    isMobileLikeEnvironment,
    MOBILE_GPU_MEMORY_BUDGET_BYTES,
    neutralTextureBytesPerPixel,
    recommendedGpuMemoryBudgetBytes,
} from '../../src/gpuCompatibility'

describe('GPU compatibility budget', () => {
    it('accounts for optional orbit payloads', () => {
        expect(neutralTextureBytesPerPixel(false, false)).toBe(188)
        expect(neutralTextureBytesPerPixel(true, false)).toBe(252)
        expect(neutralTextureBytesPerPixel(false, true)).toBe(260)
        expect(neutralTextureBytesPerPixel(true, true)).toBe(324)
    })

    it('keeps a surface that fits and reduces a high-DPR mobile surface', () => {
        const compact = fitSurfaceToGpuBudget({
            width: 390,
            height: 844,
            orbitMetrics: false,
            orbitTrap: false,
        }, MOBILE_GPU_MEMORY_BUDGET_BYTES)
        expect(compact.reduced).toBe(false)

        const highDpr = fitSurfaceToGpuBudget({
            width: 1170,
            height: 2532,
            orbitMetrics: false,
            orbitTrap: false,
        }, MOBILE_GPU_MEMORY_BUDGET_BYTES)
        expect(highDpr.reduced).toBe(true)
        expect(highDpr.estimatedBytes).toBeLessThanOrEqual(MOBILE_GPU_MEMORY_BUDGET_BYTES)
        expect(highDpr.width / highDpr.height).toBeCloseTo(1170 / 2532, 2)
    })

    it('includes optional payloads in the fit decision', () => {
        const base = estimateGpuWorkingSetBytes({
            width: 1920,
            height: 1080,
            orbitMetrics: false,
            orbitTrap: false,
        })
        const full = estimateGpuWorkingSetBytes({
            width: 1920,
            height: 1080,
            orbitMetrics: true,
            orbitTrap: true,
        })
        expect(full).toBeGreaterThan(base)
    })

    it('selects mobile, ordinary desktop and discrete-GPU budgets', () => {
        expect(recommendedGpuMemoryBudgetBytes({mobileLike: true, adapterVendor: 'nvidia'}))
            .toBe(MOBILE_GPU_MEMORY_BUDGET_BYTES)
        expect(recommendedGpuMemoryBudgetBytes({mobileLike: false, adapterVendor: 'intel'}))
            .toBe(DESKTOP_GPU_MEMORY_BUDGET_BYTES)
        expect(recommendedGpuMemoryBudgetBytes({mobileLike: false, adapterVendor: 'nvidia'}))
            .toBe(HIGH_PERFORMANCE_GPU_MEMORY_BUDGET_BYTES)
    })

    it('recognizes mobile environments without classifying a large touch desktop as mobile', () => {
        expect(isMobileLikeEnvironment({userAgentDataMobile: true})).toBe(true)
        expect(isMobileLikeEnvironment({userAgent: 'Mozilla/5.0 (Linux; Android 15)'})).toBe(true)
        expect(isMobileLikeEnvironment({maxTouchPoints: 10, screenWidth: 390, screenHeight: 844})).toBe(true)
        expect(isMobileLikeEnvironment({maxTouchPoints: 10, screenWidth: 2560, screenHeight: 1440})).toBe(false)
    })
})
