import {
  collectionCounts,
  getEntityDetail,
  getFacets,
  getRegistryIndex,
  listHardware,
  listModelInstances,
  listModels,
  listPrices,
  listSpeedSweeps,
  queryCompatibility,
  type CompatibilityFilters,
  type Pagination,
} from "@local-ai/registry"

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
  "Content-Type": "application/json",
}

const ROUTES = {
  compatibility: "/api/v1/compatibility",
  facets: "/api/v1/facets",
  hardware: "/api/v1/hardware",
  index: "/api/v1/index",
  model_instances: "/api/v1/model-instances",
  models: "/api/v1/models",
  prices: "/api/v1/prices",
  recipes: "/api/v1/recipes",
  speed_sweeps: "/api/v1/speed-sweeps",
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { headers: HEADERS, status })
}

function pagination(search: URLSearchParams): Pagination {
  const limit = Number(search.get("limit") ?? 25)
  const offset = Number(search.get("offset") ?? 0)
  return {
    limit: Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 25,
    offset: Number.isFinite(offset) ? Math.max(0, Math.trunc(offset)) : 0,
  }
}

function filters(search: URLSearchParams): Record<string, string> {
  return Object.fromEntries([...search.entries()].filter(([key]) => key !== "limit" && key !== "offset"))
}

function list(request: Request, result: { data: unknown[]; total: number }, page: Pagination): Response {
  const url = new URL(request.url)
  const links: { next: string | null; previous: string | null } = { next: null, previous: null }
  if (page.offset + page.limit < result.total) {
    url.searchParams.set("offset", String(page.offset + page.limit))
    url.searchParams.set("limit", String(page.limit))
    links.next = url.toString()
  }
  if (page.offset > 0) {
    url.searchParams.set("offset", String(Math.max(0, page.offset - page.limit)))
    url.searchParams.set("limit", String(page.limit))
    links.previous = url.toString()
  }
  return json({
    data: result.data,
    links,
    meta: { limit: page.limit, offset: page.offset, returned: result.data.length, source: "registry", total: result.total },
  })
}

export function apiIndex(): Response {
  return json({
    data: { name: "Local AI Registry API", read_only: true, routes: ROUTES, version: "v1" },
    meta: { counts: collectionCounts(), source: "registry" },
  })
}

export function apiRoute(request: Request, path: string[]): Response {
  const [resource, id, extra] = path
  if (!resource || extra) return json({ error: { code: "not_found", message: "API route not found" } }, 404)
  if (id) {
    const detail = getEntityDetail(resource, id)
    return detail
      ? json({ data: detail, meta: { source: "registry" } })
      : json({ error: { code: "not_found", message: `${resource} record '${id}' was not found` } }, 404)
  }
  if (resource === "index") return json({ data: getRegistryIndex(), meta: { source: "registry" } })
  if (resource === "facets") return json({ data: getFacets(), meta: { counts: collectionCounts(), source: "registry" } })

  const page = pagination(new URL(request.url).searchParams)
  const selected = filters(new URL(request.url).searchParams)
  if (resource === "models") return list(request, listModels(selected, page), page)
  if (resource === "model-instances") return list(request, listModelInstances(selected, page), page)
  if (resource === "hardware") return list(request, listHardware(selected, page), page)
  if (resource === "prices") return list(request, listPrices(selected, page), page)
  if (resource === "recipes" || resource === "compatibility") return list(request, queryCompatibility(selected as CompatibilityFilters, page), page)
  if (resource === "speed-sweeps") return list(request, listSpeedSweeps(selected, page), page)
  return json({ error: { code: "not_found", message: "API route not found" } }, 404)
}
