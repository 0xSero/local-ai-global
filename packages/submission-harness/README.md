# Submission harness

The only write path into the registry. Importers normalize external evidence into candidate records; the validator checks schemas, references, provenance, launch safety, and evidence constraints. A human reviews the resulting registry diff before merge.

```bash
pnpm validate
python3 packages/submission-harness/scripts/import_postgres_publication.py <snapshot> --root packages/registry
```
