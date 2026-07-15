## Why

Signed-in users currently keep their personal presets and imported textures only in browser IndexedDB, so their library is not durable across devices or browser resets. Firebase should become the durable source of truth for authenticated personal libraries while IndexedDB remains a responsive offline cache, without changing the existing admin-only publication workflow for shared defaults.

## What Changes

- Add automatic Firebase synchronization for authenticated users' personal preset records, including their thumbnails, with a combined limit of 400 personal presets per account.
- Add personal cloud storage for up to 10 imported tile or skybox textures per account; every imported texture is normalized to WebP and proportionally reduced so neither side exceeds 1024 pixels before local or remote persistence.
- Keep anonymous/guest libraries device-local and separate from authenticated caches. On sign-in, offer a single all-or-nothing import of the entire guest library into the account; declining leaves it unchanged, and signing out always restores the same guest library.
- Preserve public catalog entries as a separate read-only layer. Admins use the same personal-library mechanics as other users and retain the existing explicit upload buttons to publish defaults.
- Hide all file-based JSON import and export controls from guests and ordinary users; expose them only to admins as debug and maintenance tools. Image import remains available to non-admin users.
- Enforce personal-library ownership, quotas, and admin-only catalog publication on trusted Firebase paths rather than relying on UI visibility.
- **BREAKING**: Authenticated non-admin users become an explicit `user` role instead of being represented as `guest`.
- **BREAKING**: User-imported textures are normalized to a 1024-pixel maximum side instead of the current 2048-pixel maximum.

## Capabilities

### New Capabilities
- `user-library-cloud-sync`: Personal preset synchronization, IndexedDB cache behavior, the 400-preset account quota, cross-device reconciliation, and all-or-nothing guest-library import.
- `user-texture-cloud-sync`: Personal texture synchronization, the 10-texture account quota, WebP/1024 normalization, missing-texture behavior, and owner-scoped Firebase storage.
- `admin-json-debug-tools`: Admin-only visibility and behavior for every file-based JSON import/export command while preserving ordinary image import.

### Modified Capabilities
- `openid-admin-upload`: Distinguish unsigned guests, authenticated users, and admins while keeping catalog upload affordances and authorization admin-only.
- `texture-catalog-upload`: Reduce the normalization limit for all user-imported tile and skybox textures from 2048 pixels to 1024 pixels per side.

## Impact

- Authentication and authorization state in `src/authService.ts`, the viewer shell, settings panels, and child preset/debug panels.
- IndexedDB preset, palette, stop, texture-mapping, animation, and texture stores, which must become owner-scoped caches for authenticated users while retaining a separate guest scope.
- New personal-library Firestore collections, texture objects in Firebase Storage, quota/account-usage records, synchronization services, and stricter Firestore/Storage rules.
- Existing remote catalog synchronization remains separate but its local merge must coexist with personal records without copying public defaults into each user's quota.
- Guest-to-account import, sign-in/sign-out transitions, conflict handling, retry behavior, thumbnails, favorites, texture references, and quota UI require new integration and regression coverage.
