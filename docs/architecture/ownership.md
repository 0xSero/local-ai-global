# Package ownership

## Rule

`0xSero/local-ai-registry` is the only repository that owns normalized Local AI data. This repository pins it at `packages/registry/source`; every package reads through the local adapter without copying records.

| Package | Owns | Must not own |
|---|---|---|
| `registry` | Pinned registry reference and deterministic queries | Registry record copies, user state, credentials, running services |
| `api` | HTTP representation, pagination, filters, cache headers | Registry copies, mutation routes |
| `sdk` | Typed client, provider adapters | Global credentials, hidden persistence |
| `cli` | Hardware detection, TUI, local cache and runtime actions | Curated registry records |
| `site` | Registry browser and wiki | A second index or UI-only data model |
| `omarchy-plugin` | Omarchy UI, lifecycle, agent configuration | Omarchy-specific registry fork |
| `submission-harness` | Imports, normalization, validation, review output | Direct unattended merges |

Dependencies point inward: presentation packages depend on SDK/API/registry contracts; the registry depends on none of them.
