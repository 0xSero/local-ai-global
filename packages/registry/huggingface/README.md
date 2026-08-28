---
license: mit
pretty_name: Local AI Registry
tags:
- local-ai
- llm-inference
- hardware
- gpu
- benchmarks
configs:
- config_name: hardware
  data_files:
  - split: train
    path: data/hardware.jsonl
- config_name: models
  data_files:
  - split: train
    path: data/models.jsonl
- config_name: model-instances
  data_files:
  - split: train
    path: data/model-instances.jsonl
- config_name: recipes
  data_files:
  - split: train
    path: data/recipes.jsonl
- config_name: prices
  data_files:
  - split: train
    path: data/prices.jsonl
- config_name: speed-sweeps
  data_files:
  - split: train
    path: data/speed-sweeps.jsonl
- config_name: benchmarks
  data_files:
  - split: train
    path: data/benchmarks.jsonl
---

# Local AI Registry

A source-backed graph of local AI hardware, models, model artifacts, launch recipes, regional prices, raw speed sweeps, and comparable benchmark summaries.

The [GitHub monorepo](https://github.com/0xSero/local-ai-global) is the source of truth. This dataset repository is a generated, versioned mirror for discovery, analysis, and use with the Hugging Face Datasets library. The [live registry](https://local-ai-registry.vercel.app/) and [read-only API](https://local-ai-registry.vercel.app/api/v1) resolve the same graph.

## Tables

| Config | Primary key | Connects through |
| --- | --- | --- |
| `hardware` | `id` | Recipe `hardware_id`; price `hardware[].id` |
| `models` | `id` | Model instance `model_id` |
| `model-instances` | `id` | Recipe `model_instance_id` |
| `recipes` | `id` | Hardware, model instance, and `speed_sweeps_ids` |
| `prices` | `id` | Hardware IDs and regional observations |
| `speed-sweeps` | `id` | Recipe `recipe_id` and raw measured rows |
| `benchmarks` | `id` | A comparable projection of one raw speed sweep |

Benchmarks do not replace evidence. Each benchmark retains `sweep_id`, `recipe_id`, and links to the canonical records from which it was derived.

## Use

```python
from datasets import load_dataset

benchmarks = load_dataset(
    "0xSero/local-ai-registry",
    "benchmarks",
    split="train",
)
```

Every configuration is independently loadable. The JSONL files preserve nested registry fields; null values are explicit unknowns rather than invented defaults.

## Snapshot and schemas

- `source.json` identifies the Git commit and export timestamp.
- `schema/` contains the JSON Schemas and shared TypeScript interfaces.
- `registry-snapshot.tar.gz` contains the exact recursive registry tree used to generate the tables.

## Contributing

Follow the [registry contribution contract](https://github.com/0xSero/local-ai-global/blob/main/CONTRIBUTING.md). Contributions are validated and merged in GitHub, then exported here. Do not edit the generated Hugging Face tables as an alternate source of truth.

## Provenance

Records carry their own source and provenance fields. Coverage varies by record. Candidate prices and recipes remain visibly marked, and benchmark summaries are only as authoritative as their attached raw sweep evidence.
