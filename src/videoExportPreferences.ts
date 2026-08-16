// ── Persisted state of the video export panel ──
// The panel is unmounted whenever its tab closes, so pinned endpoints would
// otherwise be lost on a stray click — after the user had navigated somewhere
// deep specifically to capture them. Persisted whole rather than points-only:
// keeping the start but forgetting the duration would be its own surprise.

import { DEFAULT_VIDEO_CODEC, isMp4Codec, type Mp4Codec } from './videoEncoderSink'
import type { VideoPathLocation } from './videoPath'

export const VIDEO_EXPORT_PREFERENCES_KEY = 'mandelbrot_video_export'

export type VideoExportPreferences = {
  pinnedStart: VideoPathLocation | null
  pinnedEnd: VideoPathLocation | null
  durationSeconds: number
  resolution: string
  fps: string
  supersample: string
  magnificationThreshold: number
  codec: Mp4Codec
}

export const DEFAULT_VIDEO_EXPORT_PREFERENCES: VideoExportPreferences = {
  pinnedStart: null,
  pinnedEnd: null,
  durationSeconds: 20,
  resolution: '1920x1080',
  fps: '30',
  supersample: '2',
  magnificationThreshold: 2,
  codec: DEFAULT_VIDEO_CODEC,
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
    codec: isMp4Codec(raw.codec) ? raw.codec : d.codec,
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
