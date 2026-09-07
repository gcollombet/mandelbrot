/** Normalized transport, independent of render speed and exact decimal scales. */
export function advanceExpmapPlayback(position: number, elapsedSeconds: number, duration: number, rate: number, direction: number, loop: boolean) {
  const next = position + Math.max(0, elapsedSeconds) * rate * direction / Math.max(duration, 0.001)
  if (loop) return { position: ((next % 1) + 1) % 1, ended: false }
  return { position: Math.max(0, Math.min(1, next)), ended: direction > 0 ? next >= 1 : next <= 0 }
}
export function expmapTimeLabel(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}
