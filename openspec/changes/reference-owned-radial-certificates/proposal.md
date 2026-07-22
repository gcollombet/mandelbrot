## Why

Dynamic Unified certificates are currently anchored to a viewport-derived `cmax`, so navigation can either retain a valid but increasingly pessimistic table or trigger expensive bound/certificate work unrelated to changes in the reference orbit. A reference-owned, deliberately conservative certificate model can remove that lifecycle cost and make zoom/translation performance deterministic while preserving exact fallback.

## What Changes

- Replace viewport-keyed block-certificate reconstruction with intrinsic per-block certificates whose lifetime belongs to the reference and whose caps do not contain a viewport-wide `cmax` domain.
- Keep the existing reference-owned coefficients, dyadic geometry, and residual moduli; navigation MUST NOT recompose them or rebuild block-indexed bounds/certificates while the reference and certificate epoch remain unchanged.
- Use the existing affine `alpha - beta * |delta-c|` condition as the affine tier's reference-owned certificate.
- Audit the legacy Padé value/derivative guarantees and either adopt a reference-owned specialized Padé certificate or keep Padé behind the conservative radial proof until parity is established.
- Certify Möbius-c+ and Jet with a compact radial Cauchy condition based on `theta = max(|delta-z| / Rz, |delta-c| / Rc)`, including value, derivative, pure-`delta-c`, and rational pole safety.
- Publish two Pareto endpoints per non-affine block/tier: the intrinsic rectangle with the widest `delta-c` cap and the one with the widest effective `delta-z` cap. They are constructed once and selected per pixel, never rebuilt at octave crossings.
- Append certificates only for newly available reference blocks when the reference orbit grows; publish coefficient/certificate pairs monotonically and fall back to exact perturbation outside all certified domains.
- Add rendering statistics that distinguish intrinsic-cap/pole rejection and exact fallback, explicitly state cmax independence, and separate certificate construction caused by new reference coverage from forbidden viewport-only rebuilds.
- Remove or supersede the partially introduced adjacent-rung-bank scaffolding so there is one coherent reference-owned lifecycle.

## Capabilities

### New Capabilities

- `reference-owned-block-certificates`: Reference-lifetime construction, radial validity evaluation, conservative fallback, incremental publication, and observability for Unified approximation certificates.

### Modified Capabilities

- `progressive-render-pipeline`: Progressive Auto rendering must retain and reuse its certified block table across viewport-only zoom and translation, without exposing partially matched coefficient/certificate data.
- `performance-settings`: Rendering statistics must expose intrinsic certificate state and detect viewport-only certificate rebuild regressions.

## Impact

- Rust/WASM numerical code in `reference_calculus/src/unified.rs`, `validity.rs`, `mobius.rs`, and navigator buffer contracts in `reference_calculus/src/lib.rs`.
- Worker scheduling and transferable payloads in `src/referenceWorker.ts`.
- WebGPU storage layouts, bind groups, runtime tier selection, and instrumentation in `src/Engine.ts` and `src/assets/mandelbrot_brush.wgsl`.
- Rendering-stat presentation in `src/components/PerformancePanel.vue`.
- Existing dynamic-validity parity fixtures, Rust proof tests, WGSL validation, TypeScript typechecking, and focused unit tests. Browser/Playwright validation remains explicitly opt-in.
