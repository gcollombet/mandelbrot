import { t } from './i18n'
/** Half-resolution packing: file dimensions stay unchanged, left eye first. */
export type StereoVideoLayout = 'side-by-side' | 'top-bottom'
/** relief: exaggeration of the rendered relief height h in the depth map (1 = geometric, as lit). */
export type StereoVideoSettings = { enabled: boolean; strength: number; layout?: StereoVideoLayout; relief?: number }
/** relief: gain applied to h in the height pass only. */
export type StereoColorPass = { eyeSlope: number; height: boolean; relief?: number }
export const STEREO_RELIEF_DEFAULT = 10
export const STEREO_RELIEF_MAX = 40
export const DEFAULT_STEREO_VIDEO: StereoVideoSettings = { enabled: false, strength: 1, layout: 'side-by-side', relief: STEREO_RELIEF_DEFAULT }
export function normalizeStereoVideo(value?: Partial<StereoVideoSettings>): StereoVideoSettings {
  return { enabled: value?.enabled === true, strength: typeof value?.strength === 'number' && Number.isFinite(value.strength)
    ? Math.max(0, Math.min(3, value.strength)) : 1, layout: value?.layout === 'top-bottom' ? 'top-bottom' : 'side-by-side',
    relief: typeof value?.relief === 'number' && Number.isFinite(value.relief)
    ? Math.max(0, Math.min(STEREO_RELIEF_MAX, value.relief)) : STEREO_RELIEF_DEFAULT }
}
/** Maximum disparity between eyes as a fraction of an uncompressed eye width. */
export function stereoProjection(width: number, height: number, strength: number) {
  const disparity = normalizeStereoVideo({ strength }).strength / 100
  // Z spans [-1,1] in view half-height units; x spans [-aspect,aspect].
  return { shift: disparity / 2, eyeSlope: disparity * width / height,
    crop: disparity === 0 ? 1 : 1 - disparity - 2 / width }
}

export function validateStereoDimensions(width:number,height:number,layout:StereoVideoLayout='side-by-side') {
  const split=layout==='top-bottom'?height:width
  if(split%2)throw new Error(t(layout==='top-bottom'?'video.stereo.evenHeight':'video.stereo.evenWidth'))
}
