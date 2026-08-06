## Context

The unified table currently composes one orbit-keyed coefficient tree, walks `c_max`-keyed majorants, solves one effective radius per tier for the viewport-wide `c_max`, and serializes a principal/secours tag chosen from a replay-derived working band. This is sound and cheap to probe on the GPU, but a changing `c_max` invalidates expensive stages and every pixel receives a radius derived from the worst displacement in the view.

The existing native release benchmark at 32,768 iterations measures approximately 296–419 ms for coefficient construction, 487–565 ms for bounds, and 573–697 ms for radii. The latter includes four value/derivative tier solves and is followed in the production path by SA, periodic, gate, replay, and serialization work. Browser WASM timings are higher and the worker's synchronous phases can leave Auto rendering exact until a table lands.

The exact perturbation recurrence and Zhuoran rebase remain the correctness baseline. The new path must support shallow `f32` and deep floatexp shader states, preserve derivative/second-derivative propagation, avoid unbounded sidecar growth, and remain generation-safe while references are replaced.

## Goals / Non-Goals

**Goals:**

- Make block validity depend on the pixel's actual `|dc|` and current `|dz|`, not a viewport-wide `c_max` radius.
- Keep coefficient and proof-envelope data stable while the view moves inside a certified reference-domain ceiling.
- Select the cheapest valid tier at the largest aligned skip using a small, bounded GPU evaluation.
- Construct the dyadic tree incrementally from orbit chunks without recomputing completed blocks.
- Publish partial tables safely so a prefix accelerates rendering while the orbit and higher levels continue to grow.
- Preserve value and derivative certification and provide measurable CPU/GPU correctness and performance gates.

**Non-Goals:**

- Removing arbitrary precision from reference-orbit calculation.
- Replacing the exact perturbation fallback or changing escape/interior semantics.
- Building sliding blocks at every possible start index; blocks remain aligned at `1 + slot * skip`.
- Requiring WebGPU shader-f16, WASM threads, or a new external dependency.
- Making SA, periodic certificates, or parabolic gates dynamically depend on per-pixel `dc` in the first implementation. They are decoupled from block validity so they cannot force a block-table rebuild.
- Removing legacy single-mode/debug evaluators before the new path passes field gates.

## Decisions

### 1. Compile a certified log-domain validity envelope

Rust will compile each block and tier into a small immutable `ValidityEnvelope`. For every represented remainder term with `i > 0`, a budgeted inequality

`|q_ij| * r^i * c^j <= epsilon_ij`

becomes

`log2(r) <= A_ij - (j / i) * log2(c)`.

Value, derivative, rational-pole, and static-domain constraints are combined conservatively. The runtime radius is the lower envelope of these lines. Slopes come from a small global set; block records store only intercepts and gates. Terms with `i = 0` become separate pure-`c` rejection thresholds.

This representation is selected over a fitted quadratic because every serialized line is directly traceable to a proof inequality. A numerical fit would require an additional global proof that it never overestimates the certified radius. It is selected over evaluating the complete remainder polynomial because it needs only multiply-add/min operations and a small fixed record.

The first implementation uses `f32` envelope values with conservative outward rounding. Packed f16 remains unnecessary: the frozen packed-v1 layout meets the byte gate using only portable `f32` words.

### 2. Keep Cauchy majorants static through certified domain rungs

The omitted high-degree tail still requires a Cauchy majorant on a static polydisc `(R_z, R_c)`. Rust will select at most two useful candidate rungs per block from the existing candidate ladder. Each rung contributes:

- a hard `c <= theta_max * R_c` gate;
- a hard `r <= theta_max * R_z` gate;
- conservative line constraints for `M * theta^(D+1) / (1 - theta)` using a fixed `theta_max` interval.

For example, a rung restricted to `theta <= 1/2` may replace `1 / (1 - theta)` with the safe constant 2. A second rung may cover a wider interval with a different safe constant. For a pixel, the shader computes the valid radius of each live rung and takes the maximum; taking the maximum is sound because each candidate independently certifies its returned radius.

The static `R_c` ceiling is tied to the lifetime/recentering domain of the reference, not the instantaneous viewport. If `|dc|` exceeds every certified rung, blocks reject and exact perturbation continues until a replacement reference is available.

This is selected over rebuilding bounds for logarithmic `c_max` buckets because it removes motion from the block-table cache key. A multi-bucket sidecar remains a fallback experiment if the compact envelope loses too much realized skip.

### 3. Dynamically select the tier after selecting the skip

The shader continues to scan aligned levels from largest skip to smallest. At one candidate block it loads validity metadata first, evaluates tiers in increasing expected application cost (affine, Padé, Möbius c+, Jet), and selects the cheapest tier whose dynamic value/derivative/domain/pole certificate passes. Only then does it load the selected coefficient prefix.

Choosing within a fixed skip ensures that a cheap tier at a smaller level never preempts a richer tier that can take a much larger jump. Legacy principal/secours tags and replay-band selection remain behind a debug flag during migration but are not part of the final dynamic path.

The validity evaluator uses `log2(|dc|)` and `log2(|dz|)`. The shallow path derives these from ordinary vectors; the deep path combines the floatexp mantissa magnitude with its exponent, so subnormal `dc` values never have to be materialized as plain `f32`.

The GPU hot path caches `log2(|dc|)` once per pixel and computes the conservative `log2(|dz|)` once per block-probe turn. Each validity level directory stores the maximum serialized candidate radius of its committed blocks. Because every effective tier radius is intersected with its candidate radius, this maximum is a sound whole-level upper bound: a failing comparison can skip all block/envelope reads at that level. The existing level hint also applies to dynamic dispatch; it may shorten a skip but cannot suppress acceleration entirely because a valid larger aligned block implies a valid aligned prefix at the capped level.

### 4. Separate block certificates from optional Auto headers

The block coefficient buffer and validity-envelope buffer are versioned together by `(refId, tableGeneration, epsilon, coveredOrbitLen)`. SA, periodic, and gate headers receive their own version and certified `dc` ceiling. A stale or out-of-domain optional header is disabled without invalidating block coefficients or envelopes.

This prevents a `c_max`-dependent optional accelerator from reintroducing the table rebuilds removed by this change. Header-specific bucket caching can be added independently.

The implemented v1 payload has a fixed 11-vec4 prefix followed by the variable gate blob. `h0.w` carries SA `n0`; `h1.w`, `h8.w`, and `h3.w` carry the independently certified SA, periodic, and gate `log2|dc|` ceilings; `h2.w` carries wire version 1. The worker publishes the payload with its own monotonic revision. A full table uploads the block-indexed rollback sidecar first and the header at `blockCount`; a later `headersReady` message overwrites only that tail. Rust reports this work as stage bit 16, and dynamic cmax-only motion inside the reference domain is required to report exactly that bit, with no coefficient, bounds, legacy-radius, or validity-envelope phase.

### 5. Build aligned dyadic blocks with a binary-carry accumulator

The Rust builder retains one pending block per level. Each new reference step creates a skip-1 seed. Two adjacent complete blocks of the same skip compose into one parent, recursively like a binary carry. Every completed aligned block is appended once to its level; skip-1 and skip-2 entries may remain build-only while still feeding emitted levels.

For `N` available steps, a level of skip `S` contains exactly `floor(N / S)` aligned blocks starting at `1 + slot * S`. The total retained block count remains `O(N)`, not the `O(N log N)` cost of sliding blocks.

The incremental and one-shot builders must serialize byte-equivalent coefficients and conservatively equivalent envelopes for every complete slot. The one-shot path remains as a test referee until parity is established.

### 6. Reserve level ranges and publish append-only updates

One coefficient buffer and one envelope buffer retain level-contiguous lookup. The Engine allocates ranges for a power-of-two `capacityIterations`; level offsets are derived from that capacity. Incremental messages carry `(level, slotStart, slotCount, coveredOrbitLen)` plus matching coefficient and envelope payloads.

When the target outgrows capacity, the Engine doubles capacity, creates replacement buffers, copies existing level ranges GPU-to-GPU, applies pending appends, and atomically swaps the bind group/directory. Until the swap is complete the old table remains active. Directory counts are updated only after both payloads for a range have been written.

This is selected over one GPU buffer per level because WebGPU binding count and bind-group churn would grow with `log2(maxIter)`. It is selected over repacking the whole table after every chunk because repacking defeats incremental construction.

### 7. Prioritize orbit availability over background optimization

The reference worker scheduler uses this priority order:

1. produce the next orbit chunk required by the visible `maxIter`;
2. compile/publish newly usable blocks and the active envelope version;
3. extend headroom orbit/table data;
4. refresh optional Auto headers or run diagnostics.

Table work is cooperatively bounded by a block/merge quota and yields to queued worker messages. Every unit checks `jobId`, `refId`, and `tableGeneration`; stale work is discarded before transfer.

### 8. Gate rollout with correctness, compactness, and field performance

Rust tests will evaluate the dynamic certificate over a logarithmic `c` grid and sampled `r` values against exact stepping for value and derivative. They will also compare realized dynamic radii with the existing solver to report conservatism, not to define correctness.

GPU tests will compare legacy exact, legacy Unified, and dynamic Unified output, including deep floatexp views, rebases, continuations, and derivative shading. Instrumentation will report tier attempts/accepts, skip distribution, certificate rejection reasons, exact fallback, bytes per block, incremental build time, and GPU iteration-pass time.

Default Auto switches only after the benchmark views show no correctness regression, no cmax-only block rebuilds, bounded memory growth, and navigation iteration-pass p95 no worse than legacy Auto. Static-scene GPU time and realized skipped iterations are reported separately so CPU-stall removal cannot hide a shader regression.

The initial f32 proof format is capped at **96 bytes (24 f32 words) per emitted block**. The natural referee required 144 bytes for two Cauchy rungs and 112 bytes after pruning to one rung, so both natural layouts failed the compactness gate. The census selected one rung: it realized 17,616 skipped iterations, while the second rung added only 48 (+0.27%). Packed v1 is exactly equivalent to that one-rung decoder and stores six `f32` words per tier in fixed order: four line intercepts for global slopes `[0, -0.5, -1, -2]`, then `min(staticDomain, candidateDomain)`, then the candidate radius. Tier order is frozen as affine, Padé, Möbius c+, Jet. Intersecting the two domain ceilings removes a redundant word without changing any decision. Directed f64-to-f32 serialization plus a post-operation `nextDown` remains mandatory.

Packed v1 is therefore exactly **96 envelope bytes** and **204 combined coefficient-plus-envelope bytes** per block. Its serialization audit has zero violations on the benchmark orbit set, and its decoded radii are bit-identical to the measured natural one-rung format. The natural two-rung representation remains a CPU referee only. GPU timing and navigation gates are still required before enabling the path by default.

Debug observability uses a separate, non-certifying **8-byte provenance stream per block**. Two-bit fields retain the source of each intersected domain ceiling and line bucket, allowing the GPU to attribute rejection to value, derivative, pure-c, static/reference domain, Cauchy, or rational-pole constraints. The stream is appended after the packed-v1 records in the same multiplexed storage buffer, is ignored by the acceptance decision, and is excluded from the frozen 96-byte production-format gate.

Performance acceptance uses the same device, resolution, view, iteration budget, warm table, timestamp-query availability, and at least 30 measured iteration frames per variant. Percentiles use the nearest-rank definition used by the navigation benchmark. The initial gates are:

| Gate | Acceptance threshold |
|---|---|
| Serialized metadata | envelope ≤ 96 B/block and coefficients + envelope ≤ 204 B/block |
| Static-scene GPU regression | dynamic Auto iteration-pass p50 and p95 ≤ 1.10 × legacy Auto; GPU frame-span p95 ≤ 1.10 × legacy Auto |
| Navigation p95 | dynamic Auto iteration-pass p95 ≤ 1.00 × legacy Auto and frame p95 ≤ 1.00 × legacy Auto |
| Navigation invalidation | zero coefficient, bounds, or envelope rebuilds caused solely by `c_max` inside one certified reference domain |
| Correctness | zero accepted-state soundness failures and zero image/rebase/derivative regressions against exact perturbation |

Realized skip, exact fallback, memory peak, and tier mix are mandatory report fields. They do not weaken the gates above: in particular, a lower frame p95 cannot compensate for a static shader regression above 10%, and a faster shader cannot compensate for a `c_max`-only rebuild.

## Risks / Trade-offs

- **[Envelope is too conservative]** → Retain up to two certified Cauchy rungs, measure dynamic/current radius ratios and realized skip, and fall back to logarithmic sidecar buckets if the lower envelope loses material coverage.
- **[Envelope metadata costs more bandwidth than the current 16-byte sidecar]** → Load validity before coefficients, share global slopes, prune dominated constraints, set an explicit bytes-per-block gate, and evaluate conservative f16 packing only after the f32 path is correct.
- **[Dynamic tier checks increase divergence or ALU cost]** → Keep tier order fixed, short-circuit on the first valid tier at a fixed skip, expose per-tier attempt counters, and preserve the legacy tag path for A/B comparisons.
- **[Conservative rounding becomes unsound during packing]** → Centralize directed serialization, test every packed constraint against its f64 source, and round only toward smaller radii or stricter pure-`c` thresholds.
- **[Partial coefficient and envelope ranges become misaligned]** → Version payloads together, update directory counts last, and retain exact fallback for any unavailable slot.
- **[Incremental buffer growth causes a visible cut]** → Copy and populate replacement buffers before an atomic bind-group swap; never clear render history solely for table growth.
- **[Worker table work delays reference chunks]** → Enforce scheduling priority and cooperative quotas; cancel stale jobs at every yield boundary.
- **[Optional cmax-dependent Auto headers recreate the original stall]** → Version and disable them independently; they cannot invalidate the dynamic block table.

## Migration Plan

1. Add the CPU `ValidityEnvelope` model, direct soundness tests, size accounting, and current-solver comparison without changing production buffers.
2. Add a CPU mirror of dynamic tier/level dispatch and establish correctness/performance census baselines.
3. Add new GPU buffers and a `dynamicBlockValidity` debug flag; initially run shadow validity counters while legacy tags still apply blocks.
4. Enable dynamic application in debug Auto, retaining exact and legacy Unified modes for A/B and rollback.
5. Introduce the incremental builder and append protocol behind a separate flag; prove one-shot parity before enabling partial-table activation.
6. Decouple optional SA/periodic/gate headers, then enable both flags together on benchmark and navigation tests.
7. Make dynamic/incremental Auto the default only after field gates pass. Rollback consists of disabling the flags; no user data or persistent format migration is involved.

## Open Questions

- The one-rung packed-v1 layout is selected for the initial GPU implementation; a second rung added only 0.27% realized skip in the CPU census and remains an optional future experiment.
- Whether the reference-domain `R_c` ceiling should follow the existing recenter threshold exactly or include one octave of handoff headroom.
- Whether optional Auto headers should use a small logarithmic bucket cache or simply remain disabled during motion until the view stabilizes.
