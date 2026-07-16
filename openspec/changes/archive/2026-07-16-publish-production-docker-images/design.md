## Context

OKVNS already ships production Dockerfiles for the API and admin frontend, and the reference Kubernetes manifests consume those two production assets. The current CI workflow validates source quality, tests, and Playwright E2E flows, but it does not verify or publish production container images.

The user has a public Docker Hub repository, `beshmo/okvns`, and wants CI to push images that can be pulled with commands such as `docker push beshmo/okvns:tagname`. Because a single repository will hold multiple assets, tags must identify both the asset and version.

## Goals / Non-Goals

**Goals:**

- Build production Docker images for `apps/api/Dockerfile` and `apps/admin-web/Dockerfile` in CI.
- Push images to Docker Hub from trusted refs.
- Build images for pull requests without pushing to Docker Hub.
- Use asset-prefixed tags such as `okvns-api-*` and `okvns-admin-web-*` under `beshmo/okvns`.
- Document required Docker Hub secrets and published image naming.

**Non-Goals:**

- Do not publish the demo web image as part of the production image flow.
- Do not deploy Kubernetes workloads from CI.
- Do not introduce a new container registry or migrate image references automatically.
- Do not commit Docker Hub credentials or repository-specific tokens.

## Decisions

1. Publish only production deployment assets.

   The matrix will include API and admin web only. The demo web Dockerfile remains useful for demo Compose workflows, but it is not referenced by the production Kubernetes manifests or deployment docs.

   Alternative considered: include every Dockerfile. Rejected because it would blur production and demo artifact ownership.

2. Use a single Docker Hub repository with asset-prefixed tags.

   Images will use the repository `beshmo/okvns` with tags such as `okvns-api-sha-<short-sha>`, `okvns-api-main`, `okvns-admin-web-sha-<short-sha>`, and `okvns-admin-web-main`. Release tags can publish semver-style asset tags such as `okvns-api-1.2.3` and `okvns-admin-web-1.2.3`.

   Alternative considered: create separate Docker Hub repositories such as `beshmo/okvns-api` and `beshmo/okvns-admin-web`. Rejected for this change because the user already specified one public repository and asset-specific tag names.

3. Build on pull requests, push on trusted refs.

   Pull requests should validate that both images can be built, but they should not receive Docker Hub credentials or push images. Push events to `main` and version tags are trusted publishing paths.

   Alternative considered: push images for pull requests with PR tags. Rejected because it publishes unmerged code and requires exposing credentials to more workflow contexts.

4. Use Docker-maintained GitHub Actions.

   The CI job should use `docker/setup-buildx-action`, `docker/login-action`, `docker/metadata-action`, and `docker/build-push-action` so tagging, caching, labels, and pushes follow maintained Docker action behavior.

   Alternative considered: shelling out to `docker build` and `docker push`. Rejected because manual tagging and cache handling is more error-prone and duplicates action functionality.

5. Store Docker Hub credentials as GitHub secrets.

   CI should read `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`, where the token is a Docker Hub access token. If publishing needs stronger control later, these secrets can move behind a protected GitHub Environment.

   Alternative considered: use a Docker Hub password. Rejected because an access token is narrower and easier to revoke.

## Risks / Trade-offs

- Tag collisions in a single repository -> Prefix every tag with the asset name.
- `main` tags are mutable -> Also publish immutable SHA tags for traceability.
- Docker Hub credentials could be mis-scoped -> Use a Docker Hub access token stored as a GitHub secret, and consider protected environments for release-sensitive publishing.
- CI runtime increases due to image builds -> Use Buildx cache with GitHub Actions cache storage.
- Kubernetes manifests may still reference local image names -> Document Docker Hub image names first; manifest updates can be handled separately if deployment automation needs them.
