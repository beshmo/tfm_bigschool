# ADR-0006: Use Containerized Stateless Deployment

## Status

Accepted

## Context

The project needs a local deployment path and a Kubernetes reference deployment. The MVP has no external stateful dependencies and stores data in memory only.

## Decision

Package the API and admin frontend as containers and deploy them as stateless services.

Docker Compose starts one API container and one admin frontend container for local use. Kubernetes manifests deploy into the `okvns` namespace using ConfigMaps for non-sensitive runtime configuration.

Services write logs to stdout/stderr, expose network ports, and use health/readiness probes where applicable.

## Consequences

- Local and Kubernetes deployment boundaries are explicit.
- Runtime configuration stays outside the image.
- Stateless replicas are straightforward, but each API process has independent in-memory state.
- Persistent volumes, databases, queues, Redis, and Secrets are intentionally excluded from the MVP.
