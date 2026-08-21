import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';

const shader = readFileSync(new URL('../../src/assets/color.wgsl', import.meta.url), 'utf8');

describe('material anisotropy shader contract', () => {
  it('gates the directional iridescence response with material anisotropy', () => {
    const iridescence = shader.slice(
      shader.indexOf('if (fx.wIridescence > 0.001)'),
      shader.indexOf('var envColor'),
    );

    expect(iridescence).toContain('let anisotropicOrientationShift =');
    expect(iridescence).toContain('let orientationShift = mix(0.5, anisotropicOrientationShift, anisotropy);');
    expect(iridescence).toContain('rotate_sincos(anisotropyReliefDir, sceneSin, sceneCos)');
  });
});
