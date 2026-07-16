## ADDED Requirements

### Requirement: CI publishes production Docker images
The project SHALL provide a CI workflow that builds production Docker images for the API and admin frontend and publishes them to Docker Hub from trusted refs.

#### Scenario: Pull request validates production image builds without publishing
- **WHEN** CI runs for a pull request
- **THEN** it builds the API and admin frontend Docker images
- **THEN** it does not authenticate to Docker Hub or push images

#### Scenario: Main branch publishes asset-prefixed images
- **WHEN** CI runs for a push to the `main` branch
- **THEN** it builds and pushes the API image to `beshmo/okvns` with tags prefixed by `okvns-api-`
- **THEN** it builds and pushes the admin frontend image to `beshmo/okvns` with tags prefixed by `okvns-admin-web-`

#### Scenario: Version tags publish release image tags
- **WHEN** CI runs for a version tag
- **THEN** it publishes Docker Hub tags that include the version and the production asset name

#### Scenario: Docker Hub credentials are provided through secrets
- **WHEN** CI pushes production Docker images
- **THEN** it authenticates with Docker Hub credentials read from GitHub secrets
- **THEN** no Docker Hub credential value is committed to the repository
