# Local AI Tools

One monorepo for discovering local hardware, resolving compatible model artifacts, launching validated inference recipes, and preserving the evidence behind every recommendation.

## Source of truth

[`local-ai-registry`](https://github.com/0xSero/local-ai-registry) is the only data authority. This repository pins it as a Git submodule at [`packages/registry/source`](packages/registry/source); it does not copy registry records.

```text
packages/registry
  source/               pinned local-ai-registry submodule
    registry/            normalized JSON, schemas, and types
  src/                   deterministic read/query adapter
```

Everything else is a consumer or controlled contributor:

```text
packages/
  registry/            pinned registry reference and read adapter
  api/                 read-only HTTP representation
  sdk/                 typed client and provider integrations
  cli/                 local hardware detection and terminal workflow
  site/                registry browser and project wiki
  omarchy-plugin/      Omarchy-specific UI and lifecycle adapter
  submission-harness/  import, normalization, validation, and review
```

## Start

```bash
git submodule update --init --recursive
pnpm install
pnpm validate
pnpm test
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The wiki is at `/docs`, the registry browser is at `/`, and the read-only API is at `/api/v1`.

The source repository is [github.com/0xSero/local-ai-tools](https://github.com/0xSero/local-ai-tools).

## Deployment

Deployments must initialize the pinned submodule before building `packages/site`. Generated Vercel state and environment files remain local.

## Growth rule

New data is committed to `local-ai-registry`, then this repository advances its pinned submodule commit. The API, SDK, CLI, site, and Omarchy plugin never own or mutate registry data. See [`CONTRIBUTING.md`](CONTRIBUTING.md) and [`docs/architecture/ownership.md`](docs/architecture/ownership.md).
