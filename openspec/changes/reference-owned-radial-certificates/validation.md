# Validation evidence

## Static and deterministic correctness

- Rust radial boundary/evaluator tests cover equality, adjacent f32 values,
  zero, infinities, NaN, pure-c collapse, dead rational forms, nested domains,
  and all four approximation tiers.
- Exact block replay on a 512-step seahorse reference verifies value and first
  derivative error against the configured epsilon for Affine, Padé, Möbius-c+,
  and Jet.
- Shared fresh, continuation, rebase, shallow, deep, out-of-domain, and
  rational-pole fixtures exercise the same record decisions used by WGSL.
- Naga accepts `mandelbrot_brush.wgsl`; Vue/TypeScript typechecking and the
  non-Playwright unit suite pass.

## Native release census

Command:

```text
cargo test --release --manifest-path reference_calculus/Cargo.toml \
  radial_validity_census -- --ignored --nocapture
```

Each fixture contains 1,024 reference iterations and 511 emitted records. The
record is 48 bytes/block; the matched coefficient + sidecar + certificate
transfer is 87,892 bytes per fixture.

| Fixture | Coefficients | Certificates | Affine / Padé / c+ / Jet | Mean skip | Exact fallback | Viewport rebuilds |
|---|---:|---:|---:|---:|---:|---:|
| shallow | 13.89 ms | 61.74 ms | 4 / 0 / 0 / 1 | 204.80 | 0 | 0 |
| seahorse | 18.27 ms | 76.31 ms | 5 / 2 / 1 / 0 | 127.50 | 4 | 0 |
| feigenbaum | 11.30 ms | 78.83 ms | 1 / 0 / 0 / 0 | 1024.00 | 0 | 0 |

Combined accepted tiers were `10 / 2 / 1 / 1`, mean applied skip was 219.14,
and exact fallback was four steps. These are native CPU referee figures, not
GPU frame timings; they demonstrate conservative coverage and expose skip loss
without claiming browser performance.

## Radial-v3 amendment

The 48-byte single-candidate layout above is retained only as historical v2
evidence. User-observed skip loss and false global-domain exhaustion justified
layout v3: 84 bytes/block with two intrinsic Pareto endpoints per non-affine
tier and no viewport-wide `referenceLog2Dc`. New validation must report v3
figures separately; the v2 timings and accepted-tier counts above must not be
presented as v3 performance evidence.

Packed-v1 remains available by disabling incremental radial certificates.

### Radial-v3 static validation (2026-07-22)

- Active layout: version 3, 21 words / 84 bytes per block.
- Rust: 174 passed, 0 failed, 32 ignored.
- Frontend unit suite: 94 passed across 22 files.
- `npx vue-tsc -b`: passed.
- `naga src/assets/mandelbrot_brush.wgsl`: passed.
- `wasm-pack build --dev reference_calculus`: passed and refreshed the local
  `reference_calculus/pkg` consumed by the app.
- No Playwright/browser benchmark was run in this apply session. The rollback
  path remains available until the user explicitly requests live validation.

## Browser/WebGPU validation after explicit approval

The user approved Playwright/WebGPU validation on 2026-07-22. The focused
suite was run with:

```text
npx playwright test tests/dynamic-validity.spec.ts
```

Four scenarios passed:

- packed one-shot Auto activation;
- cmax-only optional-header refresh without a table rebuild;
- incremental radial prefix publication and generation churn;
- incremental GPU capacity growth while preserving committed ranges.

The legacy-output shadow scenario failed because the post-convergence
diagnostic restart produced no dynamic attempts. A focused reproduction found
that `clearHistoryNextFrame = true` did advance the timing/session serials and
dispatch frames, but the replacement work session converged with
`realMean = 0`, `unfinishedPixelCount = 0`, and all work/dynamic counters at
zero. Re-running the shadow scenario reproduced the same failure.

The full matrix was then invoked with:

```text
npm run benchmark:dynamic-validity
```

It stopped on the first `legacy-exact` variant because `collectWorkMix` relies
on that same synthetic history restart and could not observe nonzero work in
15 seconds. Consequently no radial-versus-legacy GPU timing ratios were
recorded; manufacturing ratios from the zero-work sessions would be invalid.

The four passing scenarios validate the radial transport/lifecycle invariants,
including zero cmax-only reconstruction. Browser performance acceptance is
still blocked on repairing or replacing the post-convergence diagnostic
restart. Keep packed-v1 rollback available until that comparison succeeds.
