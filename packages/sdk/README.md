# SDK

Typed access to the read-only registry API plus opt-in provider connections.

Hugging Face credentials are passed by the caller and never written to the registry. The connection layer can resolve the signed-in user, gated repository access, live model-card metadata, and repository size. Local cache and download state remain on the user's machine.
