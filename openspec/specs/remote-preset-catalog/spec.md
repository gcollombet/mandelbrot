# remote-preset-catalog Specification

## Purpose
Defines the client-side data layer, IndexedDB persistence, metadata-first synchronization, and access control policies for shared presets, palettes, and textures in the Firebase catalog.

## Requirements

### Requirement: Catalog types
The system SHALL support remote catalog synchronization for complete presets, palette presets, stop presets, and textures.

#### Scenario: All catalog types are eligible for sync
- **WHEN** the application performs remote catalog synchronization
- **THEN** it evaluates complete presets, palette presets, stop presets, and textures independently

### Requirement: IndexedDB catalog storage
The system SHALL store complete presets, palette presets, stop presets, and textures in local IndexedDB stores.

#### Scenario: Stop presets are migrated to IndexedDB
- **WHEN** stop presets exist in legacy localStorage
- **THEN** the system migrates them to the local IndexedDB stop preset store with GUIDs and removes reliance on localStorage for stop preset reads

### Requirement: GUID identity
Every catalog entry SHALL have a GUID and the GUID SHALL be the stable identity for local storage, Firebase storage, synchronization, and cross-entry references.

#### Scenario: Local entry receives a GUID
- **WHEN** an existing local catalog entry does not have a GUID
- **THEN** the system assigns and persists a new GUID for that entry

#### Scenario: Remote entry is imported
- **WHEN** a remote catalog entry is imported locally
- **THEN** the local entry keeps the same GUID as the remote entry

#### Scenario: Entry is matched during synchronization
- **WHEN** a remote catalog entry has the same GUID as a local catalog entry
- **THEN** the system treats them as the same catalog entry regardless of display name

### Requirement: Unique names per catalog type
The system SHALL require every catalog entry to have a non-empty name and SHALL keep names unique per catalog type in local storage.

#### Scenario: Complete preset has no explicit name
- **WHEN** a complete preset is created without an explicit name
- **THEN** the system assigns a date-based default name

#### Scenario: Texture has no explicit name
- **WHEN** a texture is imported without an explicit name
- **THEN** the system assigns the texture file name without extension as the default name

#### Scenario: Palette or stop preset is unnamed
- **WHEN** a palette preset or stop preset is created without a name
- **THEN** the system rejects the creation until a name is provided

#### Scenario: Remote name conflicts locally
- **WHEN** a remote entry is imported and another local entry of the same type already uses its name with a different GUID
- **THEN** the system assigns a unique local display name to the imported entry without changing its GUID

### Requirement: Local display name preservation
The system SHALL treat local display names as local catalog state and SHALL preserve local display renames across remote synchronization.

#### Scenario: User renames conflict-resolved remote entry
- **WHEN** a remote-origin entry was imported with a conflict-resolved display name
- **AND** the user renames that local display name
- **THEN** later synchronization for the same GUID preserves the local display name

#### Scenario: Remote payload changes after local rename
- **WHEN** a remote-origin entry has a local display name different from the remote published name
- **AND** the remote payload for the same GUID is newer
- **THEN** the system updates the payload while preserving the local display name

### Requirement: Anonymous catalog reads
The system SHALL allow remote catalog metadata and entries to be read without requiring the user to sign in.

#### Scenario: Unsigned user receives shared presets
- **WHEN** an unsigned user loads the page and remote catalog data is newer than local data
- **THEN** the system fetches the relevant remote catalog entries without requiring authentication

### Requirement: Metadata-first synchronization
The system SHALL fetch remote metadata before fetching full catalog entry payloads or texture blobs, and SHALL use metadata to decide which entries need payload downloads.

#### Scenario: Metadata list is fetched
- **WHEN** the application performs remote catalog synchronization
- **THEN** it fetches metadata for each catalog type before fetching full entries

#### Scenario: Unchanged entry is skipped
- **WHEN** a local entry has the same GUID as remote metadata and its `lastUpdated` value is equal to or later than the remote `lastUpdated` value
- **THEN** the system does not fetch the full remote entry payload for that entry

#### Scenario: Missing entry is fetched
- **WHEN** remote metadata contains a GUID that does not exist locally
- **THEN** the system fetches the full remote entry payload for that GUID

#### Scenario: Changed entry is fetched
- **WHEN** remote metadata contains a GUID that exists locally and has a newer `lastUpdated` value
- **THEN** the system fetches the full remote entry payload for that GUID

### Requirement: Per-entry freshness check
The system SHALL use each catalog entry's GUID and `lastUpdated` value as the canonical synchronization freshness check.

#### Scenario: Remote entry is newer
- **WHEN** a remote entry has a `lastUpdated` value later than the local entry with the same GUID
- **THEN** the system imports the newer remote-managed fields for that entry

#### Scenario: Remote entry was never synchronized
- **WHEN** remote metadata contains a GUID that has never been stored locally
- **THEN** the system imports that entry

#### Scenario: Local entry is current
- **WHEN** the local entry for a GUID has a `lastUpdated` value equal to or later than the remote metadata for that GUID
- **THEN** the system does not import that entry

### Requirement: Page-load-only version check
The system SHALL check for newer remote catalog versions only during page load.

#### Scenario: Remote catalog changes during session
- **WHEN** the remote catalog changes after the application has completed its page-load synchronization
- **THEN** the system does not fetch the new version until the page is loaded again

### Requirement: Local-first catalog consumption
The system SHALL persist fetched remote catalog entries into the existing local browser stores and SHALL continue serving preset and texture lists from local storage after synchronization.

#### Scenario: Remote entries are imported
- **WHEN** remote entries are fetched successfully for a catalog type
- **THEN** the system saves those entries into the local store used by that catalog type

#### Scenario: UI renders after synchronization
- **WHEN** the UI displays complete presets, palette presets, stop presets, or textures
- **THEN** it reads entries from local browser storage rather than directly from Firebase

### Requirement: Favorites for every catalog type
The system SHALL support local favorites for complete presets, palette presets, stop presets, and textures.

#### Scenario: Remote entry is favorited locally
- **WHEN** a user marks a remote-origin complete preset, palette preset, stop preset, or texture as favorite
- **THEN** the favorite value is stored locally and is not written to Firebase

#### Scenario: Remote entry is updated after favorite
- **WHEN** synchronization updates a remote-origin entry that the user marked as favorite locally
- **THEN** the system preserves the local favorite value

### Requirement: GUID-based cross-entry references
The system SHALL resolve cross-entry references by GUID when a GUID reference is available, and SHALL use name-based references only as legacy fallback.

#### Scenario: Preset references renamed imported texture
- **WHEN** a complete preset references a texture by GUID
- **AND** the referenced texture was imported locally under a different display name because of a name conflict
- **THEN** applying the complete preset uses the texture with the referenced GUID

#### Scenario: Legacy preset references texture by name
- **WHEN** a complete preset has no texture GUID reference but has a texture name reference
- **THEN** the system resolves the texture by name as a fallback

#### Scenario: Preset references renamed imported skybox
- **WHEN** a complete preset references an environment texture by GUID
- **AND** the referenced texture was imported locally under a different display name because of a name conflict
- **THEN** applying the complete preset uses the environment texture with the referenced GUID

### Requirement: Remote-origin edit restrictions
The system SHALL prevent non-admin users from modifying remote-managed fields of remote-origin catalog entries while allowing local-only fields and local variants.

#### Scenario: Non-admin favorites remote entry
- **WHEN** a non-admin user marks a remote-origin entry as favorite
- **THEN** the system allows the change because favorites are local-only

#### Scenario: Non-admin renames remote entry locally
- **WHEN** a non-admin user renames a remote-origin entry in local storage
- **THEN** the system allows the local display name change without writing it to Firebase

#### Scenario: Non-admin attempts to edit remote-managed payload
- **WHEN** a non-admin user attempts to overwrite the payload of a remote-origin catalog entry
- **THEN** the system prevents the overwrite and requires creating a local variant with a new GUID instead

### Requirement: Remote-origin local deletion restrictions
The system SHALL prevent non-admin users from deleting remote-origin catalog entries from the local catalog.

#### Scenario: Non-admin attempts to delete remote-origin entry
- **WHEN** a non-admin user attempts to delete a remote-origin complete preset, palette preset, stop preset, or texture
- **THEN** the system prevents the deletion

#### Scenario: Non-admin deletes local-only entry
- **WHEN** a non-admin user deletes a local-only catalog entry
- **THEN** the system deletes that local entry

### Requirement: Merge safety
The system SHALL avoid duplicating previously imported remote entries and SHALL preserve local user state when updating remote-origin entries.

#### Scenario: Previously imported remote entry is seen again
- **WHEN** synchronization receives a remote entry that already exists locally by GUID
- **THEN** the system updates the remote-managed fields of that local entry instead of creating a duplicate

#### Scenario: Local favorite exists on remote-origin entry
- **WHEN** synchronization updates a remote-origin entry that the user marked as favorite locally
- **THEN** the system preserves the local favorite value

#### Scenario: User-created local entry collides by display name
- **WHEN** synchronization receives a remote entry whose display name matches a user-created local entry with a different GUID
- **THEN** the system preserves the user-created local entry and imports the remote entry with a unique local display name

### Requirement: Remote deletion retention
The system SHALL NOT delete local entries solely because their GUIDs are absent from remote metadata.

#### Scenario: Remote entry is removed from Firebase
- **WHEN** a previously synchronized entry no longer appears in remote metadata
- **THEN** the system keeps the local entry

### Requirement: Best-effort synchronization
The system SHALL continue loading local catalog data if remote metadata or entry fetching fails.

#### Scenario: Firebase is unavailable
- **WHEN** the page loads and the remote catalog cannot be reached
- **THEN** the system logs or surfaces a non-blocking sync failure and continues using local stored entries
