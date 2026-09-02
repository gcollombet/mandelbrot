import type { VideoPathLocation } from './videoPath'

export type KeyframeTile = {
  index: number
  originX: number
  originY: number
  width: number
  height: number
}

export type TiledExportMemoryEstimate = {
  squareBytes: number
  tileBytes: number
  totalBytes: number
  minimumBytes: number
  squareBytesPerTexel: number
  tileBytesPerTexel: number
}

export type KeyframeTilePlan = {
  neutralSide: number
  tileSide: number
  alignment: number
  budgetBytes: number
  tiles: KeyframeTile[]
  estimate: TiledExportMemoryEstimate
}

export type TiledExportMemoryProfile = {
  /** Bytes kept for every texel of both full-size keyframes and colour target. */
  squareBytesPerTexel: number
  /** Bytes whose allocation follows the square tile allocation. */
  tileBytesPerTexel: number
}

export type TiledKeyframeEligibility = {
  eligible: boolean
  problems: string[]
}

export type VideoExportRenderMode = 'monolithic' | 'tiled-keyframe'

export const DEFAULT_TILED_EXPORT_MEMORY_PROFILE: TiledExportMemoryProfile = {
  squareBytesPerTexel: 56,
  tileBytesPerTexel: 144,
}

export const DEFAULT_TILED_EXPORT_BUDGET_MIB = 4096
export const TILED_EXPORT_WORKGROUP_ALIGNMENT = 16

export type TiledKeyframeEligibilityInput = {
  from: VideoPathLocation
  to: VideoPathLocation
  aaSamplesPerFrame: number
}

export class TiledExportBudgetError extends RangeError {
  readonly minimumBudgetBytes: number

  constructor(minimumBudgetBytes: number) {
    super(
      `Le budget mémoire est insuffisant pour les deux keyframes et une tuile minimale. `
      + `Il faut au moins ${minimumBudgetBytes} octets.`,
    )
    this.name = 'TiledExportBudgetError'
    this.minimumBudgetBytes = minimumBudgetBytes
  }
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(`${name} doit être un entier strictement positif.`)
  }
}

function assertMemoryProfile(profile: TiledExportMemoryProfile): void {
  for (const [name, value] of Object.entries(profile)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new RangeError(`${name} doit être un nombre fini positif ou nul.`)
    }
  }
  if (profile.tileBytesPerTexel === 0) {
    throw new RangeError('tileBytesPerTexel doit être strictement positif.')
  }
}

export function estimateTiledExportMemory(
  neutralSide: number,
  tileSide: number,
  alignment: number,
  profile: TiledExportMemoryProfile,
): TiledExportMemoryEstimate {
  assertPositiveInteger('neutralSide', neutralSide)
  assertPositiveInteger('tileSide', tileSide)
  assertPositiveInteger('alignment', alignment)
  assertMemoryProfile(profile)

  const squareBytes = neutralSide * neutralSide * profile.squareBytesPerTexel
  const tileBytes = tileSide * tileSide * profile.tileBytesPerTexel
  const minimumBytes = squareBytes + alignment * alignment * profile.tileBytesPerTexel
  return {
    squareBytes,
    tileBytes,
    totalBytes: squareBytes + tileBytes,
    minimumBytes,
    ...profile,
  }
}

export function planKeyframeTiles(settings: {
  neutralSide: number
  alignment: number
  budgetBytes: number
  memory: TiledExportMemoryProfile
}): KeyframeTilePlan {
  const { neutralSide, alignment, budgetBytes, memory } = settings
  assertPositiveInteger('neutralSide', neutralSide)
  assertPositiveInteger('alignment', alignment)
  if (!Number.isFinite(budgetBytes) || budgetBytes <= 0) {
    throw new RangeError('budgetBytes doit être un nombre fini strictement positif.')
  }
  assertMemoryProfile(memory)

  const squareBytes = neutralSide * neutralSide * memory.squareBytesPerTexel
  const minimumBudgetBytes = squareBytes + alignment * alignment * memory.tileBytesPerTexel
  if (budgetBytes < minimumBudgetBytes) {
    throw new TiledExportBudgetError(minimumBudgetBytes)
  }

  const availableTileBytes = budgetBytes - squareBytes
  const largestBudgetSide = Math.floor(
    Math.sqrt(availableTileBytes / memory.tileBytesPerTexel) / alignment,
  ) * alignment
  const fullSquareAllocationSide = Math.ceil(neutralSide / alignment) * alignment
  const tileSide = Math.min(fullSquareAllocationSide, largestBudgetSide)

  const tiles: KeyframeTile[] = []
  for (let originY = 0; originY < neutralSide; originY += tileSide) {
    for (let originX = 0; originX < neutralSide; originX += tileSide) {
      tiles.push({
        index: tiles.length,
        originX,
        originY,
        width: Math.min(tileSide, neutralSide - originX),
        height: Math.min(tileSide, neutralSide - originY),
      })
    }
  }

  return {
    neutralSide,
    tileSide,
    alignment,
    budgetBytes,
    tiles,
    estimate: estimateTiledExportMemory(neutralSide, tileSide, alignment, memory),
  }
}

export function evaluateTiledKeyframeEligibility(
  input: TiledKeyframeEligibilityInput,
): TiledKeyframeEligibility {
  const problems: string[] = []
  if (input.from.cx !== input.to.cx || input.from.cy !== input.to.cy) {
    problems.push(
      'Le mode keyframe tuilée exige un centre fixe. Un travelling utilise le chemin monolithique.',
    )
  }
  if (input.aaSamplesPerFrame !== 1) {
    problems.push(
      'Le mode keyframe tuilée n’accepte pas l’AA jitteré par image : ses frames intermédiaires '
      + 'sont de pures lectures. Utilisez le suréchantillonnage pour l’anticrénelage.',
    )
  }
  return { eligible: problems.length === 0, problems }
}

/** Pixel-centre projection shared by CPU contracts for the WGSL tile mapping. */
export function neutralUvForTileTexel(
  localX: number,
  localY: number,
  tile: Pick<KeyframeTile, 'originX' | 'originY'>,
  neutralSide: number,
): [number, number] {
  return [
    (tile.originX + localX + 0.5) / neutralSide,
    1 - (tile.originY + localY + 0.5) / neutralSide,
  ]
}
