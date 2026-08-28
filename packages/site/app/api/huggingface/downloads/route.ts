import { getHuggingFaceModelDownloads } from "@local-ai/sdk"

const HEADERS = { "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400" }

export async function GET(request: Request): Promise<Response> {
  const repositories = [...new Set(new URL(request.url).searchParams.getAll("repository"))]
    .filter((repository) => /^[a-z0-9._-]+\/[a-z0-9._-]+$/i.test(repository))
    .slice(0, 50)
  const entries = await Promise.all(repositories.map(async (repository) => {
    try {
      const metrics = await getHuggingFaceModelDownloads(repository, undefined, { next: { revalidate: 3600 } })
      return [repository, {
        downloadsAllTime: metrics.downloadsAllTime ?? null,
        publishedAt: metrics.createdAt ?? null,
      }] as const
    } catch {
      return [repository, null] as const
    }
  }))
  return Response.json({ data: Object.fromEntries(entries) }, { headers: HEADERS })
}
