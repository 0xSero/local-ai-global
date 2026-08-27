# Local AI Global

One monorepo for discovering local hardware, resolving compatible model artifacts, launching validated inference recipes, and preserving the evidence behind every recommendation.

## Source of truth

[`packages/registry`](packages/registry) is the only data authority. It contains the normalized JSON tree, JSON Schemas, TypeScript types, and deterministic read/query library. No other package owns or copies registry records.

```text
packages/registry
  index.json
  hardware/<id>.json
  model/<id>.json
  model-instance/<id>.json
  recipe/<id>.json
  speed-sweeps/<id>.json
  price/<product-id>/<region>.json
```

Everything else is a consumer or controlled contributor:

```text
packages/
  registry/            normalized JSON and read contract
  api/                 read-only HTTP representation
  sdk/                 typed client and provider integrations
  cli/                 local hardware detection and terminal workflow
  site/                registry browser and project wiki
  omarchy-plugin/      Omarchy-specific UI and lifecycle adapter
  submission-harness/  import, normalization, validation, and review
```

## Start

```bash
pnpm install
pnpm validate
pnpm test
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The wiki is at `/docs`, the registry browser is at `/`, and the read-only API is at `/api/v1`.

## Growth rule

New data enters through `submission-harness`, passes schema and reference validation, and lands in `registry` as a reviewable diff. The API, SDK, CLI, site, and Omarchy plugin never mutate registry data. See [`docs/architecture/ownership.md`](docs/architecture/ownership.md) and [`docs/guides/growing-the-registry.md`](docs/guides/growing-the-registry.md).
