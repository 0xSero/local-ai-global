# Registry adapter

The deterministic read/query adapter for the canonical [`local-ai-registry`](https://github.com/0xSero/local-ai-registry) data.

The registry repository is pinned as the `source` Git submodule. Records live only under `source/registry`; the adapter exports the same resolver used by the API and site.

Do not add user credentials, local cache state, download progress, running containers, or UI preferences here. Those are runtime concerns.

Clone with `--recurse-submodules`, or run `git submodule update --init --recursive` after cloning.

## Hugging Face export

Generate the public dataset mirror from the pinned registry revision:

```bash
pnpm --filter @local-ai/registry export:huggingface
```

The command writes queryable JSONL tables, schemas, source revision metadata, and an exact compressed snapshot to `packages/registry/dist/huggingface`. The `local-ai-registry` repository remains authoritative; the Hugging Face dataset is generated output.
