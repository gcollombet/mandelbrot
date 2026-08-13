import {describe, expect, it} from 'vitest';
import {absolutePresetUrl, presetGuidFromRouteQuery} from '../../src/presetDeepLink';

describe('preset catalogue deep links', () => {
  it('normalizes Vue Router scalar and repeated query values', () => {
    expect(presetGuidFromRouteQuery(' catalog-guid ')).toBe('catalog-guid');
    expect(presetGuidFromRouteQuery(['first-guid', 'second-guid'])).toBe('first-guid');
  });

  it('ignores absent, null, or empty preset parameters', () => {
    expect(presetGuidFromRouteQuery(undefined)).toBeNull();
    expect(presetGuidFromRouteQuery(null)).toBeNull();
    expect(presetGuidFromRouteQuery('  ')).toBeNull();
  });

  it('builds an absolute share URL under the deployed router base', () => {
    expect(absolutePresetUrl('/mandelbrot/?preset=guid-1', 'https://example.test/mandelbrot/'))
      .toBe('https://example.test/mandelbrot/?preset=guid-1');
  });
});
