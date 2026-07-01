import {log2FromDecimalString} from './floatexp';

export const ZOOM_STEP_SCREEN_COST = 0.5;

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface ScreenSize {
  width: number;
  height: number;
}

export interface SafeFrame {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export function parsePositiveScale(scale: string | number | undefined): number {
  const value = typeof scale === 'number' ? scale : Number(scale);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

// log2 of a scale value/string. String input goes through `log2FromDecimalString`
// (no f64 intermediate) so depths past the f64 floor (~1e-308) — reachable now
// that the zoom slider goes to 1e-1000 — don't underflow to 0 and silently
// report "no zoom difference". Falls back to 0 (i.e. scale 1) for anything
// unparsable, matching `parsePositiveScale`'s fallback.
function scaleLog2(scale: string | number | undefined): number {
  if (typeof scale === 'string') {
    const v = log2FromDecimalString(scale);
    return Number.isFinite(v) ? v : 0;
  }
  return Number.isFinite(scale) && (scale as number) > 0 ? Math.log2(scale as number) : 0;
}

export function zoomDepthDeltaSteps(currentScale: string | number | undefined, targetScale: string | number | undefined): number {
  return scaleLog2(currentScale) - scaleLog2(targetScale);
}

export function chevronCountForZoomDelta(deltaSteps: number): number {
  const absDelta = Math.abs(deltaSteps);
  if (absDelta < 0.75) return 0;
  if (absDelta < 3) return 1;
  if (absDelta < 8) return 2;
  return 3;
}

export function spatialDistanceInScreens(point: ScreenPoint, size: ScreenSize): number {
  const width = Math.max(1, size.width);
  const height = Math.max(1, size.height);
  const centerX = width / 2;
  const centerY = height / 2;
  return Math.hypot((point.x - centerX) / width, (point.y - centerY) / height);
}

export function perceptualPresetDistance(spatialDistanceScreens: number, zoomDeltaSteps: number): number {
  return spatialDistanceScreens + Math.abs(zoomDeltaSteps) * ZOOM_STEP_SCREEN_COST;
}

export function isInsideSafeFrame(point: ScreenPoint, frame: SafeFrame): boolean {
  return point.x >= frame.left && point.x <= frame.right && point.y >= frame.top && point.y <= frame.bottom;
}

export function projectToSafeFrameEdge(point: ScreenPoint, frame: SafeFrame): ScreenPoint {
  const center = {
    x: (frame.left + frame.right) / 2,
    y: (frame.top + frame.bottom) / 2,
  };
  const dx = point.x - center.x;
  const dy = point.y - center.y;
  if (dx === 0 && dy === 0) return center;

  const candidates: number[] = [];
  if (dx !== 0) {
    candidates.push((frame.left - center.x) / dx);
    candidates.push((frame.right - center.x) / dx);
  }
  if (dy !== 0) {
    candidates.push((frame.top - center.y) / dy);
    candidates.push((frame.bottom - center.y) / dy);
  }

  const t = candidates
    .filter(value => value > 0)
    .sort((a, b) => a - b)[0] ?? 1;

  return {
    x: Math.min(Math.max(center.x + dx * t, frame.left), frame.right),
    y: Math.min(Math.max(center.y + dy * t, frame.top), frame.bottom),
  };
}

export function edgeDistanceInScreens(point: ScreenPoint, frame: SafeFrame, size: ScreenSize): number {
  const edge = isInsideSafeFrame(point, frame) ? point : projectToSafeFrameEdge(point, frame);
  return spatialDistanceInScreens(edge, size);
}
