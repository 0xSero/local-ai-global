# ADR-001: Registry JSON is the authority

## Status

Accepted.

## Context

The project previously mixed normalized data, a website, API handlers, CLI code, Omarchy-specific integration, and import scripts across repositories. That made ownership unclear and encouraged copied indexes.

## Decision

Keep normalized JSON and schemas only in `0xSero/local-ai-registry`. Pin that repository as the `packages/registry/source` Git submodule and keep only the recursive read adapter in this pnpm monorepo. Mount API handlers from `packages/api`, consume them through `packages/sdk`, and keep every local or visual integration in its own package.

## Consequences

The registry has one Git history and can be used from disk, HTTP, the CLI, or the site without translation. Clones and deployments must initialize the pinned submodule. Registry changes land upstream first; this repository advances the reference only after validation.
