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
