## Why

The performance panel currently relies on fixed brush and sentinel step constants, which makes the tuning hard to adapt to different machines and exploration styles. Exposing these values in the UI gives users control over responsiveness and workload without requiring code changes.

## What Changes

- Add configurable `ZOOM_MIN_BRUSH_STEP` in the Performance section with a default of `1` and a maximum of `64`.
- Add configurable `SENTINEL_SEED_STEP` in the Performance section with a default of `64` and a maximum of `4096`.
- Preserve safe defaults so existing behavior remains stable for users who do not change the settings.
- Keep the new settings within the existing performance-oriented controls rather than introducing a separate advanced panel.

## Capabilities

### New Capabilities
- `performance-settings`: Configure performance-related step values from the UI, including validated defaults and upper bounds for brush and sentinel stepping.

### Modified Capabilities

## Impact

- Vue UI in the performance settings section.
- Settings validation and persistence, including any local storage or preset serialization paths that carry performance values.
- Any engine or interaction code that reads brush or sentinel step constants at runtime.
