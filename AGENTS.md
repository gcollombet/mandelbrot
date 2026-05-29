# Agent guide (Mandelbrot)

This repo contains a Vue/Vite frontend plus Rust crates (one compiled to WASM).

## Commands

### Frontend (root)

- Dev server: `npm run dev`
- Production build: `npm run build`
  - Note: this also runs `wasm-pack build --dev` in `reference_calculus/` and stages `docs` via `git add docs`.
- Preview build output: `npm run preview`
- Docs (VitePress): `npm run docs:dev`, `npm run docs:build`, `npm run docs:preview`

### Rust / WASM

- Build WASM package (dev): `wasm-pack build --dev reference_calculus`
- Rust tests (native, reference_calculus): `cargo test --manifest-path reference_calculus/Cargo.toml`
- Rust tests (workspace, astro-float-local): `cargo test --manifest-path astro-float-local/Cargo.toml`

### Lint / format

- Typecheck (acts as lint): `npx vue-tsc -b`
- Rust format check:
  - `cargo fmt --manifest-path reference_calculus/Cargo.toml --check`
  - `cargo fmt --manifest-path astro-float-local/Cargo.toml --check`
- Rust clippy (optional but preferred):
  - `cargo clippy --manifest-path reference_calculus/Cargo.toml --all-targets`
  - `cargo clippy --manifest-path astro-float-local/Cargo.toml --all-targets`

### Run a single test

- Rust: `cargo test --manifest-path reference_calculus/Cargo.toml <test_name_or_substring>`
- Rust (workspace crate): `cargo test --manifest-path astro-float-local/Cargo.toml -p astro-float-num <test_name_or_substring>`
- JS/TS: no configured test runner was found (no Playwright/Vitest/Jest config or deps); `tests/navigation.spec.ts` is currently empty.

## Coding style

### TypeScript / Vue

- Keep TypeScript strict (see `tsconfig.app.json`): no unused locals/params, no unchecked side-effect imports.
- Prefer explicit, typed APIs over `any`. Use `unknown` + narrowing when needed.
- Prefer `import type { ... }` for type-only imports.
- Avoid side-effect-only imports unless essential; if required, document intent in code review/PR.
- Use clear names: `PascalCase` for components/classes, `camelCase` for variables/functions, `SCREAMING_SNAKE_CASE` for constants.
- Error handling: throw `Error` (or a specific subclass) with actionable messages; validate inputs at boundaries.

### Rust (applies especially under `astro-float-local/`)

- Run `rustfmt` on changes.
- Minimize `unsafe`; justify any `unsafe` use.
- Avoid `unwrap()` / `expect()` unless proven unreachable.
- Prefer returning `Result` over panicking in non-test code.
- Add regression tests for new behavior; document all public items.

## Editor / agent rules

- No `AGENTS.md` existed previously.
- No Cursor rules (`.cursorrules` / `.cursor/rules`) were found.
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
