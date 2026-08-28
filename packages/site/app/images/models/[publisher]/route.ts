import { getHuggingFacePublisherProfile } from "@local-ai/sdk"

const CACHE_CONTROL = "public, max-age=86400, s-maxage=86400, stale-while-revalidate=604800"

function fallback(publisher: string): Response {
  const initials = publisher.split(/[^a-z0-9]+/i).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "AI"
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="#1d1d1b"/><text x="32" y="38" fill="#d8d6cf" font-family="ui-monospace,monospace" font-size="20" text-anchor="middle">${initials}</text></svg>`
  return new Response(svg, { headers: { "Cache-Control": CACHE_CONTROL, "Content-Type": "image/svg+xml" } })
}

export async function GET(_: Request, { params }: { params: Promise<{ publisher: string }> }): Promise<Response> {
  const { publisher } = await params
  if (!/^[a-z0-9][a-z0-9._-]{0,95}$/i.test(publisher)) return fallback(publisher)

  try {
    const profile = await getHuggingFacePublisherProfile(publisher, undefined, { next: { revalidate: 86400 } })
    if (!profile?.avatarUrl) return fallback(publisher)
    const avatar = new URL(profile.avatarUrl)
    if (avatar.protocol !== "https:" || avatar.hostname !== "cdn-avatars.huggingface.co") return fallback(publisher)
    return new Response(null, { headers: { "Cache-Control": CACHE_CONTROL, Location: avatar.toString() }, status: 307 })
  } catch {
    return fallback(publisher)
  }
}
