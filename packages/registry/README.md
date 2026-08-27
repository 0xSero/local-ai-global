# Registry

The normalized JSON tree and read contract. This package is the monorepo's only source of truth.

Records are recursive by reference: start at `index.json`, select a compact recipe row, then resolve only its model instance, model, hardware, recipe, price, and speed evidence as needed. The package exports the same resolver used by the API and site.

Do not add user credentials, local cache state, download progress, running containers, or UI preferences here. Those are runtime concerns.
