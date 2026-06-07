## 1. Setup & Utilities

- [x] 1.1 Create parameter sanitization helper `sanitizeMandelbrotParams` and expose it
- [x] 1.2 Add unit/integration tests for parameter sanitization if applicable

## 2. Core Implementation

- [x] 2.1 Update `DEFAULT_MANDELBROT_PARAMS` in `MandelbrotViewer.vue` to default centered B&W view
- [x] 2.2 Update `onMounted` logic in `MandelbrotViewer.vue` to asynchronously fetch and load the first preset when navigation history is empty
- [x] 2.3 Integrate `sanitizeMandelbrotParams` at database read/write and load/save boundaries (e.g. in `presetStore.ts`, `Settings.vue`, `MandelbrotViewer.vue`)

## 3. Documentation Embed Cleanup

- [x] 3.1 Clean up embeds in `presentation/index.md` to remove obsolete global props and use `colorStops` config instead
- [x] 3.2 Clean up embeds in `presentation/optimisation.md` to remove obsolete global props and use `colorStops` config instead

## 4. Verification

- [x] 4.1 Run type checking and format verification
- [x] 4.2 Verify app loads and behaves correctly by running manual verification/testing
