## 1. Manifest Contracts and Remote Access

- [x] 1.1 Add versioned public catalogue manifest types, deterministic normalization, strict validation, uniqueness checks, and size-limit helpers.
- [x] 1.2 Replace the six collection metadata queries with one `catalogManifest/current` document read and remove the legacy listing API from the client path.
- [x] 1.3 Update administrator publication to commit the payload document and matching manifest entry atomically with one shared timestamp.

## 2. Authoritative Cache Reconciliation

- [x] 2.1 Refactor public catalogue synchronization to consume the manifest while preserving missing/newer per-entry payload downloads for all six catalogue types.
- [x] 2.2 Remove cached public-origin records absent from the manifest for all six stores, including cached texture blobs, while preserving every non-public record.
- [x] 2.3 Keep manifest and per-entry failures non-blocking without any collection-list fallback.

## 3. Migration and Security Boundaries

- [x] 3.1 Add an idempotent Admin SDK migration command with dry-run default, per-type validation/counts, deterministic ordering, size validation, and explicit `--apply` mode.
- [x] 3.2 Update Firestore rules to expose manifest and individual gets anonymously, deny anonymous catalogue lists, retain admin conflict queries, and validate admin manifest writes/deletes correctly.
- [x] 3.3 Run the migration dry-run against `gcollombet-mandelbrot`, review its counts and size, then apply the validated additive manifest write.

## 4. Verification

- [x] 4.1 Add focused manifest validation/publication tests and synchronization tests for unchanged, missing, newer, deleted-public, and preserved-non-public records.
- [x] 4.2 Run the focused unit tests, Functions tests, TypeScript typecheck, and OpenSpec validation without running Playwright.
- [x] 4.3 Review the final diff for absence of public collection-list calls and document the remaining client/rules deployment order for billing verification.
