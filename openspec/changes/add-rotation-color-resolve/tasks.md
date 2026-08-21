## 1. Rotation Resolve Shaders

- [x] 1.1 Add neutral-space final-color cache entry points to the authoritative color shader
- [x] 1.2 Add the linear filtered rotation presentation shader with coverage normalization and final display conversion
- [x] 1.3 Add a tested helper that recognizes oblique versus 90-degree-aligned rotations

## 2. GPU Resources and Lifecycle

- [x] 2.1 Create the rotation-cache render and present pipelines, sampler, uniform buffer, texture, view, and bind groups
- [x] 2.2 Recreate and invalidate rotation-cache resources on resize and release them during engine destruction
- [x] 2.3 Track cache readiness and invalidate it after view, render-option, or raw-field mutations

## 3. Exclusive Terminal Rendering

- [x] 3.1 Gate cache baking on settled oblique non-AA rendering and retain the direct fallback while ineligible
- [x] 3.2 Present a ready cache through the filtered terminal pass
- [x] 3.3 Keep rotation-cache bake/presentation mutually exclusive with active or accumulated AA and integrate pending work into frame scheduling

## 4. Verification

- [x] 4.1 Add focused unit and source-contract coverage for alignment, semantic-field isolation, filtered presentation, and AA exclusivity
- [x] 4.2 Validate changed WGSL shaders, TypeScript, unit tests, OpenSpec strictness, and whitespace without running Playwright
