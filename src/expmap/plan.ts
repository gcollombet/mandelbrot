import { canonicalDecimal, canonicalScale, compareScales, scaleDoublements } from './decimal'

export type ExpmapDomain = { cx: string; cy: string; startScale: string; endScale: string }
export type ExpmapPlan = {
  domain: ExpmapDomain
  width: number
  height: number
  density: number
  radius: number
  depth: number
  angularSamples: number
  rhoStep: number
  halo: number
  blockSize: number
}
export type ExpmapRect = { x: number; y: number; width: number; height: number }
export type ExpmapBlock = {
  id: string
  region: 'band' | 'center'
  /** Source sample origin within the current tile. */
  originX: number
  originY: number
  gridWidth: number
  useful: ExpmapRect
  codedWidth: number
  codedHeight: number
}

export function canonicalDomain(domain: ExpmapDomain): ExpmapDomain {
  const result = {
    cx: canonicalDecimal(domain.cx), cy: canonicalDecimal(domain.cy),
    startScale: canonicalScale(domain.startScale), endScale: canonicalScale(domain.endScale),
  }
  if (compareScales(result.startScale, result.endScale) < 0) throw new Error('Document domain must go from coarse to fine')
  return result
}

export function planExpmap(input: {
  domain: ExpmapDomain; width: number; height: number; density: number
  halo?: number; blockSize?: number
}): ExpmapPlan {
  const { width, height, density } = input
  if (![width, height].every(n => Number.isInteger(n) && n > 0 && n <= 16384)) throw new Error('Invalid target dimensions')
  if (!Number.isFinite(density) || density < 1 || density > 8) throw new Error('Density must be in [1, 8]')
  const halo = input.halo ?? 2, blockSize = input.blockSize ?? 512
  if (!Number.isInteger(halo) || halo < 1 || halo > 16) throw new Error('Invalid filter halo')
  if (!Number.isInteger(blockSize) || blockSize <= 2 * halo || blockSize > 512 || blockSize % 2) throw new Error('Invalid coded block size')
  const domain = canonicalDomain(input.domain)
  const radius = Math.hypot(width, height) / 2
  const depth = scaleDoublements(domain.startScale, domain.endScale) * Math.LN2
  if (!Number.isFinite(depth) || depth / Math.LN2 > 999980) throw new Error('Document exceeds planner limit')
  if (radius > 4096) throw new Error('Target exceeds the 12-doubling center coverage')
  return {
    domain, width, height, density, radius, depth,
    angularSamples: Math.ceil(2 * Math.PI * density * radius),
    rhoStep: Math.LN2 / Math.ceil(Math.LN2 * density * radius), halo, blockSize,
  }
}
