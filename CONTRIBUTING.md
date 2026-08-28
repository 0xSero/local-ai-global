# Contributing registry data

The registry accepts evidence, not recommendations. A contribution must identify an exact model artifact, an exact hardware target, the runtime configuration that connects them, and the source for every claimed fact.

## Where records go

Submit normalized records to the pinned `local-ai-registry` checkout, then commit them in that repository:

```text
packages/registry/source/registry/
  hardware/<hardware-id>.json
  model/<model-id>.json
  model-instance/<model-instance-id>.json
  recipe/<recipe-id>.json
  speed-sweeps/<sweep-id>.json
  price/<product-id>/<region>.json
```

Do not commit copied registry data to this tools repository. Its API, SDK, CLI, site, and Omarchy plugin read the pinned source tree.

## What to submit

Choose the smallest complete change:

| Record | Create it when | Required identity |
| --- | --- | --- |
| `hardware` | The accelerator or memory configuration does not exist | Vendor, product name, accelerator backend, memory capacity and type, bandwidth, CPU memory, sources |
| `model` | The canonical model family does not exist | Family, name, parameter counts, architecture, canonical URL or explicit unknown, Hugging Face identity, provenance |
| `model-instance` | The exact downloadable artifact, quantization, or fine-tune does not exist | Parent model ID, repository, immutable revision or explicit unknown, served name, weight format, precision, size, Hugging Face identity, provenance |
| `recipe` | The artifact has evidence on a hardware and engine combination | Model-instance ID, hardware ID and count, engine and version, launch contract, serving limits, capabilities, evidence references, provenance |
| `speed-sweeps` | A real run produced measurements | Recipe ID, measurement time, source, concurrency, context and output tokens, prefill, decode, TTFT, peak memory, sample count, status |
| `price` | A regional market observation is available | Product, region, currency, amount, condition, seller, source URL, observation time |

The JSON Schemas in [`packages/registry/source/registry/schema`](packages/registry/source/registry/schema) are authoritative. Use an existing record of the same type as the starting point; do not invent a second submission shape.

## Candidate versus validated

Use `"status": "candidate"` when a source shows compatibility or a command but the repository has not reproduced the complete launch and acceptance path. Candidate recipes use `"launch": { "kind": "reference", ... }` unless a real executable contract is available.

Use `"status": "validated"` only when all of the following are true:

- The model artifact is identified and its revision is pinned.
- A container launch uses an immutable `sha256` digest, or an equivalently reproducible native runtime is fully specified.
- The engine version, topology, ports, mounts, environment, arguments, context ceiling, and concurrency are explicit.
- Model discovery succeeds after launch.
- A real completion succeeds in the model's expected dialect.
- Measured evidence is attached through `speed_sweeps_ids`.

A listening port, a pulled image, a source-page command, or a claimed benchmark is not validation by itself.

## Unknown values

Do not guess. Keep nullable schema fields as `null` and add a matching entry in `facts` with a state and reason. Every fact carries provenance.

```json
{
  "facts": {
    "engine.version": {
      "state": "unknown",
      "reason": "runtime-detail-not-published",
      "provenance": {
        "sources": [
          {
            "kind": "source-page",
            "url": "https://example.com/record",
            "captured_at": "2026-08-27T12:00:00Z"
          }
        ],
        "captured_at": "2026-08-27T12:00:00Z"
      }
    }
  }
}
```

Use `known` only with a value. Use `unknown`, `unavailable`, or `not_applicable` with a reason. Keep the source URL and capture time precise enough for a reviewer to reproduce the observation.

## Hugging Face identity

Every model and model instance must contain a `huggingface` object.

- Use `link_type: "repository"` only for an exact `owner/repo` identity and a matching `https://huggingface.co/owner/repo` URL.
- Use `link_type: "search"` when the exact repository is not established.
- Do not turn a search result, filename, or display label into a claimed repository.
- Put the exact downloadable artifact on the model instance, not the canonical model record.

See [`docs/guides/huggingface-integration.md`](docs/guides/huggingface-integration.md) for the provider boundary.

## Importing a local.ai publication

The supported bulk input is a read-only publication directory containing:

```text
<snapshot>/
  manifest.json
  pg_read_models.jsonl
  pg_read_speed_runs.jsonl
```

Import it with:

```bash
python3 packages/submission-harness/scripts/import_postgres_publication.py <snapshot> --root packages/registry/source/registry
python3 packages/submission-harness/scripts/enrich_registry.py packages/registry/source/registry
python3 packages/submission-harness/scripts/curate_registry.py packages/registry/source/registry --index-only
```

The importer deliberately creates `candidate` recipes with reference launches. It preserves measured compatibility without promoting incomplete launch text to one-click Docker.

The importer prints every unsupported source hardware key. Add a mapping only after its exact registry hardware identity is established. Do not collapse distinct power profiles, memory capacities, or products to make the warning disappear.

See [`docs/guides/local-ai-source.md`](docs/guides/local-ai-source.md) for the browser/API boundary and manual source-page workflow.

## Adding one recipe manually

1. Find or add the hardware record.
2. Find or add the canonical model record.
3. Add the exact model-instance record with its Hugging Face identity.
4. Add a candidate recipe that references the model instance and hardware.
5. Add speed sweeps only when the measurements came from that exact recipe.
6. Rebuild the compact index.
7. Validate the entire graph.

Useful examples:

- Candidate recipe: [`packages/registry/source/registry/recipe/pg-internscience-agents-a1-q4-k-m-gguf-agents-a1-q4-k-m-gguf-q4km-apple-m5-pro-64gb-llama-cpp-7dc1c7154e.json`](packages/registry/source/registry/recipe/pg-internscience-agents-a1-q4-k-m-gguf-agents-a1-q4-k-m-gguf-q4km-apple-m5-pro-64gb-llama-cpp-7dc1c7154e.json)
- Validated Docker recipe: [`packages/registry/source/registry/recipe/qwen38-27b-nvfp4-rtxpro6000-sglang-tp1.json`](packages/registry/source/registry/recipe/qwen38-27b-nvfp4-rtxpro6000-sglang-tp1.json)
- Exact artifact: [`packages/registry/source/registry/model-instance/internscience-agents-a1-q4-k-m-gguf-agents-a1-q4-k-m-gguf--q4km.json`](packages/registry/source/registry/model-instance/internscience-agents-a1-q4-k-m-gguf-agents-a1-q4-k-m-gguf--q4km.json)

## Validate the contribution

```bash
python3 packages/submission-harness/scripts/curate_registry.py packages/registry/source/registry --index-only
pnpm validate
pnpm test
pnpm typecheck
```

Review the diff before committing:

```bash
git diff --stat
git -C packages/registry/source diff -- registry/index.json
git -C packages/registry/source diff -- registry/recipe registry/model-instance registry/speed-sweeps
```

The index must be generated from the record files. Do not hand-edit counts or compact recipe rows.

## Never submit

- Access tokens, cookies, database URLs, browser session data, or private source exports
- Mutable `latest` images presented as validated runtimes
- Prices without a region, currency, condition, source URL, and observation time
- Performance copied from a different artifact, engine, topology, context, or hardware target
- Guessed Hugging Face repositories, revisions, model sizes, memory bandwidth, or compute figures
- UI state, local cache paths, running container state, or user preferences

## Pull-request scope

Keep source acquisition, normalization code, bulk data imports, and runtime promotion reviewable as separate commits. A data import should make the registry diff explainable: where it came from, which records it added or replaced, what remained unsupported, and why every validated recipe is stronger than a candidate.
