## Why

The personal library currently depends on second-generation Cloud Functions, which stop working when project billing is disabled and add an unnecessary request path once the project moves to Blaze. The authenticated browser can perform the same owner-scoped Firestore transactions and Firebase Storage operations directly, provided the rules become the authorization and validation boundary.

## What Changes

- Replace every personal-library callable function with direct Firebase Web SDK reads, transactions, document writes, Storage uploads/downloads, and Storage deletes.
- Resolve `guest | user | admin` directly from Firebase Authentication plus the owner-readable `admins/{uid}` document, removing the HTTP `role` request and its CORS failure mode.
- Preserve the existing preset manifest, usage counters, texture reservation/finalization workflow, revisions, retry semantics, and 400-preset/10-texture limits in the official client.
- Expand Firestore and Storage rules so owners can perform only validated writes inside their own namespace while cross-account access and public-catalog writes remain denied.
- Add browser-side reservation cleanup and owner-only usage repair, replacing the callable maintenance operations without exposing cross-account administration.
- Remove the deployable Cloud Functions runtime and obsolete endpoint environment variables; keep Admin SDK maintenance/migration scripts as local tooling.
- **BREAKING**: Firebase Security Rules, rather than trusted Cloud Functions, become the write authorization boundary. The 400/10 counters prevent accidental overuse in the official client but are not an abuse-proof aggregate quota against a deliberately modified authenticated client.
- **BREAKING**: cross-account `repairPersonalUsage(uid)` is removed; a signed-in user can repair only their own account.

## Capabilities

### New Capabilities

- `direct-personal-library-persistence`: Direct Firestore/Storage persistence, synchronization metadata, owner transactions, quotas, texture lifecycle, repair behavior, and removal of callable functions.

### Modified Capabilities

- `openid-admin-upload`: Resolve the signed-in role through Firestore without an HTTP role endpoint while retaining admin-only public publication.

## Impact

- `src/personalLibraryRemote.ts`, `src/authService.ts`, `src/firebaseConfig.ts`, personal preset/texture synchronizers, quota guards, and guest-import persistence.
- `firestore.rules`, `storage.rules`, Firebase environment examples, deployment configuration, and Firebase SDK mocks/tests.
- `functions/index.js` and the `firebase-functions` runtime dependency are removed from deployment; Admin SDK scripts and their pure validation helpers remain local.
- Existing Firestore documents and Storage object paths remain unchanged, so no user-data rewrite is required.
