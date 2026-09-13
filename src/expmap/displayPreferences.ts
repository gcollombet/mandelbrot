import type { ShaderInterpolation, ShaderSampleDistribution } from './displaySampling'
import { isMp4Codec, type Mp4Codec } from '../videoEncoderSink'
/** Shader panel settings that survive a reload: creation, playback and video export. */
export type ShaderExpmapPreferences = {
  interpolation: ShaderInterpolation; sampleDistribution: ShaderSampleDistribution; radialDensity: number; budgetMiB: number; samples: number; previewScale: string; angle: number
  width: number; height: number; fps: number; codec: Mp4Codec; ringFirst: boolean; keepRings: boolean; ringBitrateMbps: number
}
export const SHADER_SAMPLE_CHOICES = [1, 4, 9, 16, 36, 64, 144, 256]
export const DEFAULT_SHADER_PREFERENCES: ShaderExpmapPreferences = {
  interpolation: 'bilinear', sampleDistribution: 'grid', radialDensity: 1, budgetMiB: 512, samples: 16, previewScale: '', angle: 0,
  width: 3840, height: 2160, fps: 60, codec: 'hevc', ringFirst: true, keepRings: false, ringBitrateMbps: 100,
}
const KEY = 'shader-expmap-preferences'
const num = (v: unknown, d: number, min: number, max: number, step = 0) => typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max && (!step || Math.abs(v / step - Math.round(v / step)) < 1e-9) ? v : d
export function loadShaderPreferences(): ShaderExpmapPreferences {
  const d = DEFAULT_SHADER_PREFERENCES
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return {
      // Migrate the previous combined selector only when the new field is absent.
      interpolation: v.interpolation===undefined?(v.samplingMode==='nearest-r2'?'nearest':'bilinear'):(v.interpolation==='nearest'?'nearest':'bilinear'),
      sampleDistribution: v.sampleDistribution===undefined?(v.samplingMode==='nearest-r2'?'r2':'grid'):(v.sampleDistribution==='r2'?'r2':'grid'),
      radialDensity: num(v.radialDensity, d.radialDensity, 1, 64, 1),
      budgetMiB: num(v.budgetMiB, d.budgetMiB, 64, 16384, 64),
      samples: SHADER_SAMPLE_CHOICES.includes(v.samples) ? v.samples : d.samples,
      previewScale: typeof v.previewScale === 'string' ? v.previewScale : d.previewScale,
      angle: num(v.angle, d.angle, -36000, 36000),
      width: num(v.width, d.width, 16, 3840, 2),
      height: num(v.height, d.height, 16, 2160, 2),
      fps: [24, 25, 30, 60].includes(v.fps) ? v.fps : d.fps,
      codec: isMp4Codec(v.codec) ? v.codec : d.codec,
      ringFirst: typeof v.ringFirst === 'boolean' ? v.ringFirst : d.ringFirst,
      keepRings: typeof v.keepRings === 'boolean' ? v.keepRings : d.keepRings,
      ringBitrateMbps: num(v.ringBitrateMbps, d.ringBitrateMbps, 1, 500),
    }
  } catch { return { ...d } }
}
export function saveShaderPreferences(value: ShaderExpmapPreferences) {
  try { localStorage.setItem(KEY, JSON.stringify(value)) } catch { /* In-memory controls remain usable. */ }
}
