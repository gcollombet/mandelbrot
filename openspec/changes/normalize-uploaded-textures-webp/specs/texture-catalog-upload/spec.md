## ADDED Requirements

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
