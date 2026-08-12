## 1. Configuration and compatibility

- [x] 1.1 Define the normalized `OrbitTrapConfig` model, defaults, clamps, mode predicates, and legacy `orbitTrapStrength` migration
- [x] 1.2 Thread the structured configuration through render options, viewer/controller/preview props, and palette record serialization

## 2. Stage one — terminal rosette

- [x] 2.1 Extend the color uniform layout and every matching CPU/preview upload with terminal-rosette geometry, encoding, and composition fields
- [x] 2.2 Replace the fixed terminal axes/diagonals/circle mask with the logarithmic-rosette distance, independent generalized-Gaussian mask, and weighted palette phase
- [x] 2.3 Add compact and advanced settings controls, defaults, reset/copy/load behavior, and persistence for terminal mode
- [x] 2.4 Run focused shader syntax and TypeScript checks, fixing any terminal-mode regressions without running Playwright

## 3. Stage two — sampled closest approach

- [x] 3.1 Add conditional raw, resolved, live, and frozen trap-payload resources plus mode-flip history invalidation
- [x] 3.2 Carry `(bestDistance, hitIteration, hitAngle)` through shallow/deep progressive continuation and update it at explicit steps and accelerated-block landing points
- [x] 3.3 Resolve, merge, reproject, and sample the closest-hit payload in the color pass without overloading terminal geometry or orbit-metric carriers
- [x] 3.4 Add sampled-mode traversal and phase controls, interior gating, preview semantics, and preset persistence

## 4. Stage two — exact policy

- [x] 4.1 Make exact mode reject or unfold all approximation skips that lack a conservative trap-distance bound
- [x] 4.2 Add telemetry or debug evidence that distinguishes terminal, sampled, and exact evaluation paths

## 5. Validation and documentation

- [x] 5.1 Add focused normalization and shader/layout regression tests where supported by the existing test setup
- [x] 5.2 Run WGSL validation, `npx vue-tsc -b`, and focused non-Playwright checks; report browser visuals and GPU performance as unverified unless separately exercised
- [x] 5.3 Document the mathematical trap definition, mode accuracy semantics, parameter meanings, and legacy-preset migration
