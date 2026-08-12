import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {
  DEFAULT_ORBIT_TRAP,
  normalizeOrbitTrapConfig,
  normalizeOrbitTrapFromLegacy,
  orbitTrapAccumulatorSignature,
  orbitTrapColorUniformValues,
  orbitTrapIsActive,
  orbitTrapUsesOrbit,
} from '../../src/OrbitTrap';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('parametric orbit-trap configuration', () => {
  it('stays disabled by default and migrates the legacy strength', () => {
    const empty = normalizeOrbitTrapFromLegacy({});
    expect(empty).toEqual(DEFAULT_ORBIT_TRAP);
    expect(orbitTrapIsActive(empty)).toBe(false);

    const legacy = normalizeOrbitTrapFromLegacy({orbitTrapStrength: 63});
    expect(legacy.mode).toBe('terminal');
    expect(legacy.strength).toBe(63);
    expect(orbitTrapIsActive(legacy)).toBe(true);
    expect(orbitTrapUsesOrbit(legacy)).toBe(false);
  });

  it('normalizes unsafe imported values and identifies orbit modes', () => {
    const normalized = normalizeOrbitTrapConfig({
      mode: 'sampled',
      strength: 250,
      scale: 0,
      petals: 3.6,
      width: Number.NaN,
      hardness: 100,
      startIteration: -4,
    });

    expect(normalized.mode).toBe('sampled');
    expect(normalized.strength).toBe(100);
    expect(normalized.scale).toBe(0.01);
    expect(normalized.petals).toBe(4);
    expect(normalized.width).toBe(DEFAULT_ORBIT_TRAP.width);
    expect(normalized.hardness).toBe(16);
    expect(normalized.startIteration).toBe(0);
    expect(orbitTrapUsesOrbit(normalized)).toBe(true);
  });

  it('keeps one documented 21-float color-uniform suffix', () => {
    const values = orbitTrapColorUniformValues({
      ...DEFAULT_ORBIT_TRAP,
      mode: 'terminal',
      includeInterior: true,
    });
    expect(values).toHaveLength(21);
    expect(values[0]).toBe(1);
    expect(values[20]).toBe(1);
  });

  it('recomputes only when fields that affect the closest hit change', () => {
    const base = {...DEFAULT_ORBIT_TRAP, mode: 'sampled' as const, strength: 20};
    expect(orbitTrapAccumulatorSignature({...base, strength: 90, width: 0.2}))
      .toBe(orbitTrapAccumulatorSignature(base));
    expect(orbitTrapAccumulatorSignature({...base, centerX: 0.5}))
      .not.toBe(orbitTrapAccumulatorSignature(base));
  });
});

describe('terminal logarithmic-rosette shader contract', () => {
  it('replaces the fixed composite with independent geometry and composition', () => {
    const shader = read('../../src/assets/color.wgsl');

    expect(shader).toContain('fn terminal_rosette_trap(z: vec2<f32>)');
    expect(shader).toContain('parameters.orbitTrapPetalDepth * cos(');
    expect(shader).toContain('parameters.orbitTrapTwist * logRadius');
    expect(shader).toContain('let mask = exp(-pow(trapDistance / width, hardness));');
    expect(shader).toContain('parameters.orbitTrapDistanceWeight * distancePhase');
    expect(shader).toContain('parameters.orbitTrapIterationWeight * iterationPhase');
    expect(shader).toContain('parameters.orbitTrapAngleWeight * anglePhase');
    expect(shader).not.toContain('let axisTrap =');
    expect(shader).not.toContain('let diagonalTrap =');
    expect(shader).not.toContain('let circleTrap =');
    expect(shader).not.toContain('let trapWidth = mix(');
  });

  it('carries one closest-hit tuple and unfolds uncertified skips in exact mode', () => {
    const brush = read('../../src/assets/mandelbrot_brush.wgsl');
    const resolve = read('../../src/assets/resolve.wgsl');
    const merge = read('../../src/assets/merge_frozen.wgsl');
    const engine = read('../../src/Engine.ts');

    expect(brush).toContain('struct OrbitTrapState');
    expect(brush).toContain('if (hit.x < (*state).bestDistance)');
    expect(brush).toContain('(*state).hitIteration = iteration;');
    expect(brush).toContain('(*state).hitAngle = hit.y;');
    expect(brush).toContain('&& mandelbrot.orbitTrapMode < 2.5;');
    expect(brush).toContain('ENABLE_RENORM && mandelbrot.orbitTrapMode < 2.5');
    expect(resolve).toContain('texture_storage_2d<rgba32float, write>');
    expect(resolve).toContain('store_trap_payload(coord, load_trap_payload(bestEscapedCoord));');
    expect(merge).toContain('candidate.trapPayload = textureLoad(trapPayloadTex, coord, 0);');
    expect(engine).toContain('const RAW_ORBIT_GRADIENT_TRAP_LAYERS = 21');
    expect(engine).toContain('format: \'rgba32float\'');
    expect(engine).toContain("const approximationModeFlag = orbitTrap.mode === 'exact'");
    expect(engine).toContain('lastOrbitTrapMode = orbitTrap.mode');
  });

  it('keeps engine, preview, persistence, and UI on the structured config', () => {
    const engine = read('../../src/Engine.ts');
    const preview = read('../../src/components/PalettePreview.vue');
    const settings = read('../../src/components/Settings.vue');
    const params = read('../../src/Mandelbrot.ts');
    const paletteStore = read('../../src/paletteStore.ts');

    expect(engine).toContain('const COLOR_UNIFORM_FLOAT_COUNT = 96');
    expect(engine).toContain('...orbitTrapColorUniformValues(orbitTrap)');
    expect(preview).toContain('const COLOR_UNIFORM_FLOAT_COUNT = 96;');
    expect(preview).toContain('device.queue.writeBuffer(uniformBuffer, 72 * 4');
    expect(settings).toContain('orbitTrap: normalizeOrbitTrapFromLegacy(model.value)');
    expect(settings).toContain('title="Orbit trap · Rosace"');
    expect(params).toContain('orbitTrap?: OrbitTrapConfig;');
    expect(paletteStore).toContain('orbitTrap?: OrbitTrapConfig;');
  });
});
