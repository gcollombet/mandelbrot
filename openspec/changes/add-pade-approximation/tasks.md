> Ordered by dependency and by the design's **Validation path**: scaffold → Rust math
> prototype (isolate math risk) → storage → shader application → validation harness →
> benchmark/decision. Phases 2 and 6 are the go/no-go gates — the approach is unvalidated
> (`design.md` Risks), so do not start phase 3+ until phase 2 shows a real skipped-iteration
> gain, and treat phase 6 as a possible stop ("abandon" is a doc-consistent outcome).

## 1. Mode Plumbing Scaffold

- [x] 1.1 `ApproximationMode = 'perturbation' | 'bla' | 'pade'`; `setApproximationMode` routes `'pade'→use_pade()`; both `get_approximation_mode()` mappings are 3-state; `getEffectiveMaxBatchSize`/`canUseBla` include pade.
- [x] 1.2 Rust `use_pade()` (+ cache invalidation) and `ApproximationMode::Pade = 2`; worker `applyApproximationMode` routes pade; `postBlaIfReady` posts for both 1 and 2 (skips only 0).
- [x] 1.3 Uniform `approximationModeFlag` = 2 for pade (1 = bla, 0 = exact); shader reads `>= 1.5` ⇒ Padé, `>= 0.5` ⇒ blocks on. Affine/perturbation packing unchanged (vite build + naga clean).

## 2. Rust Math Prototype — Seed, Merge, Radius (philosophy A), CPU-only

- [x] 2.1 Seed Padé per step in `lib.rs:758`: `D = −1/(2Z)` (`cinv_neg64`) and radius `α = √ε·|Z|` (was `ε·|Z|`). Keep `A=2Z`, `B=1`, `β=0`. (Extracted to `bla_seed(zx,zy,epsilon,pade)`.)
- [x] 2.2 Carry `D` through the merge (`lib.rs:782-798`): `D_z = D_x + A_x·D_y` (`left` = x, so `A_x = left.a`). `α`/`β` `min`/`max` lines unchanged (philosophy A). (Extracted to `bla_merge(left,right,pade)`; affine output byte-identical — 16/16 existing tests pass.)
- [x] 2.3 CPU-only diagnostic `pade_skips_more_than_affine` (test module): sweeps input `|dz|`, sums max-aligned-skip across the orbit for affine vs Padé on three locality classes. No shader. Result below.
- [x] 2.4 Unit test `pade_seed_reproduces_quadratic_and_radius` (spec: *Padé block form and seed*): `−A·D = 1` (z² reproduced), radius ratio = `1/√ε`, affine carries no `D`.
- [ ] 2.5 **Gate (DECISION POINT):** phase 2.3 shows Padé sustaining full skip in the `[ε|A|, √ε|A|]` band where affine collapses to 0 (best ratios x278 / x26624 / x9356). The radius advantage is confirmed and composes exactly as derived (uniform `1/√ε`). Skip-*capacity* gate cleared → proceed; *realized* speedup (band occupancy) still needs the shader + benchmark (phase 6). **Awaiting user go/no-go before phase 3+.**

## 3. Storage — `D` In The Table

- [x] 3.1 `dx, dy, d_exp` added to `BlaStep` (Rust) + `BlaF64` + both shader `BlaStep` structs (`mandelbrot.wgsl`, `mandelbrot_brush.wgsl`). `α`/`β` shared with affine.
- [x] 3.2 `bla_f64_to_fe` packs `D` with its own exponent (`frexp_scale(d_max)`). Confirmed in generated `mandelbrot_bg.wasm.d.ts` (`d_exp`, `dx`, `dy` getters).
- [x] 3.3 `D`/`√ε` radius computed only in pade mode (the `pade` flag in `bla_seed`/`bla_merge`). **Deviation:** `BlaStep` is widened unconditionally (affine entries carry `D=0`), not a separate table — D7's storage optimization (avoid +37% on affine) is **deferred**; simpler and harmless (D=0 ignored on the affine path).
- [x] 3.4 Worker stride `8 → 11` (`BLA_STEP_FLOATS`) and Engine buffer sizes/strides via a shared `BLA_STEP_FLOATS = 11` constant; wasm rebuilt.

## 4. Shader Application — Rational Map + Corrected Derivative + Pole (both paths)

- [x] 4.1 `try_apply_bla` (shallow): `M = vec2(1,0) + cmul(d, dz)`, `invM = cinv(M)`, `z ← cmul(N, invM)` with `N = A·dz + B·dc`, gated on the `√ε` radius (`D` excluded from the gate). Branches on `approximationMode >= 1.5`; affine path byte-identical.
- [x] 4.2 Corrected derivative (D4, **mandatory**): `derM = cmul(invM, cmul(cmul(a, invM), derM) + b·derInvScale)` = `(A/M²)·der + B/M`, reusing `invM`.
- [x] 4.3 Pole guard (D6): apply only when `dot(M,M) >= PADE_POLE2` (`1e-4`); otherwise fall through and descend a level (→ exact at skip 0). Rare within the √ε radius.
- [ ] 4.4 **Deferred.** Deep (floatexp) path: in pade mode the deep loop falls back to **exact perturbation** (`useBlaDeep && approximationMode < 1.5`), not rational fe blocks. The fe-Padé derivative is intricate and the deep regime (< 1e-35) is rare; ported later if shallow Padé proves out. Affine BLA still runs deep.
- [x] 4.5 Rebasing unchanged (D5): no edits to the rebase blocks; `der` untouched, `D` read fresh from the table.
- [x] 4.6 **CRITICAL: implement Padé in the in-place COMPUTE path too.** `mandelbrot_brush.wgsl` is NOT a throwaway preview — it is the in-place compute pipeline (`pipelineInplace`, dispatched in `Engine` ~L2722) that does the bulk of progressive-continuation iteration on deep views. Padé MUST be ported there (rational map + D4 derivative + pole guard) and its `useBla` gate must include pade. **This was the root-cause bug**: Padé was initially disabled there (`useBla < 1.5` → exact), so BLA sped up (2s) but Padé fell back to plain perturbation (4s) — invisible in `mandelbrot.wgsl`, which only handles fresh pixels. Both shaders now carry the identical Padé branch. (Deep fe path in the in-place shader still falls back to exact in pade mode, like 4.4.)

## 5. Validation Harness — Difference Mode + Pole Telemetry

- [ ] 5.1 Difference mode (Validation path step 1): color `|z_padé − z_affine|` (or the skipped-iteration delta) by running both maps; reuse the existing mode toggle and `RenderStats`. This makes *where* Padé acts visible (large-`|z|` detail vs smooth zones ≈ 0).
- [ ] 5.2 Pole-guard fire-rate telemetry (D6, spec: *Pole guard and radius telemetry*): count guard fallbacks / total applications, surface in `RenderStats`. This is the empirical validator of the radius composition.
- [x] 5.3 Quadrature radius (D3-B) **evaluated on CPU and rejected**: the full-loop benchmark's near-chaos accuracy tail (Feigenbaum) is *not* reduced by quadrature (mismatches unchanged, max |Δiter| 12→24), confirming the tail is inherent Padé accuracy at large |dz|, not a radius-composition defect. `min` + √ε seed retained (design D3-A).

## 6. Benchmark + Decision (§8 gate)

- [x] 6.1 **In-app benchmark shipped.** `MandelbrotNavigator::benchmark_pade(grid)` (WASM) runs the exact/affine/Padé loop on the *current* reference orbit over a pixel grid and returns step counts + a correctness cross-check; wired worker→Engine→RenderStats ("Padé bench → run") and `window.__mandelbrotEngine.benchmarkPade()`. Verified on a band-riding view (`-0.75 @1e-4`): Padé **×1.148** vs affine (affine got **0** block benefit there — its ε radius is below dc), 0 mismatches. The user runs it per-view for real numbers.
- [~] 6.2 §8 bar: the benchmark gives the per-view ratio to apply the bar. Skip-*capacity* in the band is ≫30% (x278–x26624, task 2.3); *realized* is view-dependent (interior ≈ ×1.00; band-riding ≈ ×1.15 and climbing where affine is useless). User confirms ≥30% on their target minibrot/near-escape views via the button.
- [x] 6.3 **VALIDATED on GPU (2026-06-26): Padé is faster than BLA**, with a correct image (no DE halos) at reasonable ε — i.e. the D4 derivative is right, and Padé clears the §8 bar (it beats affine BLA, not just matches it; better than the CPU estimate predicted). Only a slight distortion appears at *exaggerated* ε or max-skip (the radius then exceeds the rational's validity → the D3/D6 boundary). **Decision: ship Padé** as a real improvement; keep ε within the recommended band (D6). Remaining: bound ε/skip to the safe range (or quadrature radius D3-B) to remove the extreme-setting distortion.

## 7. Verification

- [x] 7.1 Rust unit tests: `pade_seed_reproduces_quadratic_and_radius` (η_pad=η_aff², √ε radius), `pade_merge_composition_is_exact_for_c0` (D_z=D_x+A_x·D_y, exact Möbius compose at c=0), `pade_block_derivative_matches_finite_difference` (A/M²·der+B/M vs central FD). 19/19 pass.
- [x] 7.2 `'perturbation'` and `'bla'` modes unchanged: 16/16 Rust tests pass (affine table byte-identical), the shader affine branch is the original code verbatim, vue-tsc + vite build + naga all clean.
- [x] 7.3 Visual confirmation done (manual WebGPU session): no DE halos / seams at reasonable ε → the D4 derivative is correct; smooth zones match BLA; only slight distortion at exaggerated ε/skip (validity boundary). Padé measured faster than BLA in `Last render → gpu`.
