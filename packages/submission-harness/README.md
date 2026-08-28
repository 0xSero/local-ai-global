# Submission harness

The only write path into the registry. Importers normalize external evidence into candidate records; the validator checks schemas, references, provenance, launch safety, and evidence constraints. A human reviews the resulting registry diff before merge.

```bash
python3 packages/submission-harness/scripts/import_postgres_publication.py <snapshot> --root packages/registry/source/registry
python3 packages/submission-harness/scripts/enrich_registry.py packages/registry/source/registry
python3 packages/submission-harness/scripts/curate_registry.py packages/registry/source/registry --index-only
pnpm validate
```

The required record shapes, candidate and validated rules, provenance contract, examples, and review commands are in [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md). The observed `local.ai` discovery and bulk-publication boundaries are in [`../../docs/guides/local-ai-source.md`](../../docs/guides/local-ai-source.md).
