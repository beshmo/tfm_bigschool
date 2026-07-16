## Why

The repository already defines production Dockerfiles for the API and admin frontend, but CI only verifies source builds and tests. Publishing production images from trusted CI runs makes deployment artifacts reproducible and avoids relying on ad hoc local image builds.

## What Changes

- Add a CI Docker image publishing flow for production deployment assets only: `apps/api/Dockerfile` and `apps/admin-web/Dockerfile`.
- Build Docker images for pull requests without pushing them, so image build regressions are caught before merge.
- Push Docker images to the public Docker Hub repository `beshmo/okvns` from trusted refs.
- Tag images with asset-specific tag names using `okvns-api-*` and `okvns-admin-web-*` prefixes.
- Use GitHub secrets for Docker Hub authentication instead of committing credentials.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `deployment-foundation`: CI shall build and publish production deployment container images for the API and admin frontend.

## Impact

- `.github/workflows/ci.yml`: add a Docker image build/publish job.
- `docs/deployment.md`: document Docker Hub image names, tags, and required repository secrets.
- GitHub repository configuration: requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets, preferably backed by a Docker Hub access token.
