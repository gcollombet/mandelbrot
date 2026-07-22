## 1. Baselines and proof-format budget

- [x] 1.1 Extend the native unified cold-build benchmark to persist coefficient, bounds, radii, SA, replay, serialization, block-count, and bytes-per-block baselines for the standard orbit set.
- [x] 1.2 Add equivalent worker-visible WASM phase timings and expose them through the existing table-build statistics without changing runtime behavior.
- [x] 1.3 Add a navigation benchmark that records cmax-only rebuild counts, iteration-pass p50/p95, frame p50/p95, realized skipped iterations, and exact fallback for legacy Auto.
- [x] 1.4 Define and document the initial f32 `ValidityEnvelope` byte budget and the acceptance gates for metadata growth, static-scene GPU regression, and navigation p95.

## 2. CPU certified validity envelopes

- [x] 2.1 Add Rust types for per-tier validity lines, pure-c thresholds, static `dc` ceilings, Cauchy candidates, dead sentinels, and combined value/derivative envelopes.
- [x] 2.2 Derive conservative log-domain value-radius lines from the existing affine and Jet remainder moduli with explicit per-term error-budget allocation.
- [x] 2.3 Derive conservative derivative-radius lines and intersect them with the value envelope for every tier.
- [x] 2.4 Derive dynamic pure-c rejection thresholds and Padé/Möbius denominator-margin constraints from the shipped evaluator coefficients.
- [x] 2.5 Convert existing Cauchy majorant candidates into at most two independently sound static-domain rungs with bounded-tail line constraints.
- [x] 2.6 Prune dominated lines/candidates while proving that the pruned envelope never increases the certified radius.
- [x] 2.7 Implement directed f64-to-f32 serialization, dead-sentinel handling, a CPU decoder matching the future WGSL layout, and serialized bytes-per-block accounting.
- [x] 2.8 Add serialization audits proving every decoded constraint is equal or stricter than its f64 source.
- [x] 2.9 Add logarithmic `dc`/boundary-`dz` soundness sweeps against exact value and derivative stepping for all four tiers and benchmark orbit classes.
- [x] 2.10 Add a census comparing dynamic radii, realized skips, candidate usage, and rejection reasons with the current cmax-solved radii; record whether one or two Cauchy rungs pass the rollout gates.

## 3. CPU dynamic dispatch referee

- [x] 3.1 Implement shallow and floatexp-compatible CPU evaluators for the serialized validity envelope using the same operation order planned for WGSL.
- [x] 3.2 Implement a CPU Auto referee that scans the largest aligned skip first and selects the cheapest dynamically valid affine, Padé, Möbius c+, or Jet tier at that skip.
- [x] 3.3 Verify the CPU dynamic dispatcher across exact-step tails, Zhuoran rebases, partial table prefixes, escape results, derivative propagation, and second-derivative state.
- [x] 3.4 Add failure diagnostics that identify value, derivative, pure-c, static-domain, Cauchy-tail, and pole rejection independently.
- [x] 3.5 Freeze the initial envelope layout and tier-cost order only after the CPU soundness, compactness, and realized-skip gates pass.

## 4. Dynamic envelope transport and GPU evaluation

- [x] 4.1 Add WASM buffer-info exports for serialized validity envelopes and level metadata while preserving the legacy unified sidecar path behind a debug flag.
- [x] 4.2 Extend reference-worker full-table messages with versioned envelope payloads and certified reference-domain metadata.
- [x] 4.3 Allocate and bind the validity-envelope GPU buffer in `Engine.ts`, audit its table kind/generation, and keep blocks disabled until coefficients and envelopes match.
- [x] 4.4 Implement WGSL envelope decoding and log-magnitude evaluation for shallow `f32` perturbations.
- [x] 4.5 Implement the equivalent WGSL evaluation for deep floatexp `dc` and `dz` without materializing subnormal values.
- [x] 4.6 Implement dynamic pure-c, value, derivative, static-domain, Cauchy-rung, and rational-pole guards with exact fallback on every failure.
- [x] 4.7 Replace principal/secours application under the debug flag with largest-skip-first, cheapest-valid-tier selection and coefficient-prefix loading after tier choice.
- [x] 4.8 Add GPU counters for per-tier attempts/accepts, skip distribution, candidate-rung use, rejection reasons, and exact fallback; surface them in RenderStats.
- [x] 4.9 Add Rust/GPU parity fixtures and Playwright coverage for shallow, deep, quasi-critical, parabolic, continuation, rebase, and out-of-domain cases.

## 5. Decouple optional Auto headers

- [x] 5.1 Split SA, periodic, and gate header serialization/versioning from block coefficient and validity-envelope buffers.
- [x] 5.2 Give each optional header an explicit certified `dc` ceiling and disable only that header when stale or out of domain.
- [x] 5.3 Update worker and Engine message handling so optional-header refreshes never clear, invalidate, or rebuild the dynamic block table.
- [x] 5.4 Add a navigation regression test proving cmax-only motion inside the reference domain schedules zero coefficient, block-bound, or block-envelope rebuilds even when optional headers refresh or disable.

## 6. Incremental Rust dyadic builder

- [x] 6.1 Add persistent incremental builder state with one pending binary-carry block per level and append-only completed-block vectors.
- [x] 6.2 Add an API that consumes an orbit slice, creates new skip-1 seeds, performs only newly enabled merges, and reports completed slot ranges by level.
- [x] 6.3 Preserve skip-1/skip-2 build-only levels while emitting GPU-visible blocks only at the configured minimum skip.
- [x] 6.4 Compile coefficients, proof moduli, and validity envelopes for each newly completed emitted block without revisiting prior blocks.
- [x] 6.5 Add random-chunk-partition tests proving incremental/one-shot level geometry, coefficient parity, conservative envelope parity, and absence of duplicate or missing slots.
- [x] 6.6 Add incremental build benchmarks reporting cumulative merges, coefficient time, envelope time, peak memory, and comparison with the one-shot builder.

## 7. Cooperative worker publication

- [x] 7.1 Define incremental worker messages carrying refId, jobId, generation, level, slot start/count, covered orbit length, coefficients, envelopes, and directory deltas.
- [x] 7.2 Refactor the worker loop to prioritize visible orbit chunks, then active table ranges, then headroom, then optional headers/diagnostics.
- [x] 7.3 Bound incremental merge/envelope work by a configurable cooperative quota and yield to queued worker events between units.
- [x] 7.4 Check job, reference, and table generation before and after every cooperative unit and before transfer; count and discard stale work.
- [x] 7.5 Add worker protocol tests for rapid maxIter changes, mode changes, reference replacement, stale cancellation, and visible-orbit priority.

## 8. Append-only GPU storage and partial activation

- [x] 8.1 Implement power-of-two table capacity planning with deterministic level-contiguous coefficient/envelope ranges and per-level committed counts.
- [x] 8.2 Upload incremental coefficient and envelope ranges into their reserved offsets and commit directory counts only after both writes are queued.
- [x] 8.3 Permit Jet, Möbius, and Auto dispatch on the committed table prefix while enforcing the published covered-orbit limit and exact tail fallback.
- [x] 8.4 Implement capacity doubling with replacement buffers, GPU-to-GPU copies of committed ranges, pending-range application, and atomic bind-group/directory swap.
- [x] 8.5 Integrate partial tables with active/staging reference promotion so a newer generation cannot mix ranges from different references.
- [x] 8.6 Add Engine diagnostics for orbit coverage, table coverage, per-level appended blocks, transferred bytes, yields, cancellations, and capacity growth.
- [x] 8.7 Add tests proving table arrival/growth never clears valid render history, produces a blank frame, or exposes partially copied offsets.

## 9. Rollout, performance gates, and cleanup

- [x] 9.1 Add independent `dynamicBlockValidity` and `incrementalReferenceTable` debug flags plus a shadow mode that records dynamic decisions while legacy tags still apply blocks.
- [x] 9.2 Run Rust formatting, focused soundness/parity tests, the full Rust test suite, TypeScript typecheck, Vite build, and VitePress build; resolve all new failures.
- [x] 9.3 Run the navigation and static benchmark matrix on legacy exact, legacy Auto, dynamic-only Auto, and dynamic+incremental Auto; record CPU stages, GPU iteration time, frame p95, memory, tier mix, and realized skip.
- [x] 9.4 If the f32 envelope exceeds the metadata or GPU bandwidth gate, prototype conservative packed storage and retain it only if serialization proof and field performance both pass.
- [x] 9.5 Keep the logarithmic multi-sidecar bucket design as a measured fallback only if compact dynamic envelopes fail the realized-skip gate.
- [x] 9.6 Make dynamic+incremental Auto the default only after zero correctness regressions, zero cmax-only block rebuilds, bounded memory, and non-regressing navigation iteration-pass p95 are demonstrated.
- [x] 9.7 Update the approximation-table documentation and interactive canvas to explain per-pixel validity, dynamic tier choice, partial table coverage, and the remaining exact fallback.
- [x] 9.8 Remove obsolete replay-tag/principal-secours production plumbing only after the rollback window closes; retain targeted legacy debug/reference code required by regression tests.
- [x] 9.9 Make dynamic one-shot and incremental table domains reference-owned: preserve coverage on maxIter decreases, retain blocks outside the certified dc ceiling with exact fallback, and report only Rust stages that actually executed.
- [x] 9.10 Feed the incremental builder directly from newly available orbit records, size cooperative quotas to one production orbit chunk, extend matching table headroom with the reference, and prevent duplicate WASM instances in Vite development.
- [x] 9.11 Optimize the dynamic GPU hot path by caching invariant log magnitudes, publishing sound max-candidate level gates for one-shot and incremental tables, and restoring the level hint without changing exact fallback.
