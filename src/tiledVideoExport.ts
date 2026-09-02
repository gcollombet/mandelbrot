/** Pure geometry and budgeting primitives for tiled video export. */

export type FullFrameGeometry = {
    width: number
    height: number
}

export type PixelRect = {
    x: number
    y: number
    width: number
    height: number
}

export type TileCore = PixelRect & {
    index: number
    column: number
    row: number
}

export type TileHalo = {
    /** Output-pixel support required by the linear-light reduction filter. */
    filter: number
    /** Output-pixel neighbourhood read by reconstruction/material passes. */
    render: number
    /** Extra output-pixel guard kept through the mezzanine codec. */
    codec: number
}

export type ExpandedTile = {
    index: number
    core: TileCore
    /** Global output-pixel rectangle rendered and encoded for this tile. */
    expanded: PixelRect
    /** Core rectangle expressed in decoded intermediate-frame coordinates. */
    crop: PixelRect
    /** Codec dimensions after optional right/bottom padding. */
    encodedWidth: number
    encodedHeight: number
    /** Square neutral working texture required by the rotated renderer. */
    workingTextureSide: number
    /** Maximum frozen/live scale ratio covered by this expanded region. */
    temporalMagnificationThreshold: number
}

export type TilePlan = {
    fullFrame: FullFrameGeometry
    supersample: number
    halo: TileHalo & { total: number }
    coreWidth: number
    coreHeight: number
    columns: number
    rows: number
    codecAlignment: number
    maxTextureDimension2D: number
    gpuBudgetBytes: number
    bytesPerWorkingTexel: number
    /** Common frozen/live target actually achieved by the planned tiles. */
    temporalMagnificationTarget: number
    tiles: ExpandedTile[]
    maxWorkingTextureSide: number
    estimatedPeakWorkingBytes: number
}

export type CompositionPlan = {
    fullFrame: FullFrameGeometry
    totalFrames: number
    bytesPerPixel: number
    bytesPerFrame: number
    memoryBudgetBytes: number
    framesPerBlock: number
    keyframeIntervalFrames: number
    decoderPoolSize: number
}

export type TileViewProjection = {
    /** Aspect of the local expanded tile rendered by the ordinary pipeline. */
    localAspect: number
    /** local view scale = global view scale × scaleFactor. */
    scaleFactor: number
    /** Scene-aligned offset from global camera centre, in global-scale units. */
    centerOffsetX: number
    centerOffsetY: number
    /** Maps local fragment UV to the full output UV (bottom-left convention). */
    uvOriginX: number
    uvOriginY: number
    uvScaleX: number
    uvScaleY: number
}

export type TileZoomPivot = {u: number; v: number}

export type TilePlanSettings = {
    fullFrame: FullFrameGeometry
    supersample: number
    halo: TileHalo
    maxTextureDimension2D: number
    gpuBudgetBytes: number
    /** Supplied by Engine from the resources enabled for this render profile. */
    bytesPerWorkingTexel: number
    /** Optional upper bound used to force smaller, more numerous tiles. */
    preferredCoreWidth?: number
    preferredCoreHeight?: number
    codecAlignment?: number
    /** Requested frozen/live ratio for a fixed-centre zoom. 1 disables it. */
    temporalMagnificationTarget?: number
}

export type IntermediateSizeEstimate = {
    mediaBytes: number
    containerMarginBytes: number
    totalBytes: number
}

function positiveInteger(value: number, label: string): number {
    if (!Number.isInteger(value) || value < 1) {
        throw new RangeError(`${label} must be a positive integer (got ${value}).`)
    }
    return value
}

function finitePositive(value: number, label: string): number {
    if (!Number.isFinite(value) || value <= 0) {
        throw new RangeError(`${label} must be positive and finite (got ${value}).`)
    }
    return value
}

function nonNegativeInteger(value: number, label: string): number {
    if (!Number.isInteger(value) || value < 0) {
        throw new RangeError(`${label} must be a non-negative integer (got ${value}).`)
    }
    return value
}

function alignUp(value: number, alignment: number): number {
    return Math.ceil(value / alignment) * alignment
}

export function totalTileHalo(halo: TileHalo): number {
    const filter = nonNegativeInteger(halo.filter, 'halo.filter')
    const render = nonNegativeInteger(halo.render, 'halo.render')
    const codec = nonNegativeInteger(halo.codec, 'halo.codec')
    return Math.max(filter, render) + codec
}

/** Mirrors Engine.workingTextureSideFor without importing the GPU engine. */
export function workingTextureSideFor(width: number, height: number): number {
    return Math.ceil(Math.hypot(width, height))
}

/** Multiply a normalized base-2 float expansion without losing deep exponents. */
export function scaleFloatExp(
    mantissa: number,
    exponent: number,
    factor: number,
): {mantissa: number; exponent: number} {
    if (!Number.isFinite(mantissa) || !Number.isFinite(exponent)
        || !Number.isFinite(factor) || factor <= 0) {
        throw new RangeError('Float-exp scale inputs must be finite and factor must be positive.')
    }
    const product = mantissa * factor
    if (product === 0) return {mantissa: 0, exponent: 0}
    const exponentShift = Math.floor(Math.log2(Math.abs(product))) + 1
    return {
        mantissa: product / 2 ** exponentShift,
        exponent: exponent + exponentShift,
    }
}

/** Geometry that maps a local expanded-tile lattice into the global camera. */
export function projectTileView(
    fullFrameValue: FullFrameGeometry,
    expanded: PixelRect,
    angle: number,
): TileViewProjection {
    const fullFrame = validateFullFrame(fullFrameValue)
    if (!Number.isFinite(angle)) throw new RangeError('angle must be finite.')
    for (const [label, value] of Object.entries(expanded)) {
        if (!Number.isInteger(value)) throw new RangeError(`expanded.${label} must be an integer.`)
    }
    if (expanded.width < 1 || expanded.height < 1
        || expanded.x < 0 || expanded.y < 0
        || expanded.x + expanded.width > fullFrame.width
        || expanded.y + expanded.height > fullFrame.height) {
        throw new RangeError('expanded tile must be a non-empty rectangle inside the full frame.')
    }

    const fullAspect = fullFrame.width / fullFrame.height
    const uvOriginX = expanded.x / fullFrame.width
    // Fragment UV is bottom-left while tile rectangles use top-left rows.
    const uvOriginY = 1 - (expanded.y + expanded.height) / fullFrame.height
    const uvScaleX = expanded.width / fullFrame.width
    const uvScaleY = expanded.height / fullFrame.height
    const centerScreenX = (2 * (expanded.x + expanded.width / 2) / fullFrame.width - 1) * fullAspect
    const centerScreenY = 1 - 2 * (expanded.y + expanded.height / 2) / fullFrame.height
    const sin = Math.sin(angle)
    const cos = Math.cos(angle)

    return {
        localAspect: expanded.width / expanded.height,
        scaleFactor: expanded.height / fullFrame.height,
        centerOffsetX: cos * centerScreenX - sin * centerScreenY,
        centerOffsetY: sin * centerScreenX + cos * centerScreenY,
        uvOriginX,
        uvOriginY,
        uvScaleX,
        uvScaleY,
    }
}

/** Global full-frame centre expressed in a tile's scene-aligned neutral UV. */
export function tileZoomPivot(projection: TileViewProjection): TileZoomPivot {
    const neutralExtent = Math.hypot(projection.localAspect, 1)
    const localScale = 2 * projection.scaleFactor * neutralExtent
    return {
        u: 0.5 - projection.centerOffsetX / localScale,
        v: 0.5 - projection.centerOffsetY / localScale,
    }
}

function expandedRectFor(core: TileCore, fullFrame: FullFrameGeometry, halo: number): PixelRect {
    const x = Math.max(0, core.x - halo)
    const y = Math.max(0, core.y - halo)
    const right = Math.min(fullFrame.width, core.x + core.width + halo)
    const bottom = Math.min(fullFrame.height, core.y + core.height + halo)
    return {x, y, width: right - x, height: bottom - y}
}

/**
 * Union of the core footprints seen from both ends of a frozen/live zoom
 * cycle. Scaling is around the global frame centre, never the tile centre.
 */
export function temporalExpandedRectFor(
    core: TileCore,
    fullFrame: FullFrameGeometry,
    halo: number,
    magnificationThreshold: number,
): PixelRect {
    if (!Number.isFinite(magnificationThreshold) || magnificationThreshold < 1) {
        throw new RangeError('magnificationThreshold must be finite and at least 1.')
    }
    if (magnificationThreshold === 1) return expandedRectFor(core, fullFrame, halo)

    const envelope = (start: number, end: number, centre: number, limit: number) => {
        const threshold = magnificationThreshold
        const candidates = [
            start,
            end,
            centre + (start - centre) / threshold,
            centre + (end - centre) / threshold,
            centre + (start - centre) * threshold,
            centre + (end - centre) * threshold,
        ]
        const minimum = Math.max(0, Math.floor(Math.min(...candidates) - halo))
        const maximum = Math.min(limit, Math.ceil(Math.max(...candidates) + halo))
        return {minimum, maximum}
    }
    const horizontal = envelope(
        core.x,
        core.x + core.width,
        fullFrame.width / 2,
        fullFrame.width,
    )
    const vertical = envelope(
        core.y,
        core.y + core.height,
        fullFrame.height / 2,
        fullFrame.height,
    )
    return {
        x: horizontal.minimum,
        y: vertical.minimum,
        width: horizontal.maximum - horizontal.minimum,
        height: vertical.maximum - vertical.minimum,
    }
}

function validateFullFrame(fullFrame: FullFrameGeometry): FullFrameGeometry {
    return {
        width: positiveInteger(fullFrame.width, 'fullFrame.width'),
        height: positiveInteger(fullFrame.height, 'fullFrame.height'),
    }
}

function maximumSquareCoreSide(
    maxWorkingTextureSide: number,
    supersample: number,
    halo: number,
): number {
    // A square expanded region maximises area for a fixed diagonal. Stay one
    // integer step conservative because workingTextureSideFor rounds upward.
    const expandedSide = Math.floor(maxWorkingTextureSide / (supersample * Math.SQRT2))
    return Math.max(0, expandedSide - 2 * halo)
}

export function planVideoTiles(settings: TilePlanSettings): TilePlan {
    const fullFrame = validateFullFrame(settings.fullFrame)
    const supersample = positiveInteger(settings.supersample, 'supersample')
    const maxTextureDimension2D = positiveInteger(
        settings.maxTextureDimension2D,
        'maxTextureDimension2D',
    )
    const gpuBudgetBytes = finitePositive(settings.gpuBudgetBytes, 'gpuBudgetBytes')
    const bytesPerWorkingTexel = finitePositive(
        settings.bytesPerWorkingTexel,
        'bytesPerWorkingTexel',
    )
    const codecAlignment = positiveInteger(settings.codecAlignment ?? 2, 'codecAlignment')
    const haloTotal = totalTileHalo(settings.halo)
    const requestedTemporalTarget = settings.temporalMagnificationTarget === undefined
        ? 1
        : finitePositive(settings.temporalMagnificationTarget, 'temporalMagnificationTarget')
    if (requestedTemporalTarget < 1) {
        throw new RangeError('temporalMagnificationTarget must be at least 1.')
    }
    const budgetSide = Math.floor(Math.sqrt(gpuBudgetBytes / bytesPerWorkingTexel))
    const maxWorkingTextureSide = Math.min(maxTextureDimension2D, budgetSide)
    const automaticCoreSide = maximumSquareCoreSide(
        maxWorkingTextureSide,
        supersample,
        haloTotal,
    )
    if (automaticCoreSide < 1) {
        throw new RangeError(
            'No tiled export surface fits the texture and GPU-memory limits after supersampling and halo.',
        )
    }

    const requestedCoreWidth = Math.min(
        fullFrame.width,
        settings.preferredCoreWidth === undefined
            ? automaticCoreSide
            : positiveInteger(settings.preferredCoreWidth, 'preferredCoreWidth'),
    )
    const requestedCoreHeight = Math.min(
        fullFrame.height,
        settings.preferredCoreHeight === undefined
            ? automaticCoreSide
            : positiveInteger(settings.preferredCoreHeight, 'preferredCoreHeight'),
    )
    // A caller-provided rectangular core can fit even when either dimension is
    // larger than the conservative automatic *square* side. Test the actual
    // diagonal and shrink proportionally only when that rectangle is too large.
    let coreWidth = requestedCoreWidth
    let coreHeight = requestedCoreHeight
    while (workingTextureSideFor(
        Math.min(fullFrame.width, coreWidth + 2 * haloTotal) * supersample,
        Math.min(fullFrame.height, coreHeight + 2 * haloTotal) * supersample,
    ) > maxWorkingTextureSide) {
        const observedSide = workingTextureSideFor(
            Math.min(fullFrame.width, coreWidth + 2 * haloTotal) * supersample,
            Math.min(fullFrame.height, coreHeight + 2 * haloTotal) * supersample,
        )
        const ratio = (maxWorkingTextureSide - 1) / observedSide
        const nextWidth = Math.max(1, Math.floor(coreWidth * ratio))
        const nextHeight = Math.max(1, Math.floor(coreHeight * ratio))
        if (nextWidth === coreWidth && nextHeight === coreHeight) {
            if (coreWidth >= coreHeight && coreWidth > 1) coreWidth--
            else if (coreHeight > 1) coreHeight--
            else {
                throw new RangeError(
                    'No tiled export surface fits the texture and GPU-memory limits after supersampling and halo.',
                )
            }
        } else {
            coreWidth = nextWidth
            coreHeight = nextHeight
        }
    }
    const buildTiles = (candidateCoreWidth: number, candidateCoreHeight: number, temporalTarget: number) => {
        const columns = Math.ceil(fullFrame.width / candidateCoreWidth)
        const rows = Math.ceil(fullFrame.height / candidateCoreHeight)
        const tiles: ExpandedTile[] = []
        let maxObservedSide = 0
        for (let row = 0; row < rows; row++) {
            for (let column = 0; column < columns; column++) {
                const x = column * candidateCoreWidth
                const y = row * candidateCoreHeight
                const core: TileCore = {
                    index: tiles.length,
                    column,
                    row,
                    x,
                    y,
                    width: Math.min(candidateCoreWidth, fullFrame.width - x),
                    height: Math.min(candidateCoreHeight, fullFrame.height - y),
                }
                const expanded = temporalExpandedRectFor(core, fullFrame, haloTotal, temporalTarget)
                const workingTextureSide = workingTextureSideFor(
                    expanded.width * supersample,
                    expanded.height * supersample,
                )
                maxObservedSide = Math.max(maxObservedSide, workingTextureSide)
                tiles.push({
                    index: core.index,
                    core,
                    expanded,
                    crop: {
                        x: core.x - expanded.x,
                        y: core.y - expanded.y,
                        width: core.width,
                        height: core.height,
                    },
                    encodedWidth: alignUp(expanded.width, codecAlignment),
                    encodedHeight: alignUp(expanded.height, codecAlignment),
                    workingTextureSide,
                    temporalMagnificationThreshold: temporalTarget,
                })
            }
        }
        return {columns, rows, tiles, maxObservedSide}
    }

    // Spend some of the selected GPU/texture budget on temporal overlap. Keep
    // at least 72% of the ordinary core side so reuse cannot explode the tile
    // count merely to chase an unattainable user threshold.
    const minimumCoreWidth = Math.max(1, Math.floor(coreWidth * 0.72))
    const minimumCoreHeight = Math.max(1, Math.floor(coreHeight * 0.72))
    let temporalTarget = requestedTemporalTarget
    let candidate = buildTiles(coreWidth, coreHeight, temporalTarget)
    while (candidate.maxObservedSide > maxWorkingTextureSide
        && (coreWidth > minimumCoreWidth || coreHeight > minimumCoreHeight)) {
        const ratio = Math.min(0.98, (maxWorkingTextureSide - 1) / candidate.maxObservedSide)
        coreWidth = Math.max(minimumCoreWidth, Math.floor(coreWidth * ratio))
        coreHeight = Math.max(minimumCoreHeight, Math.floor(coreHeight * ratio))
        candidate = buildTiles(coreWidth, coreHeight, temporalTarget)
    }
    if (candidate.maxObservedSide > maxWorkingTextureSide) {
        let low = 1
        let high = temporalTarget
        for (let iteration = 0; iteration < 28; iteration++) {
            const middle = (low + high) / 2
            const middlePlan = buildTiles(coreWidth, coreHeight, middle)
            if (middlePlan.maxObservedSide <= maxWorkingTextureSide) low = middle
            else high = middle
        }
        temporalTarget = low
        candidate = buildTiles(coreWidth, coreHeight, temporalTarget)
    }
    if (candidate.maxObservedSide > maxWorkingTextureSide) {
        throw new RangeError('No tiled export surface fits the selected temporal halo.')
    }

    const {columns, rows, tiles, maxObservedSide} = candidate

    return {
        fullFrame,
        supersample,
        halo: {...settings.halo, total: haloTotal},
        coreWidth,
        coreHeight,
        columns,
        rows,
        codecAlignment,
        maxTextureDimension2D,
        gpuBudgetBytes,
        bytesPerWorkingTexel,
        temporalMagnificationTarget: temporalTarget,
        tiles,
        maxWorkingTextureSide: maxObservedSide,
        estimatedPeakWorkingBytes: maxObservedSide * maxObservedSide * bytesPerWorkingTexel,
    }
}

/**
 * Integer bitrate allocation whose entries sum exactly to aggregateBitrate.
 * Largest remainders receive the leftover bits, with tile index as tie-breaker.
 */
export function allocateAggregateBitrate(
    aggregateBitrate: number,
    tiles: readonly Pick<ExpandedTile, 'index' | 'expanded'>[],
): number[] {
    const total = positiveInteger(aggregateBitrate, 'aggregateBitrate')
    if (tiles.length === 0) return []
    if (total < tiles.length) {
        throw new RangeError('aggregateBitrate must provide at least one bit/s per tile.')
    }
    const areas = tiles.map(tile => positiveInteger(
        tile.expanded.width * tile.expanded.height,
        `tile ${tile.index} area`,
    ))
    const totalArea = areas.reduce((sum, area) => sum + area, 0)
    const exact = areas.map(area => total * area / totalArea)
    const result = exact.map(share => Math.floor(share))
    let remaining = total - result.reduce((sum, share) => sum + share, 0)
    const order = exact
        .map((share, index) => ({index, remainder: share - Math.floor(share), tileIndex: tiles[index].index}))
        .sort((a, b) => b.remainder - a.remainder || a.tileIndex - b.tileIndex)
    for (let i = 0; remaining > 0; i++, remaining--) {
        result[order[i % order.length].index]++
    }
    return result
}

export function estimateIntermediateSize(
    aggregateBitrate: number,
    durationSeconds: number,
    containerMarginRatio = 0.01,
): IntermediateSizeEstimate {
    const bitrate = finitePositive(aggregateBitrate, 'aggregateBitrate')
    const duration = finitePositive(durationSeconds, 'durationSeconds')
    if (!Number.isFinite(containerMarginRatio) || containerMarginRatio < 0) {
        throw new RangeError('containerMarginRatio must be finite and non-negative.')
    }
    const mediaBytes = bitrate * duration / 8
    const containerMarginBytes = Math.ceil(mediaBytes * containerMarginRatio)
    return {
        mediaBytes,
        containerMarginBytes,
        totalBytes: mediaBytes + containerMarginBytes,
    }
}

export function planVideoComposition(settings: {
    fullFrame: FullFrameGeometry
    totalFrames: number
    memoryBudgetBytes: number
    bytesPerPixel?: number
    maxFramesPerBlock?: number
    decoderPoolSize?: number
}): CompositionPlan {
    const fullFrame = validateFullFrame(settings.fullFrame)
    const totalFrames = positiveInteger(settings.totalFrames, 'totalFrames')
    const memoryBudgetBytes = finitePositive(settings.memoryBudgetBytes, 'memoryBudgetBytes')
    const bytesPerPixel = positiveInteger(settings.bytesPerPixel ?? 4, 'bytesPerPixel')
    const maxFramesPerBlock = positiveInteger(
        settings.maxFramesPerBlock ?? 60,
        'maxFramesPerBlock',
    )
    const decoderPoolSize = positiveInteger(settings.decoderPoolSize ?? 4, 'decoderPoolSize')
    const bytesPerFrame = fullFrame.width * fullFrame.height * bytesPerPixel
    const memoryLimitedFrames = Math.floor(memoryBudgetBytes / bytesPerFrame)
    if (memoryLimitedFrames < 1) {
        throw new RangeError(
            `Composition budget cannot hold one ${fullFrame.width}×${fullFrame.height} frame.`,
        )
    }
    const framesPerBlock = Math.min(totalFrames, maxFramesPerBlock, memoryLimitedFrames)
    return {
        fullFrame,
        totalFrames,
        bytesPerPixel,
        bytesPerFrame,
        memoryBudgetBytes,
        framesPerBlock,
        keyframeIntervalFrames: framesPerBlock,
        decoderPoolSize,
    }
}
