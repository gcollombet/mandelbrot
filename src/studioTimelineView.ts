// ── Studio timeline: horizontal zoom and scroll ──
// The view shows `duration / zoom` seconds starting at `start`. Zoom 1 fits the
// whole parcours; the functions below keep the window inside [0, duration].

export type TimelineView = { zoom: number; start: number }

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export const viewSpan = (view: TimelineView, duration: number): number => duration / Math.max(1, view.zoom)

export function clampView(view: TimelineView, duration: number, maxZoom: number): TimelineView {
  const zoom = clamp(Number.isFinite(view.zoom) ? view.zoom : 1, 1, Math.max(1, maxZoom))
  const span = duration / zoom
  return { zoom, start: clamp(Number.isFinite(view.start) ? view.start : 0, 0, Math.max(0, duration - span)) }
}

/** Zoom by `factor`, keeping `anchor` (seconds) at the same place on screen. */
export function zoomAround(view: TimelineView, duration: number, factor: number, anchor: number, maxZoom: number): TimelineView {
  const span = viewSpan(view, duration)
  const fraction = span > 0 ? clamp((anchor - view.start) / span, 0, 1) : 0.5
  const zoom = clamp(view.zoom * factor, 1, Math.max(1, maxZoom))
  return clampView({ zoom, start: anchor - fraction * duration / zoom }, duration, maxZoom)
}

/** Scroll so `time` sits in the middle of the window. */
export function centerOn(view: TimelineView, duration: number, time: number): TimelineView {
  return clampView({ zoom: view.zoom, start: time - viewSpan(view, duration) / 2 }, duration, view.zoom)
}

/** Leave the window alone when `time` is visible, otherwise centre on it. */
export function revealTime(view: TimelineView, duration: number, time: number): TimelineView {
  const span = viewSpan(view, duration)
  return time >= view.start && time <= view.start + span ? view : centerOn(view, duration, time)
}

const RULER_SECONDS = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]

/** Tick spacing in seconds for a given scale, and how many ticks between labels.
 *  Below one second the ticks fall on whole frames. */
export function rulerStep(pixelsPerSecond: number, fps = 24): { step: number; labelEvery: number } {
  const frames = [1, 2, 5, 10].filter(n => n < fps && fps % n === 0).map(n => n / fps)
  const steps = [...frames, ...RULER_SECONDS]
  const step = steps.find(s => s * pixelsPerSecond >= 10) ?? steps[steps.length - 1]
  return { step, labelEvery: Math.max(1, Math.ceil(64 / (step * pixelsPerSecond))) }
}

/** Magnet: the nearest target within `tolerance` seconds, searched group by
 *  group (earlier groups win), or `value` itself when nothing is close. */
export function snapTime(value: number, groups: readonly (readonly number[])[], tolerance: number): { time: number; snapped: boolean } {
  for (const group of groups) {
    let best = NaN, distance = tolerance
    for (const target of group) {
      const d = Math.abs(target - value)
      if (d <= distance) { best = target; distance = d }
    }
    if (!Number.isNaN(best)) return { time: best, snapped: true }
  }
  return { time: value, snapped: false }
}
