import type { ModelInstanceResult } from "@local-ai/registry"
import { getHuggingFaceModelCard, type HuggingFaceModelCard } from "@local-ai/sdk"

type RepositoryGroup = {
  instances: ModelInstanceResult[]
  repository: string
  url: string
}

function repositoryFromUrl(value: string): string | null {
  try {
    const url = new URL(value)
    const parts = url.pathname.split("/").filter(Boolean)
    return url.hostname === "huggingface.co" && parts.length >= 2 && parts[0] !== "models"
      ? `${parts[0]}/${parts[1]}`
      : null
  } catch {
    return null
  }
}

function formatBytes(value: number | undefined): string {
  if (!value || value <= 0) return "Size unavailable"
  const gigabytes = value / 1024 ** 3
  return gigabytes >= 1024 ? `${(gigabytes / 1024).toFixed(2)} TB` : `${gigabytes.toFixed(gigabytes >= 100 ? 0 : 1)} GB`
}

function formatCount(value: number | undefined): string {
  if (!value) return "0"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value)
}

async function getModelCard(repository: string): Promise<HuggingFaceModelCard | null> {
  try {
    return await getHuggingFaceModelCard(repository, undefined, { next: { revalidate: 86400 } })
  } catch {
    return null
  }
}

function groupRepositories(instances: ModelInstanceResult[]): RepositoryGroup[] {
  const groups = new Map<string, RepositoryGroup>()
  for (const instance of instances) {
    if (instance.huggingface.link_type !== "repository") continue
    const repository = repositoryFromUrl(instance.hugging_face_url)
    if (!repository) continue
    const existing = groups.get(instance.hugging_face_url)
    if (existing) existing.instances.push(instance)
    else groups.set(instance.hugging_face_url, { instances: [instance], repository, url: instance.hugging_face_url })
  }
  return [...groups.values()].sort((left, right) => left.repository.localeCompare(right.repository))
}

export async function HuggingFaceCards({ instances }: { instances: ModelInstanceResult[] }) {
  const groups = groupRepositories(instances)
  if (groups.length === 0) return null
  const visible = groups.slice(0, 12)
  const cards = await Promise.all(visible.map(async (group) => ({ group, metadata: await getModelCard(group.repository) })))

  return (
    <section className="hf-source" aria-label="Hugging Face model cards">
      <div className="hf-source-heading">
        <div><span className="mono-label">SOURCE / HUGGING FACE</span><h3>Published model cards</h3></div>
        <span>{groups.length} {groups.length === 1 ? "repository" : "repositories"}</span>
      </div>
      <div className="hf-card-grid">
        {cards.map(({ group, metadata }) => {
          const variants = [...new Set(group.instances.map((instance) => instance.weights.precision ?? instance.weights.format ?? "Unknown precision"))]
          const author = metadata?.author ?? group.repository.split("/")[0]
          return (
            <a className="hf-card" href={group.url} key={group.url} rel="noreferrer" target="_blank">
              <span className="hf-card-brand"><span className="publisher-mark">{author.slice(0, 2).toUpperCase()}</span><img alt="Hugging Face" src="https://huggingface.co/front/assets/huggingface_logo-noborder.svg" /></span>
              <span className="hf-card-title"><strong>{metadata?.id ?? group.repository}</strong><small>{author}</small></span>
              <span className="hf-card-stats"><strong>{formatBytes(metadata?.usedStorage)}</strong><small>{formatCount(metadata?.downloads)} downloads · {formatCount(metadata?.likes)} likes</small></span>
              <span className="hf-card-meta">{metadata?.pipeline_tag ?? metadata?.library_name ?? "Model repository"}{metadata?.cardData?.license ? ` · ${metadata.cardData.license}` : ""}</span>
              <span className="hf-card-variants">{variants.slice(0, 4).map((variant) => <em key={variant}>{variant}</em>)}{variants.length > 4 && <em>+{variants.length - 4}</em>}</span>
              <span className="hf-card-open">Open model card ↗</span>
            </a>
          )
        })}
      </div>
      {groups.length > visible.length && <p className="hf-source-more">Showing 12 repositories. The complete instance list remains in the normalized record below.</p>}
    </section>
  )
}
