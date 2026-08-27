# Data flow

## Read path

1. A client detects or receives a hardware ID.
2. It reads the compact registry index or calls the compatibility API.
3. The user selects a model or hardware orientation and filters the result.
4. The selected recipe resolves its model instance, canonical model, hardware, launch contract, and speed evidence.
5. The CLI or Omarchy adapter performs local runtime actions only after selection.

## Write path

1. External material enters the submission harness.
2. An importer emits candidate normalized records with provenance and explicit unknowns.
3. Validation checks schemas, identifiers, references, launch constraints, and evidence.
4. Reviewers inspect a registry-only diff.
5. Merge updates the single registry tree; all read surfaces inherit the change.
