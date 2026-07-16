## 1. CI Workflow

- [x] 1.1 Update `.github/workflows/ci.yml` to run on version tags as well as `main` pushes and pull requests.
- [x] 1.2 Add a Docker image matrix job for `apps/api/Dockerfile` and `apps/admin-web/Dockerfile` only.
- [x] 1.3 Configure Docker Buildx and BuildKit cache for the image builds.
- [x] 1.4 Configure Docker Hub login with `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` only when the workflow should publish images.
- [x] 1.5 Generate asset-prefixed Docker tags for `beshmo/okvns`, including branch, SHA, and version tag variants.
- [x] 1.6 Build images for pull requests without pushing, and push images only for trusted refs.

## 2. Documentation

- [x] 2.1 Update deployment documentation with Docker Hub image names and tag examples for API and admin web.
- [x] 2.2 Document required GitHub secrets and recommend Docker Hub access tokens for CI publishing.
- [x] 2.3 Document that the demo web image is not part of the production publishing flow.

## 3. Verification

- [x] 3.1 Run OpenSpec validation for `publish-production-docker-images`.
- [x] 3.2 Review the generated workflow for valid GitHub Actions expressions and event gating.
- [x] 3.3 Run a local Docker build for the API and admin web images if Docker is available.
