import type { ExpmapSampleDistribution } from './renderer'
export type ShaderInterpolation = 'bilinear' | 'nearest'
export type ShaderSampleDistribution = ExpmapSampleDistribution
export const SHADER_INTERPOLATIONS = [
  {value:'bilinear' as const,label:'Bilinéaire'},
  {value:'nearest' as const,label:'Nearest'},
]
export const SHADER_SAMPLE_DISTRIBUTIONS = [
  {value:'grid' as const,label:'Grille'},
  {value:'r2' as const,label:'R2'},
]
/** Camera uniform z = nearest; w = R2. The two choices are independent. */
export function shaderSamplingFlags(interpolation:ShaderInterpolation='bilinear',distribution:ShaderSampleDistribution='grid') {
  if(!['bilinear','nearest'].includes(interpolation)||!['grid','r2'].includes(distribution))throw new Error('Mode de filtrage shader invalide')
  return [interpolation==='nearest'?1:0,distribution==='r2'?1:0]
}
