// Representation audit, not a GPU test or a visual benchmark.
// Run from any cwd with Node. Source guards fail if the audited WGSL changes.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const root = new URL('../../../../', import.meta.url);
const sources = Object.fromEntries([
  'src/assets/mandelbrot_brush.wgsl', 'src/assets/resolve.wgsl', 'src/assets/color.wgsl', 'src/assets/merge_frozen.wgsl',
].map(path => [path, readFileSync(new URL(path, root), 'utf8')]));
function body(path, name) {
  const text = sources[path];
  const start = text.indexOf(`fn ${name}(`);
  assert(start >= 0, `Missing ${name}; re-audit the source`);
  const open = text.indexOf('{', start);
  let depth = 1, end = open + 1;
  for (; end < text.length && depth; end++) {
    if (text[end] === '{') depth++;
    if (text[end] === '}') depth--;
  }
  assert.equal(depth, 0);
  return text.slice(open + 1, end - 1);
}
const geometry = body('src/assets/mandelbrot_brush.wgsl', 'analytic_terminal_geometry');
const normalization = body('src/assets/color.wgsl', 'normalize_geometry');
assert.match(geometry, /return vec3<f32>\(gradient, laplacian\)/);
assert.match(geometry, /exp\(clamp\(laplacianLog, -80\.0, 80\.0\)\)/);
assert.match(normalization, /stored\.xy \* ratio/);
assert.match(normalization, /stored\.z \* ratio \* ratio/);
assert.match(normalization, /vec2<f32>\(-64\.0\), vec2<f32>\(64\.0\)/);
for (const name of ['resolve', 'merge_frozen']) {
  assert.match(sources[`src/assets/${name}.wgsl`], /const DISPLAY_STORAGE_MAX: f32 = 65504\.0/);
  assert(!sources[`src/assets/${name}.wgsl`].includes('64.0'));
}
assert.match(body('src/assets/resolve.wgsl', 'load_terminal_geometry'), /-DISPLAY_STORAGE_MAX, DISPLAY_STORAGE_MAX/);

// All values in these witnesses are exactly representable in f16 and f32.
// The failure precedes quantization and exists even with infinite precision.
const clamp = x => Math.max(-64, Math.min(64, x));
const witnesses = [
  { field: 'gradient', input: [128, 256], ratio: 1 / 16, exponent: 1 },
  { field: 'curvature', input: [256, 1024], ratio: 1 / 16, exponent: 2 },
].map(({ field, input, ratio, exponent }) => {
  const stored = input.map(x => Math.max(-65504, Math.min(65504, x)));
  const replayed = stored.map(x => clamp(x * ratio ** exponent));
  const required = input.map(x => clamp(x * ratio ** exponent));
  assert.notEqual(stored[0], stored[1], 'Source values must remain distinguishable');
  assert.notEqual(required[0], required[1], 'The desired outputs must differ');
  assert.deepEqual(replayed, required);
  return { field, input, ratio, stored, replayed, required };
});
console.log(JSON.stringify({
  audit: 'PASS: delayed visual clamp preserves both regression witnesses',
  proposed48ByteFormatFidelityGate: 'NOT PROVEN: bounded float16 experiment, GPU fidelity pending',
  sourceSha256: Object.fromEntries(Object.entries(sources).map(([path, source]) =>
    [path, createHash('sha256').update(source).digest('hex')])),
  witnesses,
  limits: 'Algebraic counterexample at the representation boundary; does not measure how often these values occur in actual Mandelbrot frames, visible error, or GPU performance.',
}, null, 2));
