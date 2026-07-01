import {describe, expect, it} from 'vitest';
import {
  chevronCountForZoomDelta,
  edgeDistanceInScreens,
  perceptualPresetDistance,
  projectToSafeFrameEdge,
  spatialDistanceInScreens,
  zoomDepthDeltaSteps,
} from '../../src/presetDiscovery';

describe('preset discovery helpers', () => {
  it('computes zoom-depth difference in powers-of-two steps', () => {
    expect(zoomDepthDeltaSteps('1', '0.5')).toBeCloseTo(1);
    expect(zoomDepthDeltaSteps('1', '2')).toBeCloseTo(-1);
    expect(zoomDepthDeltaSteps('1e-4', '1e-6')).toBeCloseTo(Math.log2(100));
  });

  it('stays accurate far below the f64 floor (regression)', () => {
    // Number('1e-500') === 0, so the old Number()-based parsing collapsed both
    // sides to the same fallback once either scale underflowed, reporting 0
    // zoom-depth difference between presets that are actually 500 steps apart.
    const LOG2_10 = 3.321928094887362;
    expect(zoomDepthDeltaSteps('1e-500', '1e-700')).toBeCloseTo(200 * LOG2_10, 2);
    expect(zoomDepthDeltaSteps('1e-1000', '1')).toBeCloseTo(-1000 * LOG2_10, 2);
  });

  it('treats one 2x zoom step as half a screen of perceptual travel', () => {
    expect(perceptualPresetDistance(0, 1)).toBeCloseTo(0.5);
    expect(perceptualPresetDistance(0.75, 2)).toBeCloseTo(1.75);
  });

  it('combines spatial and zoom-depth distance for ranking', () => {
    const sameDepthFar = perceptualPresetDistance(0.8, 0);
    const closeButFourZoomStepsAway = perceptualPresetDistance(0.1, 4);
    expect(sameDepthFar).toBeLessThan(closeButFourZoomStepsAway);
  });

  it('measures spatial distance in screen units from the center', () => {
    expect(spatialDistanceInScreens({x: 50, y: 50}, {width: 100, height: 100})).toBeCloseTo(0);
    expect(spatialDistanceInScreens({x: 100, y: 50}, {width: 100, height: 100})).toBeCloseTo(0.5);
  });

  it('caps zoom-depth chevrons', () => {
    expect(chevronCountForZoomDelta(0.25)).toBe(0);
    expect(chevronCountForZoomDelta(2)).toBe(1);
    expect(chevronCountForZoomDelta(5)).toBe(2);
    expect(chevronCountForZoomDelta(40)).toBe(3);
  });

  it('projects off-screen points to a safe-frame edge', () => {
    const frame = {left: 10, top: 20, right: 90, bottom: 80};
    expect(projectToSafeFrameEdge({x: 200, y: 50}, frame)).toEqual({x: 90, y: 50});
    expect(projectToSafeFrameEdge({x: 50, y: -50}, frame)).toEqual({x: 50, y: 20});
  });

  it('uses the edge projection when computing off-screen distance', () => {
    const frame = {left: 0, top: 0, right: 100, bottom: 100};
    expect(edgeDistanceInScreens({x: 200, y: 50}, frame, {width: 100, height: 100})).toBeCloseTo(0.5);
  });
});
