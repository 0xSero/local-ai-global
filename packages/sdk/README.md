# SDK

Typed application access to the Local AI Registry API and opt-in Hugging Face connections.

`@local-ai/sdk` is the programmatic client layer. It provides a small HTTP client for registry collections and isolated Hugging Face helpers for live model-card and account data.

## Quick start

```ts
import { LocalAIClient } from "@local-ai/sdk"

const registry = new LocalAIClient("https://local-ai-registry.vercel.app/api/v1")
const hardware = await registry.list("hardware", { vendor: "nvidia", limit: 10 })
const record = await registry.get("hardware", "rtx-pro-6000-blackwell-96gb")
```

The base URL must point to the API version root, normally `/api/v1`.

## Registry client

### Create a client

```ts
import { LocalAIClient } from "@local-ai/sdk"

const client = new LocalAIClient("https://local-ai-registry.vercel.app/api/v1")
```

The client works anywhere the standard `fetch`, `URL`, and `Headers` APIs are available, including modern browsers, Node.js, and server runtimes.

### List records

```ts
type Hardware = {
  id: string
  name: string
  vendor: string
}

const result = await client.list<Hardware>("hardware", {
  vendor: "nvidia",
  limit: 25,
  offset: 0,
})

for (const hardware of result.data) {
  console.log(hardware.id, hardware.name)
}

console.log(result.meta.total)
console.log(result.links.next)
```

Supported collections are:

```ts
type RegistryCollection =
  | "hardware"
  | "model-instances"
  | "models"
  | "prices"
  | "recipes"
  | "speed-sweeps"
```

Filter values may be strings, numbers, or booleans. The SDK serializes them as URL query parameters and returns the API's paginated list envelope.

### Get one record

```ts
const { data } = await client.get<Hardware>("hardware", "rtx-5090-32gb")
```

`get()` URL-encodes the record ID and returns the API detail envelope.

### Response types

```ts
type RegistryList<T> = {
  data: T[]
  links: {
    next: string | null
    previous: string | null
  }
  meta: {
    limit: number
    offset: number
    returned: number
    source: "registry"
    total: number
  }
}
```

The generic record shape is selected by the caller. Registry schema types currently live in `@local-ai/registry/schema`.

## Hugging Face

Hugging Face data is fetched live and is not part of the immutable registry. Tokens are supplied by the caller, sent only to `huggingface.co`, and never persisted by this SDK or written into registry records.

### Public model cards

```ts
import { getHuggingFaceModelCard } from "@local-ai/sdk"

const card = await getHuggingFaceModelCard("Qwen/Qwen3-8B")

console.log(card.pipeline_tag)
console.log(card.downloads)
console.log(card.usedStorage)
```

The helper returns live metadata including the repository ID, author, license, task, library, download count, likes, and repository storage when Hugging Face provides those fields.

Publisher profiles expose the avatar and display identity used by model catalogs:

```ts
import { getHuggingFacePublisherProfile } from "@local-ai/sdk"

const publisher = await getHuggingFacePublisherProfile("Qwen")

console.log(publisher?.avatarUrl)
```

### Authenticated access

```ts
import { HuggingFaceClient } from "@local-ai/sdk"

const huggingFace = new HuggingFaceClient({
  token: process.env.HF_TOKEN!,
})

const account = await huggingFace.whoAmI()
const gatedCard = await huggingFace.modelCard("organization/gated-model")
```

Use an authenticated client when an application needs the connected account or access to a gated repository. Keep the token in the caller's secret store and never expose it to browser code unless that is explicitly intended.

For server-rendered model cards, the standalone helper accepts standard `RequestInit` options plus an optional Next.js revalidation hint:

```ts
const card = await getHuggingFaceModelCard(
  "Qwen/Qwen3-8B",
  undefined,
  { next: { revalidate: 3600 } },
)
```

## Errors

Registry requests throw when the API returns a non-success status:

```text
Local AI API returned 404
```

Hugging Face requests behave the same way:

```text
Hugging Face returned 401
```

The current SDK intentionally does not retry requests, cache responses, download weights, detect hardware, select recipes, or launch inference engines. Those responsibilities belong to the caller, CLI, or future runtime packages.

## Development

From the monorepo root:

```bash
pnpm install
pnpm --filter @local-ai/sdk typecheck
pnpm typecheck
```

Keep the SDK narrow: typed transport and provider connections belong here; registry contents and compatibility logic do not.
