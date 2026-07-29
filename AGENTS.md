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
  `skip_ceiling_census` (`boxdim.rs`). Findings live in the root `*.md` notes.
- No JS/TS unit test runner configured (no Vitest/Jest).

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
