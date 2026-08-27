# Hugging Face integration

## Authority

Each `model-instance` record carries an authoritative `huggingface.url`, `status`, and `link_type`. Exact repository links and search fallbacks remain distinct.

## Public enrichment

The site can resolve model-card metadata from an exact repository URL: publisher, repository identity, license, task, library, downloads, likes, and `usedStorage`. Repository storage is formatted as GB or TB and is not mislabeled as the size of one quantized artifact when a repository contains multiple variants.

## Connected user scope

An explicit user connection may add:

- signed-in Hugging Face identity;
- gated and private repository access the user already holds;
- accessible model and organization lists;
- download authorization for a selected artifact;
- local cache comparison and missing-byte calculation.

Tokens are caller-owned runtime secrets. They never enter registry JSON, logs, URLs, analytics, or generated submissions.

## Failure behavior

If Hugging Face is unavailable, the registry still resolves hardware, models, recipes, and cached artifacts. Live card metadata is optional enrichment, not a launch dependency.
