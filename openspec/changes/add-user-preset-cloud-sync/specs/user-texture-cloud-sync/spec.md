## ADDED Requirements

### Requirement: Personal texture cloud persistence
The system SHALL synchronize authenticated users' imported tile and skybox texture metadata to an owner-scoped Firestore path and their normalized WebP blobs to an owner-scoped Firebase Storage path while using IndexedDB as the local cache.

#### Scenario: Authenticated user imports a texture
- **WHEN** an authenticated user successfully imports and normalizes a texture
- **THEN** the system caches the normalized blob locally and persists its metadata and blob under the authenticated user's Firebase scope

#### Scenario: User opens another device
- **WHEN** an authenticated user's preset references a personal texture that is absent from the device cache but present in the user's cloud library
- **THEN** the system fetches and caches the owner-scoped texture before applying it when possible

#### Scenario: Personal texture download fails
- **WHEN** a referenced personal texture cannot be downloaded or decoded
- **THEN** the system retains the GUID reference, uses a safe fallback texture, and indicates that the personal texture is unavailable

### Requirement: Personal texture quota
The system SHALL enforce a combined maximum of 10 personal imported tile and skybox textures per authenticated account.

#### Scenario: User imports below the texture quota
- **WHEN** the account contains fewer than 10 personal textures and a normalized texture is ready to persist
- **THEN** the trusted persistence path accepts the new texture and increments texture usage

#### Scenario: User reaches the texture quota
- **WHEN** the account contains 10 personal textures and the user attempts to add another GUID
- **THEN** the system rejects the new texture and explains that an existing personal texture must be deleted first

#### Scenario: Existing texture is replaced
- **WHEN** the user replaces the content associated with an existing personal texture GUID
- **THEN** the system accepts the replacement without consuming another texture slot

#### Scenario: Texture deletion succeeds
- **WHEN** the trusted persistence path deletes a personal texture's metadata and blob
- **THEN** texture usage decreases and the slot becomes available

#### Scenario: Public textures are displayed
- **WHEN** public catalog textures are available to the user
- **THEN** those public blobs do not count toward the user's 10 personal texture limit

### Requirement: Personal texture normalization
The system SHALL normalize every guest or authenticated user image import to a WebP blob, preserve its aspect ratio, avoid upscaling, and ensure neither saved dimension exceeds 1024 pixels before the blob enters local or remote personal storage.

#### Scenario: Oversized landscape image is imported
- **WHEN** a user imports a decodable image wider than 1024 pixels
- **THEN** the saved WebP has width at most 1024 pixels and proportional height

#### Scenario: Oversized portrait image is imported
- **WHEN** a user imports a decodable image taller than 1024 pixels
- **THEN** the saved WebP has height at most 1024 pixels and proportional width

#### Scenario: Image is already within bounds
- **WHEN** a user imports a decodable image whose dimensions do not exceed 1024 by 1024 pixels
- **THEN** the system encodes it as WebP without increasing either dimension

#### Scenario: WebP conversion fails
- **WHEN** the browser cannot decode the source or produce a WebP blob
- **THEN** the system rejects the import and saves neither the original nor a partial personal texture

### Requirement: Owner-only texture access
The system SHALL authorize personal texture metadata and blob access only for the authenticated owner, while preserving the separate anonymous-read/admin-write policy for public catalog textures.

#### Scenario: Owner accesses personal texture
- **WHEN** an authenticated request uses the UID that owns a personal texture
- **THEN** Firebase permits the authorized personal read or quota-checked write

#### Scenario: Another account accesses personal texture
- **WHEN** an authenticated user attempts to read or modify a texture owned by a different UID
- **THEN** Firebase rejects the operation

#### Scenario: Non-admin attempts public publication
- **WHEN** an ordinary authenticated user attempts to write a personal texture into the public catalog path
- **THEN** Firebase rejects the public catalog write

### Requirement: Guest texture copies survive account import
The system SHALL copy guest textures during an accepted whole-library import without deleting or relabeling the guest source blobs.

#### Scenario: Guest textures fit in account quota
- **WHEN** a user accepts whole-library import and every missing guest texture fits within the remaining texture quota
- **THEN** all missing guest textures are normalized as needed and copied to the account using their stable GUIDs

#### Scenario: User signs out after texture import
- **WHEN** the user signs out after a successful guest-library import
- **THEN** the original guest textures remain available in the guest scope
