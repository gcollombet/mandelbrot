import { describe, expect, it } from 'vitest';
import { nearestPaletteStop } from '../../src/palettePicking';
describe('palette stop picking', () => {
  it('selects the original index in an unsorted palette without modifying it', () => {
    const stops = [{position: 1}, {position: 0}, {position: 0.4}];
    expect(nearestPaletteStop(stops, 0.42)).toBe(2);
    expect(stops).toEqual([{position: 1}, {position: 0}, {position: 0.4}]);
    expect(nearestPaletteStop(stops, 0.99)).toBe(0);
    expect(nearestPaletteStop(stops, 0.01)).toBe(1);
  });
  it('uses the first stop for ties and handles missing or invalid samples', () => {
    expect(nearestPaletteStop([{position: 0}, {position: 1}], 0.5)).toBe(0);
    expect(nearestPaletteStop([], 0.5)).toBeNull();
    expect(nearestPaletteStop([{position: 0}], NaN)).toBeNull();
  });
});
