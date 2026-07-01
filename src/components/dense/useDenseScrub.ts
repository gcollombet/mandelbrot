import { ref, type Ref } from 'vue';

export interface ScrubOptions {
  min: number;
  max: number;
  step: number;
  /** Read the current value when a drag begins. */
  get: () => number;
  /** Write a new (already clamped + stepped) value during the drag. */
  set: (v: number) => void;
  /** Fine-adjust factor applied while a modifier (Shift) is held. Default 0.2. */
  fineFactor?: number;
  /** Pixels of travel that span the full [min,max] range. Default 220. */
  travelPx?: number;
}

/**
 * Drag-to-scrub interaction shared by every numeric dense field.
 * The whole row is the drag surface: horizontal pointer travel maps to value
 * delta across the range; Shift reduces sensitivity for precise tuning.
 * Mirrors the mockup's `.fld` behaviour (cursor:ew-resize, .fld.scrub state).
 */
export function useDenseScrub(opts: ScrubOptions) {
  const scrubbing: Ref<boolean> = ref(false);
  let startX = 0;
  let startVal = 0;
  let pointerId = -1;

  const range = () => opts.max - opts.min;
  const travel = () => opts.travelPx ?? 220;

  function clampStep(v: number): number {
    const clamped = Math.min(opts.max, Math.max(opts.min, v));
    if (opts.step > 0) {
      const snapped = opts.min + Math.round((clamped - opts.min) / opts.step) * opts.step;
      // Guard against FP drift pushing us a hair out of range.
      return Math.min(opts.max, Math.max(opts.min, snapped));
    }
    return clamped;
  }

  function onPointerDown(e: PointerEvent) {
    // Ignore secondary buttons; let inline editors handle their own input.
    if (e.button !== 0) return;
    scrubbing.value = true;
    startX = e.clientX;
    startVal = opts.get();
    pointerId = e.pointerId;
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    e.preventDefault();
  }

  function onPointerMove(e: PointerEvent) {
    if (!scrubbing.value) return;
    const dx = e.clientX - startX;
    const fine = e.shiftKey ? (opts.fineFactor ?? 0.2) : 1;
    const delta = (dx / travel()) * range() * fine;
    opts.set(clampStep(startVal + delta));
  }

  function endScrub(e: PointerEvent) {
    if (!scrubbing.value) return;
    scrubbing.value = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture?.(pointerId);
    } catch { /* capture may already be released */ }
  }

  return { scrubbing, onPointerDown, onPointerMove, endScrub, clampStep };
}
