# ADR-001: Registry JSON is the authority

## Status

Accepted.

## Context

The project previously mixed normalized data, a website, API handlers, CLI code, Omarchy-specific integration, and import scripts across repositories. That made ownership unclear and encouraged copied indexes.

## Decision

Use a pnpm monorepo. Keep normalized JSON and its recursive read contract in `packages/registry`. Mount API handlers from `packages/api`, consume them through `packages/sdk`, and keep every local or visual integration in its own package. All proposed writes pass through `packages/submission-harness`.

## Consequences

The registry can be used from disk, HTTP, the CLI, or the site without translation. Package boundaries become enforceable. Deployment must include registry JSON in the server trace. Provider credentials and runtime state cannot be committed to the data tree.
