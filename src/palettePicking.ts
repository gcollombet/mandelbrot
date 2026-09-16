/** Select by palette position, independently of shading and material colour. */
export function nearestPaletteStop(stops: readonly { position: number }[], phase: number): number | null {
  if (!Number.isFinite(phase)) return null;
  let nearest: number | null = null;
  let distance = Infinity;
  stops.forEach((stop, index) => {
    const candidate = Math.abs(stop.position - phase);
    if (candidate < distance) { nearest = index; distance = candidate; }
  });
  return nearest;
}
