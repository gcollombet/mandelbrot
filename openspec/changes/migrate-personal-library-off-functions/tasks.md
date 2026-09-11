## 1. Direct Firebase Client

- [x] 1.1 Add shared browser-side validation and manifest/counter helpers for personal GUIDs, preset types, texture metadata, quotas, and revision normalization.
- [x] 1.2 Replace callable preset manifest, upsert, delete, usage, import-batch, and owner repair operations with direct Firestore reads and transactions.
- [x] 1.3 Replace callable texture reservation, finalization, deletion, and expired-reservation repair with direct Firestore/Storage operations.
- [x] 1.4 Remove HTTP role lookup and Firebase Functions initialization so authentication roles resolve only through Authentication and Firestore.

## 2. Firebase Boundaries and Migration

- [x] 2.1 Expand Firestore rules for validated owner preset, manifest, usage, texture, reservation, and import-batch writes while preserving catalogue authorization.
- [x] 2.2 Expand Storage rules for owner WebP create/update/delete with MIME and size bounds while preserving public catalogue authorization.
- [x] 2.3 Add a dry-run-first Admin SDK migration that reconstructs existing personal manifests and usage counters without rewriting payloads or blobs.
- [x] 2.4 Remove the deployable Functions entrypoint/configuration and obsolete Functions dependencies and environment variables without removing Admin SDK maintenance scripts.

## 3. Verification and Cutover

- [x] 3.1 Add focused unit tests for direct preset transactions, direct texture lifecycle, role resolution, initialization, validation, quota boundaries, and idempotent cleanup.
- [x] 3.2 Run focused/full unit tests, Functions-tool tests, TypeScript typecheck, rules syntax/deployment checks where available, and OpenSpec validation without Playwright.
- [x] 3.3 Run the personal metadata migration dry-run against `gcollombet-mandelbrot`, report any blockers, and document the required Blaze/rules/client/obsolete-function cutover order.
- [x] 3.4 Review the final diff for any remaining browser Cloud Functions imports, callable invocations, HTTP role endpoint, or deployable Functions source.
