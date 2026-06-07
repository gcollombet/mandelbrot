## ADDED Requirements

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
