import { scaleTimesExp } from './decimal'
import type { ExpmapPlan, ExpmapBlock } from './plan'

export type ExpmapKernelProjection = {
  displaySet?: boolean
  scale: string
  iterationScale: string
  precisionScale: string
  width: number
  height: number
  /** Appended to BrushUniforms after its existing 16 scalars. */
  uniforms: Float32Array
}

/** One stored sample per grid node; density controls spatial sampling. No
 * inherited Cartesian analytic-AA footprint, frozen/live reuse or prefilter.
 * The reader's linear-light reconstruction is the only reconstruction filter. */
export function expmapKernelProjection(plan: ExpmapPlan, block: ExpmapBlock): ExpmapKernelProjection {
  const x0 = block.originX - block.useful.x
  const y0 = block.originY - block.useful.y
  const mode = block.region === 'band' ? 1 : 3
  const scale = block.region === 'band'
    ? scaleTimesExp(plan.domain.startScale, Math.log(2 * plan.radius / plan.height) - y0 * plan.rhoStep)
    : scaleTimesExp(plan.domain.endScale, Math.log(2 / plan.height))
  return {
    scale, iterationScale: plan.domain.endScale, precisionScale: scaleTimesExp(plan.domain.endScale, Math.log(2 / (plan.height * Math.max(plan.density, plan.radialDensity ?? plan.density))) - ((plan.centerOctaves ?? 12) + 2) * Math.LN2), width: block.codedWidth, height: block.codedHeight,
    uniforms: new Float32Array([
      mode, block.codedWidth, block.codedHeight, x0,
      y0, block.gridWidth, plan.rhoStep, 0,
      0, plan.density, 0, 0,
    ]),
  }
}
