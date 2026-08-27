# API

Read-only HTTP access to the Local AI Registry.

`@local-ai/api` turns the query functions from `@local-ai/registry` into framework-neutral `Request` and `Response` handlers. The site mounts the handlers at `/api/v1`, while other hosts can reuse the same contract without copying registry data or query logic.

## Quick start

The public API is available at:

```text
https://local-ai-registry.vercel.app/api/v1
```

```bash
curl 'https://local-ai-registry.vercel.app/api/v1'
curl 'https://local-ai-registry.vercel.app/api/v1/hardware?limit=10'
curl 'https://local-ai-registry.vercel.app/api/v1/recipes?hardware_id=rtx-pro-6000-blackwell-96gb'
```

## What it does

The API exposes the immutable registry graph as JSON. Clients can list and filter hardware, models, model instances, recipes, prices, and speed sweeps, or retrieve one record by its stable ID.

The API is read-only. It does not accept submissions, download weights, start inference engines, or modify the registry.

## Routes

| Route | Purpose |
| --- | --- |
| `GET /api/v1` | API metadata, route map, and collection counts |
| `GET /api/v1/index` | Registry index and compatibility summaries |
| `GET /api/v1/facets` | Available filter values and collection counts |
| `GET /api/v1/hardware` | Hardware records |
| `GET /api/v1/models` | Base model records |
| `GET /api/v1/model-instances` | Concrete model repositories and weight variants |
| `GET /api/v1/recipes` | Hardware-compatible runtime recipes |
| `GET /api/v1/compatibility` | Alias for the recipe compatibility query |
| `GET /api/v1/prices` | Regional market-price records |
| `GET /api/v1/speed-sweeps` | Measured inference results |
| `GET /api/v1/:collection/:id` | One fully resolved record |

## Lists and filters

List routes accept collection fields as query parameters. Filters are combined, so every supplied field must match.

```bash
curl 'https://local-ai-registry.vercel.app/api/v1/hardware?vendor=nvidia&limit=25'
curl 'https://local-ai-registry.vercel.app/api/v1/models?family=qwen'
curl 'https://local-ai-registry.vercel.app/api/v1/prices?region=US'
curl 'https://local-ai-registry.vercel.app/api/v1/recipes?hardware_id=rtx-pro-6000-blackwell-96gb&status=validated'
```

All list routes support:

| Parameter | Default | Behavior |
| --- | --- | --- |
| `limit` | `25` | Number of records returned, clamped from 1 to 100 |
| `offset` | `0` | Zero-based collection offset |

## Response shape

A list response contains data, navigation links, and pagination metadata:

```json
{
  "data": [],
  "links": {
    "next": null,
    "previous": null
  },
  "meta": {
    "limit": 25,
    "offset": 0,
    "returned": 0,
    "source": "registry",
    "total": 0
  }
}
```

A detail response contains the resolved entity graph:

```json
{
  "data": {},
  "meta": {
    "source": "registry"
  }
}
```

Unknown routes and IDs return `404`:

```json
{
  "error": {
    "code": "not_found",
    "message": "API route not found"
  }
}
```

## HTTP behavior

- Responses use `Content-Type: application/json`.
- Cross-origin reads are allowed with `Access-Control-Allow-Origin: *`.
- Responses use a five-minute public cache and may serve stale content while revalidating for one hour.
- Invalid `limit` and `offset` values fall back to safe bounds.

## Mounting the handlers

The package exports two handlers:

```ts
import { apiIndex, apiRoute } from "@local-ai/api"

const indexResponse = apiIndex()
const collectionResponse = apiRoute(request, ["hardware"])
const recordResponse = apiRoute(request, ["hardware", "rtx-5090-32gb"])
```

`apiIndex()` serves `/api/v1`. Pass the path segments after `/api/v1/` to `apiRoute()` for every other request.

The Next.js site mounts them in:

```text
packages/site/app/api/v1/route.ts
packages/site/app/api/v1/[...path]/route.ts
```

## Development

From the monorepo root:

```bash
pnpm install
pnpm --filter @local-ai/api typecheck
pnpm build
```

Registry data and query behavior belong in `@local-ai/registry`; HTTP request and response behavior belongs here.
