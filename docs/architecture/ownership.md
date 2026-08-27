# Package ownership

## Rule

`packages/registry` is the only package that owns normalized Local AI data. Every other package reads that contract or proposes changes through the submission harness.

| Package | Owns | Must not own |
|---|---|---|
| `registry` | JSON records, schemas, types, deterministic queries | User state, credentials, running services |
| `api` | HTTP representation, pagination, filters, cache headers | Registry copies, mutation routes |
| `sdk` | Typed client, provider adapters | Global credentials, hidden persistence |
| `cli` | Hardware detection, TUI, local cache and runtime actions | Curated registry records |
| `site` | Registry browser and wiki | A second index or UI-only data model |
| `omarchy-plugin` | Omarchy UI, lifecycle, agent configuration | Omarchy-specific registry fork |
| `submission-harness` | Imports, normalization, validation, review output | Direct unattended merges |

Dependencies point inward: presentation packages depend on SDK/API/registry contracts; the registry depends on none of them.
