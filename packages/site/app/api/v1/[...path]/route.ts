import { apiRoute } from "@local-ai/api"

export const dynamic = "force-dynamic"

type RouteContext = {
  params: Promise<{ path: string[] }>
}

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { path } = await context.params
  return apiRoute(request, path)
}
