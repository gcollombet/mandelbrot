import type { MandelbrotParams } from './Mandelbrot'
import { log10FromDecimalString } from './floatexp'

// ── Studio quick controls ──
// The look parameters worth tweaking from the studio without opening the
// palette editor. The panel shows the pinned ones; the rest of the catalogue
// can be pinned at will. Ranges and labels mirror the editor's own controls.

export type QuickGroup = 'palette' | 'relief' | 'light' | 'grade' | 'view3d'
export type QuickParam = {
  field: keyof MandelbrotParams
  /** i18n key of the label, shared with the editor. */
  label: string
  group: QuickGroup
  min: number
  max: number
  step: number
  default: number
  digits: number
  /** Slider runs on log10 of the value (palette period). */
  log?: boolean
  /** Shown in degrees, stored in radians. */
  radians?: boolean
}

const q = (field: keyof MandelbrotParams, label: string, group: QuickGroup, min: number, max: number, step: number, def: number, digits = 2, extra: Partial<QuickParam> = {}): QuickParam =>
  ({ field, label, group, min, max, step, default: def, digits, ...extra })

export const QUICK_PARAMS: readonly QuickParam[] = [
  q('paletteOffset', 'settings.palettes.distribution.offset', 'palette', 0, 1, 0.001, 0, 3),
  q('palettePeriod', 'settings.palettes.distribution.period', 'palette', 1, 1e6, 0.01, 256, 0, { log: true }),
  q('heightPaletteShift', 'settings.palettes.distribution.heightShift', 'palette', 0, 100, 0.01, 0),
  q('paletteScreenShiftX', 'settings.palettes.distribution.screenX', 'palette', 0, 2, 0.01, 0),
  q('paletteScreenShiftY', 'settings.palettes.distribution.screenY', 'palette', 0, 2, 0.01, 0),
  q('reliefDepth', 'settings.palettes.surface.reliefDepth', 'relief', 0, 2, 0.01, 1),
  q('microBumpStrength', 'settings.palettes.surface.microBump', 'relief', 0, 2, 0.01, 0),
  q('protrusionPhase', 'settings.palettes.surface.protrusionPhase', 'relief', 0, 1, 0.001, 0, 3),
  q('protrusionSharpness', 'settings.palettes.surface.protrusionSharpness', 'relief', 0.25, 16, 0.05, 2),
  q('protrusionStrength', 'settings.palettes.surface.protrusionStrength', 'relief', 1, 4, 0.01, 1),
  q('protrusionGeometryMix', 'settings.palettes.surface.protrusionGeometry', 'relief', 0, 1, 0.01, 0),
  q('protrusionTerrace', 'settings.palettes.surface.protrusionTerrace', 'relief', 0, 1, 0.01, 0),
  q('lightAngle', 'settings.palettes.surface.lightDirection', 'light', 0, 6.283, 0.01, 3.927, 0, { radians: true }),
  q('localShadowStrength', 'settings.palettes.surface.localShadows', 'light', 0, 10, 0.01, 0),
  q('ambientOcclusionStrength', 'settings.palettes.surface.ambientOcclusion', 'light', 0, 10, 0.01, 0),
  q('castShadowStrength', 'settings.palettes.surface.castShadows', 'light', 0, 1, 0.01, 0),
  q('castShadowLength', 'settings.palettes.surface.castShadowLength', 'light', 1, 20, 0.1, 4),
  q('castShadowSoftness', 'settings.palettes.surface.castShadowSoftness', 'light', 0.02, 1, 0.01, 0.35),
  q('horizonOcclusionStrength', 'settings.palettes.surface.horizonOcclusion', 'light', 0, 1, 0.01, 0),
  q('indirectLightStrength', 'settings.palettes.surface.indirectLight', 'light', 0, 2, 0.01, 0),
  q('varnishStrength', 'settings.palettes.surface.varnish', 'light', 0, 100, 0.05, 0),
  q('gradeContrast', 'settings.palettes.surface.contrast', 'grade', 0.5, 2, 0.01, 1.18),
  q('gradeSaturation', 'settings.palettes.surface.saturation', 'grade', 0, 2, 0.01, 1.12),
  q('tiltViewTilt', 'settings.navigation.view3d.tilt', 'view3d', 0, 50, 0.5, 0, 1),
  q('tiltViewHeading', 'settings.navigation.view3d.heading', 'view3d', 0, 360, 1, 0, 0),
  q('tiltViewRelief', 'settings.navigation.view3d.relief', 'view3d', 0, 40, 0.5, 10, 1),
]

export const QUICK_GROUPS: readonly QuickGroup[] = ['palette', 'relief', 'light', 'grade', 'view3d']
export const QUICK_DEFAULT_PINS: readonly string[] = ['paletteOffset', 'palettePeriod', 'heightPaletteShift', 'reliefDepth', 'lightAngle', 'gradeContrast', 'gradeSaturation']
export const QUICK_PINS_KEY = 'mandelbrot_studio_quick_params'
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>

/** Pinned fields in catalogue order; an unreadable or empty store gives the defaults. */
export function loadQuickPins(storage: Storage = localStorage): string[] {
  try {
    const raw = JSON.parse(storage.getItem(QUICK_PINS_KEY) ?? 'null')
    if (Array.isArray(raw)) return QUICK_PARAMS.map(p => p.field as string).filter(f => raw.includes(f))
  } catch { /* defaults */ }
  return [...QUICK_DEFAULT_PINS]
}
export function saveQuickPins(pins: readonly string[], storage: Storage = localStorage): void {
  storage.setItem(QUICK_PINS_KEY, JSON.stringify(pins))
}

/** Slider position of a value, and back. */
export const quickToSlider = (p: QuickParam, value: number): number => p.log ? Math.log10(Math.max(p.min, value)) : value
export const quickFromSlider = (p: QuickParam, slider: number): number => p.log ? Number((10 ** slider).toPrecision(6)) : slider
export const quickSliderRange = (p: QuickParam) => p.log ? { min: Math.log10(p.min), max: Math.log10(p.max), default: Math.log10(p.default) } : { min: p.min, max: p.max, default: p.default }
export function formatQuick(p: QuickParam, value: number): string {
  if (p.radians) return `${Math.round(value * 180 / Math.PI)}°`
  if (p.log) return value >= 1e6 ? `${(value / 1e6).toFixed(1)}M` : value >= 1e4 ? `${Math.round(value / 1e3)}K` : String(Math.round(value))
  return value.toFixed(p.digits)
}

/** A scale (decimal string, possibly far below f64) multiplied by `factor`:
 *  done on its log10 so `1e-400` stays representable. 15 significant digits. */
export function scaleTimes(scale: string, factor: number): string {
  const log = log10FromDecimalString(scale) + Math.log10(factor)
  if (!Number.isFinite(log)) return scale
  const exponent = Math.floor(log)
  return `${Number((10 ** (log - exponent)).toPrecision(15))}e${exponent}`
}

/** An angle in radians as degrees in (-180, 180]. */
export function wrapDegrees(radians: number): number {
  const d = ((radians * 180 / Math.PI) % 360 + 540) % 360 - 180
  return d === -180 ? 180 : d
}
