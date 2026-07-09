# ADR-0003: Use In-Memory Storage for the MVP

## Status

Accepted

## Context

The first OKVNS implementation is an MVP for organizing UTF-8 key-value entries inside namespaces. It needs to demonstrate the domain model, REST API, YAML import/export, admin UI, and deployment shape without committing to a database or operational data model too early.

## Decision

Use an in-memory repository for the MVP.

State lives in the API process and is lost when the process or pod restarts. The MVP does not include a database, Redis, queue, filesystem-backed persistence, persistent volume, authentication, authorization, or Kubernetes Secrets.

## Consequences

- Local development and tests remain simple.
- Deployments are stateless and easy to restart.
- The product must not imply data durability.
- Any future persistent storage requires a new design/spec change and new adapter-level tests.
