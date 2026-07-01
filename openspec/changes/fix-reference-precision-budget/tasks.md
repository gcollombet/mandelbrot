> Ordered by dependency: repro baseline → core precision math (Rust) → budget lifecycle →
> orbit headroom + clamp → UI/preset wiring → validation. Phase 2 is the load-bearing change;
> do not wire UI (phase 5) before phase 2 matches the post-reload baseline.

## 1. Repro baseline

> NOTE: the live-vs-reload pixel-diff harness needs the WebGPU pipeline, which cannot render
> headless in this environment (only the fallback shows). Correctness is instead gated by the
> Rust unit tests (2.5/2.6 + descending_profile_matches_uniform_precision), which validate the
> orbit/precision directly. Items below remain for a manual/GPU-capable pass.

- [ ] 1.1 Capture a deep preset whose interactive zoom currently diverges, and its post-reload
      (fresh-reference) render as the known-good baseline.
- [ ] 1.2 Add a regression harness comparing live-zoom render vs reloaded render at several
      depths (pixel/iteration-count diff threshold).

## 2. Core precision math (Rust, `reference_calculus/src/lib.rs`)

- [x] 2.1 Add a fixed precision budget `P = −log₂(target) + guard` field on the navigator,
      independent of the live view scale; default target `1e-30`. Setter triggers a full
      reference reset (`reset_reference_to` semantics).
- [x] 2.2 Carry `der = dZ/dC` in floatexp via `der_{n+1} = 2·Z_n·der_n + 1` inside
      `compute_reference_orbit_inner`; expose `G_n = log₂|der_n|`.
- [x] 2.3 Apply per-step precision `p(n) = clamp(P − ⌊G_n − margin⌋, floor, P)` to the DBig
      iteration (set operand precision per step or per 64-step block). Add `last_zx`/`last_zy`
      handling so the running value tracks the profile. **Keep `C` (`reference_cx/cy`, `cx/cy`)
      at full `P`** — apply the reduced precision only to the `z_n` operands, never to the
      centre or to `dc`.
- [x] 2.4 Make orbit growth append-only under a fixed budget: no precision-driven reset; keep
      the `> 20·scale` recenter reset as the only other trigger.
- [x] 2.4b Drive `ensure_precision` from the budget `P` (not `precision_bits_for_scale(live
      scale)`), so `detect_period_ball` / `newton_nucleus` / `choose_reference_near_view` /
      `find_minibrot` carry their critical orbit + derivative at full `P`; a minibrot found at
      a shallow live scale is still located to full budget depth.
- [x] 2.5 Unit test (spec *Descending precision profile*): step 1 at `P`; precision sheds only
      after `der` grows; precision rises again across a synthetic minibrot return.
- [x] 2.6 Unit test (spec *Append-only orbit growth*): extending iterations within budget does
      not alter previously computed steps; a deep-budget orbit serves a shallow view.

## 3. Budget lifecycle & worker wiring

- [x] 3.1 Thread the budget parameter through the reference worker (`reset`/`updateView`
      messages) and `Engine.ts`; budget change routes to `resetReferenceJob`, not `updateView`.
- [x] 3.2 Beyond-budget path: when live scale < budget target, keep rendering at existing `P`
      (no clamp, no auto-recompute) — spec *Beyond-budget degradation*.

## 4. Iteration headroom & block clamp

> NOTE: 4.1 done — orbit computed to HEADROOM(2)× display maxIter in the worker, capped at the
> 1M-step GPU buffer capacity; BLA/guard stay at display maxIter; Engine pending buffers sized
> to the headroom (shared REFERENCE_ITER_HEADROOM / ORBIT_STEP_CAPACITY constants). 4.2 (the
> no-black-frame regression) still needs a WebGPU-capable pass to observe.

- [x] 4.1 Compute the reference to `2 × maxIter` (`compute_reference_orbit_chunk` target and
      `targetMaxIterations` in the worker); guard the shader `guardedMaxIter` unchanged.
- [ ] 4.2 Regression: interactive zoom-in produces no transient black frame (harness from 1.2).
- [x] 4.3 Lower `max_bla_skip` upper clamp `2²⁰ → 2¹⁸` (`lib.rs:213`); existing BLA/Padé tests
      stay green.

## 5. UI & preset persistence

- [x] 5.1 Expose the precision-budget parameter in Settings as a slider over target scale
      (default `1e-30`, reaching down to `1e-1000` ≈ 3300 bits), with a clear signal when the
      view crosses the budget (assumed degradation). Use a log/power-of-ten scale for the
      slider (cf. the existing zoom slider that maps to a power of ten).
- [x] 5.2 Persist the budget in preset state (save + load); loading restores it and rebuilds
      the reference once — spec *Budget persisted per preset*.

## 6. Validation

- [ ] 6.1 Live deep-zoom render matches the reloaded baseline at all tested depths (no
      early-iteration divergence), under perturbation, BLA, and Padé.
- [ ] 6.2 Confirm `der`-carrying does not regress orbit compute-loop throughput.
- [ ] 6.3 Tune guard/margin/floor against the baseline; record final values in `design.md`.

## Out of scope (recorded)

- f32 → double-float orbit storage (`pad0/pad1`): possible future `restore-double-float-orbit`.
- Exploration auto-ratchet: dropped in favour of the fixed budget.
