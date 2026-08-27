# local.ai source integration

This guide records the read boundary observed on `local.ai` and how to turn its data into registry candidates without overstating what the source proves.

## Discovery API

The site exposes a signed-in catalog at:

```text
GET https://local.ai/api/search/catalog
```

The response is an array of discovery rows:

```json
{
  "href": "/models/agents-a1",
  "label": "Agents A1",
  "group": "Models",
  "brand": "InternScience",
  "detail": "3 measured variations",
  "keywords": ["Agents A1", "InternScience/Agents-A1-Q4_K_M-GGUF"]
}
```

The catalog is useful for enumerating model routes, hardware routes, source hardware keys, display names, and candidate Hugging Face strings. It is not a recipe API. It does not return the full engine configuration, launch command, acceptance status, or measurement rows.

The endpoint currently requires the user's normal site session. Do not copy cookies or tokens into scripts, logs, fixtures, or registry records. If the endpoint redirects to the access page, stop and use an authenticated browser or an approved read-only publication instead of bypassing access controls.

## Model detail pages

Open each catalog `href`, such as:

```text
https://local.ai/models/agents-a1
```

The server-rendered Quick Start section can provide:

- Exact model variation and artifact name
- Hugging Face repository or file reference
- Compatible hardware target
- Weight size
- Inference engine and build/version
- Context ceiling
- Exact launch command
- Measured hardware results

Capture the route URL and observation time. Preserve the command as source evidence. A Quick Start command becomes a candidate `reference` launch unless it has been independently converted into the repository's full launch contract and passed acceptance.

Do not parse a display label into a Hugging Face identity. Confirm the exact `owner/repo` link before using `huggingface.link_type: "repository"`.

## Bulk publication path

The stable ingestion path is the read-only Postgres publication exported as `manifest.json`, `pg_read_models.jsonl`, and `pg_read_speed_runs.jsonl`.

```bash
python3 packages/submission-harness/scripts/import_postgres_publication.py <snapshot> --root packages/registry
python3 packages/submission-harness/scripts/enrich_registry.py packages/registry
python3 packages/submission-harness/scripts/curate_registry.py packages/registry --index-only
pnpm validate
```

This path preserves run IDs, publication ID, hardware key, engine, context, concurrency, memory, and speed evidence. It emits candidate recipes because the publication does not establish a complete immutable launch contract.

## Hardware-key mapping

The importer accepts only explicit source-key mappings. Current mappings cover the published Apple configurations plus DGX Spark, RTX 3090, RTX 4090, RTX 5090, RTX 6000 Ada, and RTX PRO 6000.

Unmapped source keys are reported after import. Resolve each key to a distinct hardware record before adding it. In particular, do not silently merge Max-Q or power-limited results with a desktop/server record, and do not treat usable memory reported by a runtime as the product's marketed capacity without documenting the relationship.

## Convex boundary

The site also uses Convex for authenticated application features. The observed `hardwareConfigs:publishedRunnableModels` query is not the benchmark recipe catalog and can return an empty anonymous result. Do not build registry ingestion against it unless local.ai publishes and documents that contract.

## Promotion path

```text
catalog route
  → source-page or publication evidence
  → normalized model + model instance + hardware
  → candidate recipe + measured speed sweeps
  → reproducible launch contract
  → real model discovery and completion
  → measured acceptance
  → validated recipe
```

The distinction is intentional: local.ai can contribute broad compatibility and measurement coverage, while this registry owns the stronger claim that a validated recipe is reproducible and runnable.
