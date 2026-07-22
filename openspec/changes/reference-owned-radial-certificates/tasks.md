## 1. Baseline and mathematical contract

- [x] 1.1 Remove or revert the incomplete adjacent-rung-bank Rust scaffolding while preserving the current reference-domain/current-`cmax` instrumentation and all unrelated worktree changes.
- [x] 1.2 Trace and record the current Affine, Padé, Möbius-c+, and Jet value/first-derivative/second-derivative contracts used by Rust and WGSL referees.
- [x] 1.3 Choose the immutable reference-domain headroom from the existing reference/rebase lifecycle, encode it as one named policy, and add boundary tests proving the domain never shrinks during an epoch.
- [x] 1.4 Define correctness gates for the radial rollout: directed-boundary acceptance, exact-replay value/derivative tolerances, non-finite rejection, and zero viewport-only block rebuilds.

## 2. Radial proof mathematics

- [x] 2.1 Implement build-side normalized radial value-tail and derivative-tail bounds with `thetaMax <= 1/2`, including conservative directed rounding at serialization boundaries.
- [x] 2.2 Implement pure-`delta-c` handling so a nonzero residual at `delta-z = 0` cannot pass through a collapsed relative-error budget.
- [x] 2.3 Implement plain-Padé and Möbius-c+ denominator/pole constraints in the radial solver, with degenerate rational forms producing dead certificates.
- [x] 2.4 Add property and boundary tests comparing radial value/derivative bounds with exact block replay for Affine, Padé, Möbius-c+, and Jet fixtures.
- [x] 2.5 Add explicit tests showing that a certificate constructed for the maximal reference domain remains sound for nested smaller `delta-c` domains.

## 3. Tier records and candidate selection

- [x] 3.1 Carry the Affine `alpha/beta` seed and binary-merge certificate alongside Unified block construction without making it viewport-keyed.
- [x] 3.2 Define a compact versioned radial GPU record containing the Affine fields and one radial `(maxLog2Dz, maxLog2Dc)` candidate for each required tier, plus rational safety metadata only where needed.
- [x] 3.3 Select the candidate with the largest finite `delta-z` cap among sources whose final `delta-c` cap covers the immutable reference domain; emit a dead tier when none qualifies.
- [x] 3.4 Implement a CPU evaluator for the serialized record and test exact parity with the uncompressed derivation at inside, equality, next-below, next-above, zero, infinity, and NaN inputs.
- [x] 3.5 Keep the optional second nested candidate absent from layout v1 and add a format-level test preventing viewport-rung or bank identifiers from entering the record.

## 4. Incremental Rust/WASM lifecycle

- [x] 4.1 Make the incremental Unified epoch own its immutable reference domain and reset it only for a new reference or explicit certificate-key change, never for viewport-only motion or lower `maxIter`.
- [x] 4.2 Extend the binary-carry builder so bounded certificate units process only newly completed, uncertified block suffixes and never revisit a committed prefix.
- [x] 4.3 Replace the packed-envelope incremental output with a versioned radial range payload carrying matched coefficients/certificates, domain, stride, coverage, and build-cause counters.
- [x] 4.4 Preserve independently versioned SA/periodic/gate header generation without allowing it to invalidate or republish block-indexed radial records.
- [x] 4.5 Add Rust regression tests for random orbit chunking, reference growth, `maxIter` growth/shrink, zoom, translation, epsilon changes, cancellation epochs, and zero coefficient recomposition on certificate-only work.

## 5. Worker scheduling and transport

- [x] 5.1 Update `referenceWorker.ts` contracts to validate radial version/stride/counts and transfer matched append-only ranges under `jobId`, `refId`, and `tableGeneration` guards.
- [x] 5.2 Schedule bounded radial certificate work immediately after matching reference/block growth and yield to worker events after every cooperative unit.
- [x] 5.3 Ensure `updateView` refreshes only current-domain instrumentation and optional headers for the same reference; it MUST NOT queue block-indexed certificate work.
- [x] 5.4 Drop stale or cancelled radial units before copying or posting WASM memory and expose separate reference-growth and viewport-only build counters.
- [x] 5.5 Add focused worker tests covering range integrity, stale generation/refId rejection, header independence, and zero viewport-only rebuilds.

## 6. Engine and WGSL runtime

- [x] 6.1 Add versioned radial GPU buffer allocation and growth while preserving queue-ordered coefficient/certificate writes and atomic directory commits.
- [x] 6.2 Implement WGSL Affine `alpha - beta * |delta-c|` evaluation and radial cap evaluation with conservative handling of dead, zero, infinite, and NaN states.
- [x] 6.3 Implement Padé/Möbius pole guards and retain cheapest-first Auto tier selection followed by exact perturbation when all candidates reject.
- [x] 6.4 Keep optional header uploads independent from the radial block buffer and verify navigation never replaces certificate bind groups solely because `cmax` changed.
- [x] 6.5 Retain the previous packed-validity path behind an explicit rollback switch until radial CPU/GPU parity and navigation acceptance gates pass.
- [x] 6.6 Add or update shader parity fixtures for fresh pixels, continuation, rebase, domain boundary, out-of-domain fallback, rational pole rejection, and all four tiers.

## 7. Observability and performance panel

- [x] 7.1 Expose radial layout version, immutable reference domain, current viewport `cmax`, committed coverage, and last certificate build cause through Engine statistics.
- [x] 7.2 Add diagnostic-only counters for Affine acceptance, radial-cap rejection, pole rejection, out-of-domain rejection, and exact fallback without adding their atomics to ordinary pipeline variants.
- [x] 7.3 Display reference-growth certificate counts and the viewport-only rebuild regression counter in `PerformancePanel.vue`, highlighting any nonzero viewport-only value.
- [x] 7.4 Update focused component/unit assertions for the new labels, counter mapping, and in-domain/out-of-domain presentation.

## 8. Validation and rollout evidence

- [x] 8.1 Run Rust formatting and focused/full non-ignored Rust tests for radial derivation, serialization, incremental construction, and navigator cache stability.
- [x] 8.2 Validate the modified WGSL with Naga and run TypeScript/Vue typechecking plus the configured non-Playwright unit suite.
- [x] 8.3 Record build time, bytes per block, transferred bytes, accepted-tier distribution, realized skip, exact fallback, and viewport-only rebuild count on representative shallow/deep fixtures using focused non-Playwright tooling.
- [x] 8.4 Compare radial output with exact perturbation on deterministic fixtures and document any pessimistic skip loss separately from correctness failures.
- [x] 8.5 Decide from recorded evidence whether layout v1 remains single-candidate; do not add a second static candidate without updating the design/spec/version and obtaining a measured justification.
- [x] 8.6 Keep Playwright/browser validation opt-in; run none in this apply session and retain the rollback switch until a future explicitly approved validation is accepted.

## 9. Intrinsic two-candidate radial-v3 amendment

- [x] 9.1 Replace the epoch-wide `referenceLog2Dc` dependency with block-local intrinsic Cauchy sources, including a full-Mandelbrot `Rc=4` rung and coefficient-balanced local rungs.
- [x] 9.2 Version the active record as radial-v3 with two `(maxLog2Dz, maxLog2Dc, poleMaxLog2Dz)` candidates for Padé, Möbius-c+, and Jet while retaining dynamic Affine alpha/beta.
- [x] 9.3 Reduce sound source rectangles to the widest-dc and widest-effective-dz Pareto endpoints and add layout, dominance, boundary, exact-replay, and chunk-partition tests.
- [x] 9.4 Update WASM transport, Engine allocation, WGSL evaluation, and sidecar prefiltering to the 21-word cmax-independent layout.
- [x] 9.5 Replace the global-domain warning in the Performance panel with explicit intrinsic-per-block status and honest prefilter/intrinsic-cap rejection labels.
- [x] 9.6 Run Rust formatting/tests, Naga validation, TypeScript/Vue checks, and the non-Playwright unit suite; rebuild the local WASM package after all source checks pass.
