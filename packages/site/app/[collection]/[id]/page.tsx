import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"

import { DataTree } from "@/app/components/data-tree"
import { HuggingFaceCards } from "@/app/components/hugging-face-cards"
import { RecordDetails } from "@/app/components/record-details"
import { RecordSearch } from "@/app/components/record-search"
import { getCompatibilityResult, getEntityDetail, listModelInstances, modelInstanceResult, getModelInstance, type ModelInstanceCreditIdentity, type ModelInstanceCredits } from "@local-ai/registry"

export const dynamic = "force-dynamic"

const COLLECTION_LABELS: Record<string, string> = {
  benchmarks: "Benchmark",
  hardware: "Hardware",
  "model-instances": "Model instance",
  models: "Model",
  prices: "Regional market price",
  recipes: "Recipe",
  "speed-sweeps": "Speed evidence",
}

type DetailProps = {
  params: Promise<{ collection: string; id: string }>
  searchParams: Promise<{ q?: string | string[] }>
}

type RecordTopic = "hardware" | "models" | "prices" | "recipes" | "benchmarks" | "speed-sweeps"

function recordTopic(value: string): RecordTopic | null {
  return value === "hardware" || value === "models" || value === "prices" || value === "recipes" || value === "benchmarks" || value === "speed-sweeps" ? value : null
}

type HuggingFaceDisplay = {
  linkType: "repository" | "search"
  status: "known" | "unknown" | "unavailable"
  url: string
}

function readHuggingFace(record: Record<string, unknown>): HuggingFaceDisplay | null {
  const value = record.huggingface
  if (!value || typeof value !== "object") return null
  if (!("url" in value) || !("status" in value) || !("link_type" in value)) return null
  const { link_type: linkType, status, url } = value
  if (typeof url !== "string" || url.length === 0) return null
  if (status !== "known" && status !== "unknown" && status !== "unavailable") return null
  if (linkType !== "repository" && linkType !== "search") return null
  return { linkType, status, url }
}

function creditState(identity: ModelInstanceCreditIdentity): string {
  if (identity.status === "known" && identity.link_type === "repository") return "Exact repository"
  if (identity.link_type === "search") return "Search fallback"
  return "Unverified repository"
}

function CreditIdentity({ identity, label }: { identity: ModelInstanceCreditIdentity | null; label: string }) {
  return (
    <article className="instance-credit">
      <span className="mono-label">{label}</span>
      <strong>{identity?.publisher ?? "Publisher unresolved"}</strong>
      {identity ? <a href={identity.url} rel="noreferrer" target="_blank">{identity.repository ?? identity.url} ↗</a> : <span>No linked source record</span>}
      <small>{identity ? creditState(identity) : "Missing model relationship"}</small>
    </article>
  )
}

function InstanceCredits({ credits }: { credits: ModelInstanceCredits }) {
  const sources = credits.provenance.sources.filter((source) => source.url)
  return (
    <section className="instance-credits" aria-label="Model instance credits and provenance">
      <header>
        <div><span className="mono-label">CREDITS / PROVENANCE</span><h2>Where this artifact came from</h2></div>
        <p>Publisher names come from repository namespaces. They are source credits, not inferred claims about model authorship.</p>
      </header>
      <div className="instance-credit-grid">
        <CreditIdentity identity={credits.base_model} label="BASE MODEL PUBLISHER" />
        <CreditIdentity identity={credits.artifact} label="ARTIFACT / QUANTIZATION PUBLISHER" />
        <article className="instance-credit instance-credit-provenance">
          <span className="mono-label">REGISTRY PROVENANCE</span>
          <strong>{sources.length} captured {sources.length === 1 ? "source" : "sources"}</strong>
          {sources.map((source, index) => <a href={source.url} key={`${source.kind}-${source.url}-${index}`} rel="noreferrer" target="_blank">{source.kind ?? "source"} ↗</a>)}
          <small>Captured {new Date(credits.provenance.captured_at).toLocaleString("en-US", { dateStyle: "medium", timeZone: "UTC" })} UTC</small>
        </article>
      </div>
    </section>
  )
}

export async function generateMetadata({ params }: DetailProps): Promise<Metadata> {
  const { collection, id } = await params
  if (!COLLECTION_LABELS[collection]) return { title: "Record not found" }
  const detail = getEntityDetail(collection, id)
  if (!detail) return { title: "Record not found" }
  const product = detail.product && typeof detail.product === "object" && "name" in detail.product ? detail.product.name : null
  const title = String(detail.name ?? detail.repository ?? product ?? detail.id ?? id)
  return { title: `${title} · Local AI Registry` }
}

export default async function DetailPage({ params, searchParams }: DetailProps) {
  const { collection, id } = await params
  const search = await searchParams
  const query = (Array.isArray(search.q) ? search.q[0] : search.q ?? "").trim()
  const collectionLabel = COLLECTION_LABELS[collection]
  if (!collectionLabel) notFound()
  const detail = getEntityDetail(collection, id)
  if (!detail) notFound()

  const product = detail.product && typeof detail.product === "object" && "name" in detail.product ? detail.product.name : null
  const title = String(detail.name ?? detail.repository ?? product ?? detail.id ?? id)
  const instance = collection === "model-instances" ? detail : null
  const modelInstances = collection === "models"
    ? listModelInstances({ model_id: id }, { limit: 100, offset: 0 }).data
    : collection === "model-instances"
      ? [getModelInstance(id)].flatMap((record) => record ? [modelInstanceResult(record)] : [])
      : []
  const huggingFace = instance ? readHuggingFace(instance) : null
  const credits = instance?.credits as ModelInstanceCredits | undefined
  const topic = recordTopic(collection)
  const compatibility = collection === "recipes" ? getCompatibilityResult(id) : undefined
  if (instance && !huggingFace) {
    throw new Error(`Model instance '${id}' lacks its authoritative Hugging Face identity`)
  }

  return (
    <main className="detail-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Registry</Link><span>/</span><Link href={`/?topic=${collection}`}>{collectionLabel}</Link><span>/</span><span>{title}</span>
      </nav>
      <header className="detail-header">
        <div>
          <p className="eyebrow">{collectionLabel} / permanent record</p>
          <h1>{title}</h1>
          <code>{id}</code>
        </div>
        <div className="detail-actions">
          <Link href={`/?topic=${collection}`}>All {collection}</Link>
          <a href={`/api/v1/${collection}/${id}`}>JSON API</a>
        </div>
      </header>

      {(collection === "hardware" || collection === "models") && <RecordSearch query={query} />}

      {instance && huggingFace && credits ? <InstanceCredits credits={credits} /> : huggingFace && (
        <section className="artifact-resolution" aria-label="Hugging Face identity">
          <p className="eyebrow">Authoritative Hugging Face link from this model-instance body</p>
          <a href={huggingFace.url} rel="noreferrer" target="_blank">{huggingFace.url} ↗</a>
          <dl className="artifact-fields">
            <div><dt>Status</dt><dd>{huggingFace.status}</dd></div>
            <div><dt>Link type</dt><dd>{huggingFace.linkType}</dd></div>
          </dl>
          <p className="link-explanation">
            {huggingFace.linkType === "repository"
              ? "Exact Hugging Face repository link."
              : "Hugging Face search fallback; not an exact repository link."}
          </p>
        </section>
      )}

      {topic ? (
        <section className="record-sheet semantic-record-sheet">
          <RecordDetails compatibility={compatibility} modelInstances={modelInstances} query={query} record={detail} topic={topic} />
        </section>
      ) : (
        <>
          {modelInstances.length > 0 && <HuggingFaceCards instances={modelInstances} />}
          <section className="record-sheet">
            <div className="record-sheet-heading">
              <h2>Complete normalized record</h2>
              <p>Null values are explicit unknowns. Nested enrichment is shown whenever it is present.</p>
            </div>
            <DataTree value={detail} />
          </section>
        </>
      )}
    </main>
  )
}
