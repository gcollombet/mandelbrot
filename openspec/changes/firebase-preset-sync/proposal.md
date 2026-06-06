## Why

The application currently ships default presets locally and stores user additions only in browser storage, so new shared presets, palettes, stop presets, and textures require a code release or manual user action. A Firebase-backed preset catalog will let the app refresh shared defaults at page load while preserving the existing local-first behavior.

## What Changes

- Add a Firebase-backed remote catalog for complete presets, palette presets, stop presets, and textures.
- Allow anonymous read access to the remote catalog so users can receive shared defaults without signing in.
- Track a per-type remote `lastUpdated` value and a per-type local sync timestamp, then fetch remote entries only when the remote type is newer or has never been fetched locally.
- Merge fetched remote entries into the existing local preset stores so the app continues reading presets from local browser storage after sync.
- Add Google OpenID Connect sign-in and sign-out controls.
- Add role discovery through an endpoint that returns `guest` or `admin` for the signed-in user.
- Show an upload icon next to the existing favorite heart only for admins, for all supported preset and texture types.
- Allow admins to upload the current complete preset, palette preset, stop preset, or texture into the Firebase catalog, creating a new remote version for that type.
- Check for new remote versions only during page load, not continuously during the session.

## Capabilities

### New Capabilities

- `remote-preset-catalog`: Defines remote catalog reads, per-type version checks, local merge behavior, and support for complete presets, palette presets, stop presets, and textures.
- `openid-admin-upload`: Defines Google OpenID Connect authentication, role lookup, admin-only upload visibility, and remote version creation for uploaded catalog entries.

### Modified Capabilities


## Impact

- Affects local storage modules for presets, palettes, stop presets, and textures.
- Affects settings/editor UI where presets, favorites, palettes, stop presets, and texture controls are shown.
- Adds Firebase client configuration and a role/upload API integration.
- Adds a dependency on Firebase client SDKs or a small service wrapper around Firebase/Auth APIs.
- Requires careful merge semantics so remote catalog additions do not overwrite user favorites, renamed local content, or user-created local entries unintentionally.
