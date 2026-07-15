## MODIFIED Requirements

### Requirement: Limit imported texture dimensions
The system SHALL resize imported texture images proportionally so the saved texture blob has neither width nor height greater than 1024 pixels.

#### Scenario: Importing an oversized landscape texture
- **WHEN** a user imports a decodable image whose width is greater than 1024 pixels
- **THEN** the system saves a resized texture whose width is 1024 pixels or less and whose aspect ratio matches the source image

#### Scenario: Importing an oversized portrait texture
- **WHEN** a user imports a decodable image whose height is greater than 1024 pixels
- **THEN** the system saves a resized texture whose height is 1024 pixels or less and whose aspect ratio matches the source image

#### Scenario: Importing a texture already within the size limit
- **WHEN** a user imports a decodable image whose width and height are both 1024 pixels or less
- **THEN** the system saves the texture without upscaling either dimension

### Requirement: Upload normalized texture assets
The system SHALL upload only the locally saved normalized WebP texture blob to a personal or shared texture storage path.

#### Scenario: Uploading an imported personal texture
- **WHEN** an authenticated user persists a user-imported texture to personal cloud storage
- **THEN** the uploaded Firebase Storage object uses the normalized WebP blob with neither side greater than 1024 pixels

#### Scenario: Admin publishes an imported texture
- **WHEN** an admin uploads a user-imported texture to the shared catalog
- **THEN** the uploaded Firebase Storage object uses the normalized WebP texture blob with neither side greater than 1024 pixels

#### Scenario: Upload metadata reflects normalized blob
- **WHEN** a normalized texture is uploaded to personal or shared storage
- **THEN** its metadata records the uploaded blob content type, dimensions, and size for the normalized WebP payload
