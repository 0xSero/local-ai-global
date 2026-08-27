# Growing the registry

The complete submission contract is in [`CONTRIBUTING.md`](../../CONTRIBUTING.md). Source-specific acquisition belongs in the submission harness; the observed `local.ai` boundary is documented in [`local-ai-source.md`](local-ai-source.md).

## Add evidence, not guesses

Use the submission harness to import a source snapshot. Preserve the source URL, capture time, and the difference between known, unknown, unavailable, and not applicable. Do not invent a hardware generation, artifact revision, container digest, market price, or benchmark result.

## Choose the smallest record

- Add `hardware` for a distinct accelerator and memory configuration.
- Add `model` for a canonical model identity.
- Add `model-instance` for a downloadable artifact, quantization, or fine-tune.
- Add `recipe` for one model instance on one hardware target with one engine and topology.
- Add `speed-sweeps` only for measured evidence tied to a recipe.
- Add regional `price` observations without flattening currencies or conditions into hardware.

## Promote carefully

Imported compatibility starts as `candidate`. A recipe becomes `validated` only when its artifact and runtime are pinned, its launch contract is reproducible, and a real completion plus measured evidence passes acceptance.

## Validate

```bash
pnpm validate
pnpm test
pnpm typecheck
```
