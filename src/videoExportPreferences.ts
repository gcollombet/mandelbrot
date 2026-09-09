// ── Persisted state of the video export panel ──
// The panel is unmounted whenever its tab closes, so pinned endpoints would
// otherwise be lost on a stray click — after the user had navigated somewhere
// deep specifically to capture them. Persisted whole rather than points-only:
// keeping the start but forgetting the duration would be its own surprise.

import { isMp4Codec, type Mp4Codec } from './videoEncoderSink'
import { DEFAULT_EXPMAP_MOTION, EXPMAP_EASES, type ExpmapMotion } from './expmap/motion'
import type { VideoPathLocation } from './videoPath'
import {
  DEFAULT_TILED_EXPORT_BUDGET_MIB,
  type VideoExportRenderMode,
} from './tiledKeyframeExport'

export const VIDEO_EXPORT_PREFERENCES_KEY = 'mandelbrot_video_export'

/** Jittered AA samples offered per frame. 1 = off. */
export const AA_SAMPLE_CHOICES = [1, 2, 4, 8] as const

export type AaSampleChoice = (typeof AA_SAMPLE_CHOICES)[number]

export function isAaSampleChoice(value: unknown): value is AaSampleChoice {
  return AA_SAMPLE_CHOICES.includes(value as AaSampleChoice)
}

export type VideoExportPreferences = {
  pinnedStart: VideoPathLocation | null
  pinnedEnd: VideoPathLocation | null
  durationSeconds: number
  resolution: string
  fps: string
  supersample: string
  magnificationThreshold: number
  codec: Mp4Codec | 'auto'
  motion: ExpmapMotion
  filename: string
  timingAuthority: 'duration' | 'speed'
  aaSamplesPerFrame: number
  renderMode: VideoExportRenderMode
  tiledMemoryBudgetMiB: number
}

export const DEFAULT_VIDEO_EXPORT_PREFERENCES: VideoExportPreferences = {
  pinnedStart: null,
  pinnedEnd: null,
  durationSeconds: 20,
  resolution: '3840x2160',
  fps: '60',
  supersample: '2',
  magnificationThreshold: 2,
  codec: 'auto',
  motion: { ...DEFAULT_EXPMAP_MOTION },
  filename: 'Fractale',
  timingAuthority: 'duration',
  aaSamplesPerFrame: 1,
  renderMode: 'monolithic',
  tiledMemoryBudgetMiB: DEFAULT_TILED_EXPORT_BUDGET_MIB,
}

function normalizeLocation(value: unknown): VideoPathLocation | null {
  if (typeof value !== 'object' || value === null) return null
  const candidate = value as Record<string, unknown>
  const { cx, cy, scale } = candidate
  // Centre and scale stay decimal STRINGS: a deep view is far below what f64
  // can hold, so a location that round-tripped through a number would silently
  // land somewhere else. Reject rather than coerce.
  if (typeof cx !== 'string' || typeof cy !== 'string' || typeof scale !== 'string') return null
  if (!cx.trim() || !cy.trim() || !scale.trim()) return null
  const angle = Number(candidate.angle)
  return { cx, cy, scale, angle: Number.isFinite(angle) ? angle : 0 }
}

function normalizeString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() !== '' ? value : fallback
}

function normalizeNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function normalizeMotion(value: unknown): ExpmapMotion {
  const result = { ...DEFAULT_EXPMAP_MOTION }
  if (!value || typeof value !== 'object') return result
  const raw = value as Record<string, unknown>
  for (const key of ['easeIn','easeOut'] as const) {
    if (EXPMAP_EASES.some(e => e.value === raw[key])) result[key] = raw[key] as ExpmapMotion[typeof key]
  }
  for (const key of ['easeInSeconds','easeOutSeconds','holdSeconds'] as const) {
    if (typeof raw[key] === 'number' && Number.isFinite(raw[key]) && raw[key] >= 0 && raw[key] <= 86400) result[key] = raw[key]
  }
  return result
}

/** Coerce anything into a usable preferences object, field by field. */
export function normalizeVideoExportPreferences(value: unknown): VideoExportPreferences {
  const d = DEFAULT_VIDEO_EXPORT_PREFERENCES
  if (typeof value !== 'object' || value === null) return { ...d }
  const raw = value as Record<string, unknown>
  return {
    pinnedStart: normalizeLocation(raw.pinnedStart),
    pinnedEnd: normalizeLocation(raw.pinnedEnd),
    durationSeconds: normalizeNumber(raw.durationSeconds, d.durationSeconds),
    resolution: normalizeString(raw.resolution, d.resolution),
    fps: normalizeString(raw.fps, d.fps),
    supersample: normalizeString(raw.supersample, d.supersample),
    magnificationThreshold: normalizeNumber(raw.magnificationThreshold, d.magnificationThreshold),
    codec: raw.codec === 'auto' || isMp4Codec(raw.codec) ? raw.codec : d.codec,
    motion: normalizeMotion(raw.motion),
    filename: normalizeString(raw.filename, d.filename),
    timingAuthority: raw.timingAuthority === 'speed' ? 'speed' : 'duration',
    aaSamplesPerFrame: isAaSampleChoice(raw.aaSamplesPerFrame)
      ? raw.aaSamplesPerFrame
      : d.aaSamplesPerFrame,
    renderMode: raw.renderMode === 'tiled-keyframe' || raw.renderMode === 'monolithic'
      ? raw.renderMode
      : d.renderMode,
    tiledMemoryBudgetMiB: typeof raw.tiledMemoryBudgetMiB === 'number'
        && Number.isFinite(raw.tiledMemoryBudgetMiB)
        && raw.tiledMemoryBudgetMiB >= 64
      ? Math.round(raw.tiledMemoryBudgetMiB)
      : d.tiledMemoryBudgetMiB,
  }
}

export function loadVideoExportPreferences(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): VideoExportPreferences {
  try {
    const raw = storage?.getItem(VIDEO_EXPORT_PREFERENCES_KEY)
    if (!raw) return { ...DEFAULT_VIDEO_EXPORT_PREFERENCES }
    return normalizeVideoExportPreferences(JSON.parse(raw))
  } catch {
    // Corrupt or unavailable storage must never keep the panel from opening.
    return { ...DEFAULT_VIDEO_EXPORT_PREFERENCES }
  }
}

export function saveVideoExportPreferences(
  preferences: VideoExportPreferences,
  storage: Pick<Storage, 'setItem'> | undefined = globalThis.localStorage,
): void {
  try {
    storage?.setItem(VIDEO_EXPORT_PREFERENCES_KEY, JSON.stringify(preferences))
  } catch {
    // Private mode or a full quota: losing the pins is not worth an exception.
  }
}
