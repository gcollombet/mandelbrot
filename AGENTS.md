# Agent guide (Mandelbrot)

Vue/Vite + WebGPU frontend with Rust/WASM arbitrary-precision reference calculus.
Live demo: https://gcollombet.github.io/mandelbrot/

## Setup & first run

```bash
npm install
cd reference_calculus && wasm-pack build && cd ..
# The wasm-pack output in reference_calculus/pkg/ is consumed as an npm dependency
# named "mandelbrot" (the crate's package name). In dev, you may need:
npm link reference_calculus/pkg   # register the local wasm package globally
npm link mandelbrot               # link it into the root project
npm run dev
# Open http://localhost:5173
```

**The dev server never rebuilds the WASM.** After any change under
`reference_calculus/src`, rerun `wasm-pack build reference_calculus` (or
`--dev`), otherwise the page keeps running the old `pkg/` and buffer layouts
shared with the worker/GPU (`BlaStep`, `MandelbrotStep`) silently drift. The
worker throws at the first BLA table build when the `BlaStep` stride does not
match; a capture that reports `blaLevels: 0` with mode `bla` is the symptom.

The app requires a **WebGPU-capable browser** (Chrome/Edge with `--enable-unsafe-webgpu` flag).

## Commands

### Frontend (root)

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server on :5173 |
| `npm run build` | `wasm-pack build` (release) → `vue-tsc -b` → `vite build` → `vitepress build presentation` → `git add docs` |
| `npm run preview` | Preview the Vite production build (serves `docs/`) |
| `npm run docs:dev` | VitePress dev server for `presentation/` |
| `npm run docs:build` | Build VitePress site |
| `npm run docs:preview` | Preview VitePress build |

**Important**: `npm run build` auto-stages `docs/` via `git add docs`. The Vite build outputs to `docs/` (GitHub Pages), **not** `dist/`. `vite.config.ts` sets `base: './'` for relative asset paths and `assetsDir: ''` (assets at root, not in `assets/` subdir).

### Rust / WASM

- Build WASM (dev): `wasm-pack build --dev reference_calculus`
- Build WASM (release): `wasm-pack build reference_calculus`
- Rust tests: `cargo test --manifest-path reference_calculus/Cargo.toml`
- Rust test by name: `cargo test --manifest-path reference_calculus/Cargo.toml <substring>`

The crate lives at `reference_calculus/` and uses `dashu-float` for arbitrary precision (not astro-float). Crate name is `mandelbrot`, edition 2018. It compiles to both `cdylib` (WASM) and `rlib`.

### Lint / format

- Typecheck: `npx vue-tsc -b`
- Rust format check: `cargo fmt --manifest-path reference_calculus/Cargo.toml --check`
- Rust clippy: `cargo clippy --manifest-path reference_calculus/Cargo.toml --all-targets`

### Tests

- **Playwright** (E2E): `npx playwright test` — dev server must already be running on :5173
  - Config: `tests/` directory, `playwright.config.ts`
  - Chromium only, headed mode (WebGPU requires it), `--enable-unsafe-webgpu` flag
  - `tests/navigation.spec.ts` — 13 UI/interaction tests (loading, tabs, keyboard, mouse, localStorage persistence)
  - `tests/visual.spec.ts` — 6 screenshot-based tests (default view, zoom reprojection, frozen alignment, interior, palette preview, console errors)
  - Screenshots go to `tests/screenshots/`
- **Rust**: `cargo test --manifest-path reference_calculus/Cargo.toml`
- **Censuses** (field measurements, `#[ignore]`d because they run for minutes): add
  `--release ... -- --ignored --nocapture`, e.g.
  `cargo test --release --manifest-path reference_calculus/Cargo.toml --lib box_dimension_census -- --ignored --nocapture`.
  Current ones: `reach_census`, `nu_branch_census` (`reach.rs`), `box_dimension_census`,
  `skip_ceiling_census` (`boxdim.rs`), `minibrot_detection_census` (`lib.rs`, minibrot
  search success vs the pre-ladder single shot). Findings live in the root `*.md` notes.
- No JS/TS unit test runner configured (no Vitest/Jest).

### Testing the engine's output (mandatory method for agents)

Any test that needs the **rendered output of the engine** (comparing kernels,
approximation modes, ε values, palettes, a suspected rendering bug…) goes through
the dev-only console capture tooling, never through screenshots of the live
canvas or Playwright clicks on the UI. The live canvas is progressive: a
screenshot taken at an arbitrary moment shows unfinished pixels, and the BLA table
may not have landed yet. `__capture` drives the engine's export session
(`renderStill`, the same path as the camera button) and returns only once every
pixel has converged and, in BLA mode, once the block table of the current
reference is in place. The default 1024×576 / AA 1 still costs well under a
second on a desktop GPU.

**Procedure** (dev server running, `npm run dev`):

1. Open `http://localhost:5173` in the built-in browser (`preview_start` with the
   URL). Wait a few seconds for `window.__capture` to exist.
2. Run the capture from the page's JavaScript console (`javascript_tool`):
   ```js
   await __capture({ save: 'seahorse-bla', mode: 'bla', eps: 1e-6,
                     location: { cx: '-0.75', cy: '0.1', scale: '1e-11', angle: 0 } })
   // → { file: 'captures/seahorse-bla.png', pumps, ms, shaderFlag, blaLevels, ... }
   ```
   `save` writes the PNG to `captures/<name>.png` at the repository root (via the
   dev server's sink, `scripts/vite-capture-sink.ts`; the folder is gitignored).
   Omit `location` to render the current view; any field left out keeps its
   current value. `mode` / `eps` default to the current settings. `width` /
   `height` / `aa` override the 1024×576 / 1 defaults.
3. Read the PNG with the file reader. Check `shaderFlag` (0 exact, 1 BLA) and
   `blaLevels` in the result to confirm which kernel actually ran.
4. For a kernel A/B: `await __compare({ save: 'seahorse', eps: 1e-6 })` renders
   exact then BLA at the current view (or at `location`), writes
   `seahorse-exact.png`, `seahorse-bla.png`, `seahorse-diff.png` (red = differing
   pixel, per-channel difference > `threshold`, default 8) and returns
   `{ differing, total, fraction, exact, bla }`.

Rules: one capture per question, keep the default size unless the detail under
test needs more, and never leave a test hanging on the live canvas. The tooling
lives in `src/devCapture.ts`, wired in `MandelbrotViewer.vue` under
`import.meta.env.DEV` (also `window.__mandelbrotEngine` and `window.__renderStill`).

Headless fallback without the built-in browser:
`node scripts/engine-capture.mjs compare --cx=… --cy=… --scale=1e-11 --eps=1e-8 --out=/tmp/cap`
(or `capture --mode=bla`) runs the same through Playwright's Chromium, on
SwiftShader by default (`--gpu=native` for a real GPU); slow but reproducible.

Limits: this cannot test the **real-time** mechanics (progressive passes,
reprojection during zoom, frame pacing, AA accumulation over frames, reference
hand-over while navigating). For those, the Playwright E2E specs remain the tool.

## Architecture

- `src/` — Vue 3 + TypeScript frontend. WebGPU compute/render pipeline in `Engine.ts` (~2300 lines). WGSL shaders in `src/assets/*.wgsl`.
- `reference_calculus/` — Rust crate compiled to WASM via `wasm-pack`. Provides arbitrary-precision reference orbit calculation (`MandelbrotNavigator`), consumed from TS via wasm-bindgen.
- `presentation/` — VitePress documentation site, output to `docs/presentation/`.
- `docs/` — GitHub Pages deployment target. Contains both the app build and the VitePress presentation.

## Style & conventions

### TypeScript / Vue

- TS config: `tsconfig.app.json` — `strict: false` but `noUnusedLocals`, `noUnusedParameters`, `noUncheckedSideEffectImports` are on.
- Prefer `import type { ... }` for type-only imports.
- Name: `PascalCase` components/classes, `camelCase` variables/functions.
- Styling: Tailwind CSS v4 + SCSS (`sass-embedded`).

### Rust (reference_calculus)

- Edition 2018 (not 2021 — no `use` changes, no `TryFrom` in prelude).
- Run `rustfmt` on changes.
- Avoid `unwrap()`/`expect()` unless proven unreachable; prefer `Result`.
- Add regression tests for new behavior.

## Environment

- No CI/CD workflows found (no `.github/workflows/`).
- No Cursor rules (`.cursorrules`/`.cursor/rules`) found.
- `.github/copilot-instructions.md` exists but is empty.

<!-- CODEGRAPH_START -->
## CodeGraph

This project has a CodeGraph MCP server (`codegraph_*` tools) configured. CodeGraph is a tree-sitter-parsed knowledge graph of every symbol, edge, and file. Reads are sub-millisecond and return structural information grep cannot.

### When to prefer codegraph over native search

Use codegraph for **structural** questions — what calls what, what would break, where is X defined, what is X's signature. Use native grep/read only for **literal text** queries (string contents, comments, log messages) or after you already have a specific file open.

| Question | Tool |
|---|---|
| "Where is X defined?" / "Find symbol named X" | `codegraph_search` |
| "What calls function Y?" | `codegraph_callers` |
| "What does Y call?" | `codegraph_callees` |
| "What would break if I changed Z?" | `codegraph_impact` |
| "Show me Y's signature / source / docstring" | `codegraph_node` |
| "Give me focused context for a task/area" | `codegraph_context` |
| "See several related symbols' source at once" | `codegraph_explore` |
| "What files exist under path/" | `codegraph_files` |
| "Is the index healthy?" | `codegraph_status` |

### Rules of thumb

- **Answer directly — don't delegate exploration.** For "how does X work" / architecture / trace questions, answer with 2-3 codegraph calls: `codegraph_context` first, then ONE `codegraph_explore` for the source of the symbols it surfaces. Codegraph IS the pre-built index, so spawning a separate file-reading sub-task/agent — or running a grep + read loop — repeats work codegraph already did and costs more for the same answer.
- **Trust codegraph results.** They come from a full AST parse. Do NOT re-verify them with grep — that's slower, less accurate, and wastes context.
- **Don't grep first** when looking up a symbol by name. `codegraph_search` is faster and returns kind + location + signature in one call.
- **Don't chain `codegraph_search` + `codegraph_node`** when you just want context — `codegraph_context` is one call.
- **Don't loop `codegraph_node` over many symbols** — one `codegraph_explore` call returns several symbols' source grouped in a single capped call, while each separate node/Read call re-reads the whole context and costs far more.
- **Index lag**: the file watcher debounces ~500ms behind writes; don't re-query immediately after editing a file in the same turn.

### If `.codegraph/` doesn't exist

The MCP server returns "not initialized." Ask the user: *"I notice this project doesn't have CodeGraph initialized. Want me to run `codegraph init -i` to build the index?"*
<!-- CODEGRAPH_END -->

## Imported Claude Cowork project instructions
