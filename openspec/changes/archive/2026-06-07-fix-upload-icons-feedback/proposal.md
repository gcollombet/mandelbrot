## Why

Upload icons currently overlap the heart/favorite controls, which makes the actions visually ambiguous and harder to use. Users also need immediate confirmation that an upload completed successfully instead of having to infer it from later state changes.

## What Changes

- Reposition upload icons so they appear to the left of heart/favorite icons without overlap.
- Add a clear visual success indication after an upload completes.
- Preserve existing upload and favorite behavior while improving discoverability and feedback.

## Capabilities

### New Capabilities
- `upload-action-feedback`: Covers upload action layout relative to favorite controls and upload success feedback.

### Modified Capabilities

## Impact

- Affects the UI components and styles that render upload and heart/favorite actions.
- May affect interaction state for upload completion feedback.
- No expected API, dependency, shader, Rust/WASM, or persistence changes.
