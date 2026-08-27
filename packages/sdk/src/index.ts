export type RegistryCollection = "hardware" | "model-instances" | "models" | "prices" | "recipes" | "speed-sweeps"

export type RegistryList<T> = {
  data: T[]
  links: { next: string | null; previous: string | null }
  meta: { limit: number; offset: number; returned: number; source: "registry"; total: number }
}

export class LocalAIClient {
  constructor(private readonly baseUrl: string) {}

  async list<T>(collection: RegistryCollection, filters: Record<string, string | number | boolean> = {}): Promise<RegistryList<T>> {
    const url = new URL(`${this.baseUrl.replace(/\/$/, "")}/${collection}`)
    for (const [key, value] of Object.entries(filters)) url.searchParams.set(key, String(value))
    return this.request<RegistryList<T>>(url)
  }

  async get<T>(collection: RegistryCollection, id: string): Promise<{ data: T }> {
    return this.request<{ data: T }>(new URL(`${this.baseUrl.replace(/\/$/, "")}/${collection}/${encodeURIComponent(id)}`))
  }

  private async request<T>(url: URL): Promise<T> {
    const response = await fetch(url)
    if (!response.ok) throw new Error(`Local AI API returned ${response.status}`)
    return response.json() as Promise<T>
  }
}

export type HuggingFaceConnection = {
  token: string
}

export type HuggingFaceModelCard = {
  author?: string
  cardData?: { license?: string; language?: string | string[]; tags?: string[] }
  config?: {
    architectures?: string[]
    model_type?: string
    num_experts?: number
    num_local_experts?: number
  }
  downloads?: number
  id?: string
  library_name?: string
  likes?: number
  pipeline_tag?: string
  tags?: string[]
  transformersInfo?: { auto_model?: string; pipeline_tag?: string; processor?: string }
  usedStorage?: number
}

export type HuggingFaceRequest = RequestInit & {
  next?: { revalidate: number }
}

export async function getHuggingFaceModelCard(
  repository: string,
  connection?: HuggingFaceConnection,
  request: HuggingFaceRequest = {},
): Promise<HuggingFaceModelCard> {
  const headers = new Headers(request.headers)
  if (connection) headers.set("Authorization", `Bearer ${connection.token}`)
  const response = await fetch(`https://huggingface.co/api/models/${repository}`, { ...request, headers })
  if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`)
  return response.json() as Promise<HuggingFaceModelCard>
}

export async function getHuggingFaceModelReadme(
  repository: string,
  connection?: HuggingFaceConnection,
  request: HuggingFaceRequest = {},
): Promise<string> {
  const headers = new Headers(request.headers)
  if (connection) headers.set("Authorization", `Bearer ${connection.token}`)
  const response = await fetch(`https://huggingface.co/${repository}/raw/main/README.md`, { ...request, headers })
  if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`)
  return response.text()
}

export class HuggingFaceClient {
  constructor(private readonly connection: HuggingFaceConnection) {}

  async whoAmI(): Promise<Record<string, unknown>> {
    const response = await fetch("https://huggingface.co/api/whoami-v2", { headers: { Authorization: `Bearer ${this.connection.token}` } })
    if (!response.ok) throw new Error(`Hugging Face returned ${response.status}`)
    return response.json() as Promise<Record<string, unknown>>
  }

  async modelCard(repository: string): Promise<HuggingFaceModelCard> {
    return getHuggingFaceModelCard(repository, this.connection)
  }

  async modelReadme(repository: string): Promise<string> {
    return getHuggingFaceModelReadme(repository, this.connection)
  }
}
