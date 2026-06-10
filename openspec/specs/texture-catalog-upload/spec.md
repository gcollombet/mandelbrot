# texture-catalog-upload Specification

## Purpose
Defines the client-side asset normalization, local storage sync, and shared catalog upload behaviors for textures, environment maps, and presets.

## Requirements

### Requirement: Upload built-in textures
The system SHALL allow admin users to upload built-in textures directly to the shared Firebase Storage and Firestore catalog.

#### Scenario: Successful upload of a built-in texture
- **WHEN** an admin user clicks the upload button next to a built-in texture in the settings panel
- **THEN** the system fetches the bundled built-in asset file, converts it into a Blob, uploads it to Firebase Storage under `catalog/texture/<guid>`, creates the Firestore record under `catalog/texture/entries/<guid>`, and saves the upload metadata (remote catalog status) in the local IndexedDB.

### Requirement: Sync built-in texture metadata
The system SHALL retrieve and merge local IndexedDB stored metadata (such as favorite status and remote catalog state) for built-in textures when loading the texture library.

#### Scenario: Listing the texture library with synced status
- **WHEN** the texture library is queried via `ensureTextureLibrary`
- **THEN** the system merges each built-in texture with its corresponding saved record from the local IndexedDB to retrieve its `favorite` and `remote` status, enabling the UI to display the favorited status and upload validation checkmarks for built-in textures.

### Requirement: Upload animation presets to shared catalog
The system SHALL allow admin users to upload animation presets to the shared Firebase catalog as first-class `animationPreset` entries.

#### Scenario: Successful animation preset upload
- **WHEN** an admin user uploads an animation preset
- **THEN** the system writes a Firestore catalog entry under the animation preset catalog type and records remote catalog status in local IndexedDB

#### Scenario: Animation preset name conflict
- **WHEN** an admin user uploads an animation preset whose name conflicts with an existing remote animation preset owned by another GUID
- **THEN** the system blocks overwrite and presents the existing catalog conflict behavior

### Requirement: Sync remote animation presets
The system SHALL sync remote animation preset metadata and payloads into the local animation preset store.

#### Scenario: Remote animation preset is newer
- **WHEN** the shared catalog contains an animation preset with a newer `lastUpdated` value than the local preset with the same GUID
- **THEN** the system fetches the remote entry and updates the local animation preset record

#### Scenario: Local animation preset is current
- **WHEN** the local animation preset has the same or newer `lastUpdated` value than the remote metadata
- **THEN** the system does not overwrite the local preset during sync

### Requirement: Normalize imported texture assets
The system SHALL convert every user-imported tile texture and skybox texture into a WebP image before saving the texture blob locally.

#### Scenario: Importing a PNG texture
- **WHEN** a user imports a decodable PNG texture file
- **THEN** the system saves the texture blob with WebP image content instead of storing the original PNG file

#### Scenario: Importing a JPEG texture
- **WHEN** a user imports a decodable JPEG texture file
- **THEN** the system saves the texture blob with WebP image content instead of storing the original JPEG file

### Requirement: Limit imported texture dimensions
The system SHALL resize imported texture images proportionally so the saved texture blob has neither width nor height greater than 2048 pixels.

#### Scenario: Importing an oversized landscape texture
- **WHEN** a user imports a decodable image whose width is greater than 2048 pixels
- **THEN** the system saves a resized texture whose width is 2048 pixels or less and whose aspect ratio matches the source image

#### Scenario: Importing an oversized portrait texture
- **WHEN** a user imports a decodable image whose height is greater than 2048 pixels
- **THEN** the system saves a resized texture whose height is 2048 pixels or less and whose aspect ratio matches the source image

#### Scenario: Importing a texture already within the size limit
- **WHEN** a user imports a decodable image whose width and height are both 2048 pixels or less
- **THEN** the system saves the texture without upscaling either dimension

### Requirement: Generate previews from normalized texture assets
The system SHALL generate texture thumbnails from the normalized WebP texture asset rather than from the original imported file.

#### Scenario: Thumbnail after oversized import
- **WHEN** a user imports an oversized decodable image
- **THEN** the texture dropdown thumbnail is generated from the resized WebP asset saved for that texture

### Requirement: Upload normalized texture assets
The system SHALL upload the locally saved normalized texture blob to the shared texture catalog.

#### Scenario: Uploading an imported texture
- **WHEN** an admin uploads a user-imported texture to the shared catalog
- **THEN** the uploaded Firebase Storage object uses the normalized WebP texture blob with neither side greater than 2048 pixels

#### Scenario: Upload metadata reflects normalized blob
- **WHEN** an admin uploads a user-imported texture to the shared catalog
- **THEN** the catalog metadata records the uploaded blob content type and size for the normalized WebP payload

### Requirement: Reject unsupported texture normalization
The system SHALL fail the import without saving the original image when the selected file cannot be decoded or cannot be encoded as WebP.

#### Scenario: WebP encoding fails
- **WHEN** a user imports an image file and the browser fails to produce a WebP blob
- **THEN** the system reports an import failure and does not save the original image blob as a fallback
