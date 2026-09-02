const MIB = 1024 * 1024
const GIB = 1024 * MIB

/** WGSL capability required by the in-place iteration and selective-AA paths. */
export const READ_WRITE_STORAGE_TEXTURES_FEATURE = 'readonly_and_readwrite_storage_textures'

/** Conservative per-tab budgets. WebGPU intentionally exposes no VRAM budget. */
export const MOBILE_GPU_MEMORY_BUDGET_BYTES = 384 * MIB
export const DESKTOP_GPU_MEMORY_BUDGET_BYTES = 2 * GIB
export const HIGH_PERFORMANCE_GPU_MEMORY_BUDGET_BYTES = 4 * GIB

// Includes the fixed 80 MB reference orbit, webcam placeholder, small buffers,
// swap-chain uncertainty and driver allocation overhead.
export const GPU_FIXED_MEMORY_RESERVE_BYTES = 96 * MIB
// rgba16float AA target (8 B) plus a conservative three-image BGRA swap chain (12 B).
export const GPU_SCREEN_BYTES_PER_PIXEL = 20

export type GpuWorkingSetOptions = {
    width: number
    height: number
    orbitMetrics: boolean
    orbitTrap: boolean
}

export type GpuSurfaceFit = {
    width: number
    height: number
    neutralSize: number
    estimatedBytes: number
    scale: number
    reduced: boolean
}

export function neutralTextureBytesPerPixel(orbitMetrics: boolean, orbitTrap: boolean): number {
    const rawLayers = orbitTrap
        ? (orbitMetrics ? 21 : 16)
        : (orbitMetrics ? 18 : 13)
    // Raw A+B; resolved+frozen display sets; merge scratch; rotation cache;
    // AA target. Optional display/scratch payloads accompany their raw layers.
    return rawLayers * 2 * 4
        + 2 * 24
        + 12
        + 8
        + 4
        + (orbitMetrics ? 24 : 0)
        + (orbitTrap ? 48 : 0)
}

export function estimateGpuWorkingSetBytes(options: GpuWorkingSetOptions): number {
    const width = Math.max(1, Math.round(options.width))
    const height = Math.max(1, Math.round(options.height))
    const neutralSize = Math.ceil(Math.hypot(width, height))
    return GPU_FIXED_MEMORY_RESERVE_BYTES
        + neutralSize * neutralSize * neutralTextureBytesPerPixel(options.orbitMetrics, options.orbitTrap)
        + width * height * GPU_SCREEN_BYTES_PER_PIXEL
}

export function fitSurfaceToGpuBudget(
    options: GpuWorkingSetOptions,
    budgetBytes: number,
): GpuSurfaceFit {
    const requestedWidth = Math.max(1, Math.round(options.width))
    const requestedHeight = Math.max(1, Math.round(options.height))
    const requestedBytes = estimateGpuWorkingSetBytes({
        ...options,
        width: requestedWidth,
        height: requestedHeight,
    })
    if (!(budgetBytes > GPU_FIXED_MEMORY_RESERVE_BYTES) || requestedBytes <= budgetBytes) {
        return {
            width: requestedWidth,
            height: requestedHeight,
            neutralSize: Math.ceil(Math.hypot(requestedWidth, requestedHeight)),
            estimatedBytes: requestedBytes,
            scale: 1,
            reduced: false,
        }
    }

    const variableBytes = requestedBytes - GPU_FIXED_MEMORY_RESERVE_BYTES
    const availableBytes = budgetBytes - GPU_FIXED_MEMORY_RESERVE_BYTES
    let scale = Math.min(1, Math.sqrt(availableBytes / variableBytes))
    let width = Math.max(1, Math.floor(requestedWidth * scale))
    let height = Math.max(1, Math.floor(requestedHeight * scale))
    let estimatedBytes = estimateGpuWorkingSetBytes({...options, width, height})

    // Rounding the diagonal upward can leave the analytical fit barely over
    // budget. Contract one pixel at a time until the estimate is truly bounded.
    while (estimatedBytes > budgetBytes && (width > 1 || height > 1)) {
        if (width / requestedWidth >= height / requestedHeight && width > 1) width--
        else if (height > 1) height--
        estimatedBytes = estimateGpuWorkingSetBytes({...options, width, height})
    }
    scale = Math.min(width / requestedWidth, height / requestedHeight)
    return {
        width,
        height,
        neutralSize: Math.ceil(Math.hypot(width, height)),
        estimatedBytes,
        scale,
        reduced: width !== requestedWidth || height !== requestedHeight,
    }
}

export function isMobileLikeEnvironment(input: {
    userAgent?: string
    userAgentDataMobile?: boolean
    maxTouchPoints?: number
    screenWidth?: number
    screenHeight?: number
}): boolean {
    if (input.userAgentDataMobile === true) return true
    if (/Android|iPhone|iPad|iPod|Mobile/i.test(input.userAgent ?? '')) return true
    const shortSide = Math.min(input.screenWidth ?? Infinity, input.screenHeight ?? Infinity)
    return (input.maxTouchPoints ?? 0) > 0 && shortSide <= 1024
}

export function recommendedGpuMemoryBudgetBytes(input: {
    mobileLike: boolean
    adapterVendor?: string
    adapterArchitecture?: string
    adapterDevice?: string
}): number {
    if (input.mobileLike) return MOBILE_GPU_MEMORY_BUDGET_BYTES
    const adapterIdentity = [
        input.adapterVendor,
        input.adapterArchitecture,
        input.adapterDevice,
    ].filter(Boolean).join(' ').toLowerCase()
    const highPerformance = /nvidia|geforce|10de|radeon|1002|apple|m[1-9]/.test(adapterIdentity)
    return highPerformance
        ? HIGH_PERFORMANCE_GPU_MEMORY_BUDGET_BYTES
        : DESKTOP_GPU_MEMORY_BUDGET_BYTES
}

export function formatGpuBytes(bytes: number): string {
    return `${(bytes / GIB).toFixed(2)} Gio`
}
