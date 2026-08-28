import type { ComponentPropsWithoutRef } from "react"
import rehypeRaw from "rehype-raw"
import rehypeSanitize from "rehype-sanitize"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

import { ModelPublisherMark } from "@/app/components/model-publisher-mark"
import type { ModelInstanceResult } from "@local-ai/registry"
import { getHuggingFaceModelCard, getHuggingFaceModelReadme, type HuggingFaceModelCard } from "@local-ai/sdk"

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
  if (!value || value <= 0) return "Size not published"
  const gigabytes = value / 1024 ** 3
  return gigabytes >= 1024 ? `${(gigabytes / 1024).toFixed(2)} TB` : `${gigabytes.toFixed(gigabytes >= 100 ? 0 : 1)} GB`
}

function formatCount(value: number | undefined): string {
  if (!value) return "0"
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value)
}

function stripFrontmatter(value: string): string {
  return value.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "").trim()
}

function modelImplementation(metadata: HuggingFaceModelCard | null): string | null {
  return metadata?.config?.architectures?.[0]
    ?? metadata?.transformersInfo?.auto_model
    ?? metadata?.config?.model_type
    ?? null
}

async function getModelCard(repository: string): Promise<HuggingFaceModelCard | null> {
  try {
    return await getHuggingFaceModelCard(repository, undefined, { next: { revalidate: 86400 } })
  } catch {
    return null
  }
}

async function getModelReadme(repository: string): Promise<string | null> {
  try {
    return stripFrontmatter(await getHuggingFaceModelReadme(repository, undefined, { next: { revalidate: 86400 } }))
  } catch {
    return null
  }
}

function groupRepositories(instances: ModelInstanceResult[], preferredRepository?: string): RepositoryGroup[] {
  const groups = new Map<string, RepositoryGroup>()
  for (const instance of instances) {
    if (instance.huggingface.link_type !== "repository") continue
    const repository = repositoryFromUrl(instance.hugging_face_url)
    if (!repository) continue
    const existing = groups.get(instance.hugging_face_url)
    if (existing) existing.instances.push(instance)
    else groups.set(instance.hugging_face_url, { instances: [instance], repository, url: instance.hugging_face_url })
  }
  if (preferredRepository && ![...groups.values()].some((group) => group.repository === preferredRepository)) {
    groups.set(`https://huggingface.co/${preferredRepository}`, { instances: [], repository: preferredRepository, url: `https://huggingface.co/${preferredRepository}` })
  }
  return [...groups.values()].sort((left, right) => {
    if (left.repository === preferredRepository) return -1
    if (right.repository === preferredRepository) return 1
    return left.repository.localeCompare(right.repository)
  })
}

function repositoryAsset(repository: string, value: string | undefined, kind: "blob" | "resolve"): string | undefined {
  if (!value || value.startsWith("#")) return value
  if (/^https?:\/\//.test(value)) return value
  const path = value.replace(/^\.\//, "")
  return `https://huggingface.co/${repository}/${kind}/main/${path}`
}

function ModelCardBody({ markdown, repository }: { markdown: string; repository: string }) {
  const Link = ({ href, ...props }: ComponentPropsWithoutRef<"a">) => (
    <a {...props} href={repositoryAsset(repository, href, "blob")} rel="noreferrer" target="_blank" />
  )
  const Image = ({ alt, src, ...props }: ComponentPropsWithoutRef<"img">) => (
    <img {...props} alt={alt ?? ""} loading="lazy" src={repositoryAsset(repository, typeof src === "string" ? src : undefined, "resolve")} />
  )
  return <ReactMarkdown components={{ a: Link, img: Image }} rehypePlugins={[rehypeRaw, rehypeSanitize]} remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
}

function RepositoryIdentity({ group, metadata }: { group: RepositoryGroup; metadata: HuggingFaceModelCard | null }) {
  const author = metadata?.author ?? group.repository.split("/")[0]
  return (
    <div className="hf-identity">
      <span className="hf-card-brand"><ModelPublisherMark className="publisher-mark" fallback={author} publisher={author} /></span>
      <span><strong>{metadata?.id ?? group.repository}</strong><small>{author} · {group.instances.length === 0 ? "canonical model repository" : `${group.instances.length} published ${group.instances.length === 1 ? "variant" : "variants"}`}</small></span>
    </div>
  )
}

export async function HuggingFaceCards({ instances, preferredRepository }: { instances: ModelInstanceResult[]; preferredRepository?: string }) {
  const groups = groupRepositories(instances, preferredRepository)
  if (groups.length === 0) return null
  const visible = groups.slice(0, 12)
  const cards = await Promise.all(visible.map(async (group, index) => ({
    group,
    metadata: await getModelCard(group.repository),
    readme: index === 0 ? await getModelReadme(group.repository) : null,
  })))
  const primary = cards[0]
  const secondary = cards.slice(1)

  return (
    <section className="hf-source" aria-label="Hugging Face model cards">
      <div className="hf-source-heading">
        <div><span className="mono-label">SOURCE / HUGGING FACE</span><h3>Published model information</h3></div>
        <span>{groups.length} {groups.length === 1 ? "repository" : "repositories"}</span>
      </div>
      <article className="hf-primary-card">
        <header>
          <RepositoryIdentity group={primary.group} metadata={primary.metadata} />
          <a href={primary.group.url} rel="noreferrer" target="_blank">Open on Hugging Face ↗</a>
        </header>
        <dl className="hf-primary-facts">
          <div><dt>Implementation</dt><dd>{modelImplementation(primary.metadata) ?? "Not published"}</dd></div>
          <div><dt>Weights</dt><dd>{formatBytes(primary.metadata?.usedStorage)}</dd></div>
          <div><dt>Downloads</dt><dd>{formatCount(primary.metadata?.downloads)}</dd></div>
          <div><dt>License</dt><dd>{primary.metadata?.cardData?.license ?? "Not declared"}</dd></div>
        </dl>
        <div className="hf-primary-tags">
          {[...new Set([primary.metadata?.pipeline_tag, primary.metadata?.library_name, ...(primary.metadata?.tags ?? [])].filter((value): value is string => Boolean(value)))].slice(0, 8).map((tag) => <span key={tag}>{tag}</span>)}
        </div>
        {primary.readme ? (
          <details className="hf-readme" open>
            <summary><span>Model card</span><small>README.md · published by {primary.metadata?.author ?? primary.group.repository.split("/")[0]}</small></summary>
            <div className="hf-readme-body"><ModelCardBody markdown={primary.readme} repository={primary.group.repository} /></div>
          </details>
        ) : <p className="hf-readme-unavailable">This repository does not expose a public README model card.</p>}
      </article>
      {secondary.length > 0 && (
        <div className="hf-card-grid">
          {secondary.map(({ group, metadata }) => {
            const variants = [...new Set(group.instances.map((instance) => instance.weights.precision ?? instance.weights.format ?? "Unspecified"))]
            return (
              <a className="hf-card" href={group.url} key={group.url} rel="noreferrer" target="_blank">
                <RepositoryIdentity group={group} metadata={metadata} />
                <span className="hf-card-stats"><strong>{formatBytes(metadata?.usedStorage)}</strong><small>{formatCount(metadata?.downloads)} downloads · {formatCount(metadata?.likes)} likes</small></span>
                <span className="hf-card-meta">{modelImplementation(metadata) ?? metadata?.pipeline_tag ?? metadata?.library_name ?? "Repository metadata"}{metadata?.cardData?.license ? ` · ${metadata.cardData.license}` : ""}</span>
                <span className="hf-card-variants">{variants.slice(0, 4).map((variant) => <em key={variant}>{variant}</em>)}{variants.length > 4 && <em>+{variants.length - 4}</em>}</span>
              </a>
            )
          })}
        </div>
      )}
      {groups.length > visible.length && <p className="hf-source-more">Showing 12 repositories. The full normalized instance list remains available in the raw record.</p>}
    </section>
  )
}
