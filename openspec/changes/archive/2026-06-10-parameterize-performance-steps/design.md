## Context

The application already keeps most Mandelbrot parameters in a shared model, persists that model to `localStorage`, and forwards selected performance values down to the WebGPU engine. Two sentinel-related values are currently hard-coded in `Engine.ts`, which makes zoom refinement and progressive seeding less adaptable to different workloads.

## Goals / Non-Goals

**Goals:**
- Make the zoom brush step configurable from the existing Performance section.
- Make the sentinel seed step configurable from the existing Performance section.
- Preserve current behavior through safe defaults and backward-compatible loading.
- Keep the settings session-scoped, consistent with the current model persistence flow.

**Non-Goals:**
- Redesigning the Performance tab layout beyond adding the new controls.
- Introducing a new settings backend or server-side persistence.
- Changing the underlying WebGPU algorithms beyond parameterizing the existing constants.

## Decisions

1. Add both values to the shared `MandelbrotParams` model and default state.
   - Rationale: the app already persists and restores `MandelbrotParams` as a single JSON payload, so this keeps the new controls aligned with the existing persistence path.
   - Alternatives considered: store them in separate keys. Rejected because it would split related settings across multiple persistence flows and increase migration complexity.

2. Treat the settings as session-level performance controls, not preset content.
   - Rationale: the existing preset save/restore path strips performance fields, and these values are intended to tune runtime behavior rather than define the visual preset itself.
   - Alternatives considered: include them in presets. Rejected because it would make preset sharing less predictable and blur the boundary between visual configuration and runtime tuning.

3. Propagate the values from `Settings.vue` to the engine through the existing component chain rather than adding a new control channel.
   - Rationale: `MandelbrotViewer.vue`, `MandelbrotController.vue`, and `Mandelbrot.vue` already pass performance-related props through to `Engine`. Extending that chain is the least invasive path.
   - Alternatives considered: read the values directly from storage inside `Engine.ts`. Rejected because it would couple the engine to browser storage and duplicate state ownership.

4. Normalize the step values to power-of-two inputs with explicit range bounds.
   - Rationale: the engine logic already assumes power-of-two progression for sentinel refinement, so the UI should prevent unsupported values instead of silently relying on implementation rounding.
   - Alternatives considered: allow arbitrary integers and round inside the engine. Rejected because it hides the real constraint from users and makes behavior harder to reason about.

## Risks / Trade-offs

- [Risk] Adding two new model fields can invalidate older localStorage payloads if defaults are not handled carefully. → Keep default values in the initial model and merge persisted data over the defaults.
- [Risk] The new values may be stripped from preset save/restore paths in one place but not another. → Update every preset serialization path that currently removes performance fields and add regression coverage.
- [Risk] Hard-coded engine call sites may continue using the old constants. → Centralize the new values in the shared model and pass them through the existing prop chain so there is a single source of truth.
