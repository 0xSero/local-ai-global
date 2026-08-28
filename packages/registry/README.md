# Registry

The normalized JSON tree and read contract. This package is the monorepo's only source of truth.

Records are recursive by reference: start at `index.json`, select a compact recipe row, then resolve only its model instance, model, hardware, recipe, price, and speed evidence as needed. The package exports the same resolver used by the API and site.

Do not add user credentials, local cache state, download progress, running containers, or UI preferences here. Those are runtime concerns.

See [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md) for the exact record contract and validation path.

## Hugging Face export

Generate the public dataset mirror from the current registry tree:

```bash
pnpm --filter @local-ai/registry export:huggingface
```

The command writes queryable JSONL tables, schemas, source revision metadata, and an exact compressed snapshot to `packages/registry/dist/huggingface`. GitHub remains authoritative; the Hugging Face dataset is a generated distribution.
