import Link from "next/link"
import type { ReactNode } from "react"

import { DataTree } from "@/app/components/data-tree"
import { HuggingFaceCards } from "@/app/components/hugging-face-cards"
import { CopyButton } from "@/app/components/copy-button"
import { dockerCommand, RecipeSummary } from "@/app/components/recipe-summary"
import {
  getCompatibilityResult,
  getEntityDetail,
  getSpeedSweep,
  type CompatibilityResult,
  type ModelInstanceResult,
} from "@local-ai/registry"
import type { Hardware, Model, PriceObservation, PriceRecord, SpeedRow, SpeedSweep } from "@local-ai/registry/schema"

type RecordTopic = "recipes" | "hardware" | "models" | "prices" | "speed-sweeps"

type RecordLink = {
  api?: string
  engine?: string
  hardware_count?: number
  href?: string
  id: string
  match_scope?: string
  name?: string
  status?: string
}

type RelatedRecord = RecordLink | null
type Relationships = Record<string, RelatedRecord | RelatedRecord[]>

type RecordDetailsProps = {
  compatibility?: CompatibilityResult
  modelInstances: ModelInstanceResult[]
  record: Record<string, unknown>
  selectedHardware?: Hardware
  topic: RecordTopic
}

type Fact = {
  detail: string
  label: string
  value: string
}

const CURRENCY = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 })

function humanize(value: string): string {
  return value.replaceAll("_", " ").replaceAll("-", " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Unknown"
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

function formatParams(value: number | null | undefined): string {
  if (value === null || value === undefined) return "Unknown"
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}B`
}

function formatMemory(value: number): string {
  return `${value.toLocaleString()} GB`
}

function formatBandwidth(value: Hardware["memory"]["bandwidth_gb_per_s"]): string {
  if (typeof value === "number") return `${value.toLocaleString()} GB/s`
  if (value) return `${value.min.toLocaleString()}–${value.max.toLocaleString()} GB/s`
  return "Unknown"
}

function formatAmount(amount: number | null, currency: string): string {
  if (amount === null) return "Unavailable"
  return `${currency} ${CURRENCY.format(amount)}`
}

function peakSpeed(rows: SpeedRow[]): number | null {
  const speeds = rows.flatMap((row) => {
    const value = row.decode_tok_s_per_stream ?? row.decode_tok_s ?? row.prefill_tok_s
    return typeof value === "number" ? [value] : []
  })
  return speeds.length > 0 ? Math.max(...speeds) : null
}

function maxContext(rows: SpeedRow[]): number | null {
  const contexts = rows.flatMap((row) => typeof row.context_tokens === "number" ? [row.context_tokens] : [])
  return contexts.length > 0 ? Math.max(...contexts) : null
}

function Summary({ action, description, facts, label }: { action?: ReactNode; description: string; facts: Fact[]; label: string }) {
  return (
    <section className="record-summary" aria-label={label}>
      <div className="record-summary-intro">
        <div><span className="mono-label">{label}</span><p>{description}</p></div>
        {action}
      </div>
      <dl className="record-facts">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt>{fact.label}</dt>
            <dd>{fact.value}</dd>
            <small>{fact.detail}</small>
          </div>
        ))}
      </dl>
    </section>
  )
}

function relationHref(link: RecordLink): string {
  const match = link.href?.match(/^\/(recipes|hardware|models|prices|speed-sweeps)\/([^/]+)$/)
  if (!match) return link.href ?? link.api ?? "#"
  return `/?topic=${match[1]}&record=${encodeURIComponent(match[2])}`
}

function relationTitle(link: RecordLink): string {
  if (link.name) return link.name
  const compatibility = getCompatibilityResult(link.id)
  if (compatibility) {
    const count = compatibility.recipe.hardware_count > 1 ? `${compatibility.recipe.hardware_count}× ` : ""
    return `${compatibility.model.name} on ${count}${compatibility.hardware.name}`
  }
  const sweep = getSpeedSweep(link.id)
  const result = sweep ? getCompatibilityResult(sweep.recipe_id) : undefined
  if (result) return `${result.model.name} on ${result.hardware.name}`
  return humanize(link.id)
}

function relationMeta(link: RecordLink): string {
  const recipe = getCompatibilityResult(link.id)
  return [
    recipe ? recipe.launchable ? "Docker ready" : "Reference only" : undefined,
    link.status,
    link.engine,
    typeof link.hardware_count === "number" ? `${link.hardware_count}× hardware` : undefined,
    link.match_scope,
  ].filter(Boolean).join(" · ")
}

function relationshipLabel(key: string): string {
  const labels: Record<string, string> = {
    hardware: "Hardware",
    model: "Model",
    model_instance: "Model instance",
    model_instances: "Model instances",
    models: "Compatible models",
    prices: "Regional prices",
    recipe: "Recipe",
    recipes: "Compatible recipes",
    speed_sweeps: "Speed evidence",
  }
  return labels[key] ?? humanize(key)
}

function relationshipEntries(relationships: unknown): Array<[string, RecordLink[]]> {
  if (!relationships || typeof relationships !== "object") return []
  return Object.entries(relationships as Relationships).flatMap(([key, value]) => {
    const links = (Array.isArray(value) ? value : [value]).filter((item): item is RecordLink => Boolean(item?.id))
    return links.length > 0 ? [[key, links] as [string, RecordLink[]]] : []
  })
}

function relationshipSummary(key: string, links: RecordLink[]): string {
  if (key === "recipes") {
    const ready = links.filter((link) => getCompatibilityResult(link.id)?.launchable).length
    return `${links.length.toLocaleString()} ${links.length === 1 ? "recipe" : "recipes"} · ${ready.toLocaleString()} Docker ready`
  }
  if (key === "speed_sweeps") return `${links.length.toLocaleString()} measured ${links.length === 1 ? "run" : "runs"}`
  return `${links.length.toLocaleString()} ${links.length === 1 ? "record" : "records"}`
}

function Connections({ relationships }: { relationships: unknown }) {
  const groups = relationshipEntries(relationships)
  if (groups.length === 0) return null

  return (
    <section className="record-connections" aria-label="Connected registry records">
      <span className="mono-label">CONNECTED DATA</span>
      <div className="connection-groups">
        {groups.map(([key, links]) => (
          <details className="connection-group" key={key} open={key === "recipes" || key === "speed_sweeps" || links.length <= 3}>
            <summary><span>{relationshipLabel(key)}</span><small>{relationshipSummary(key, links)}</small></summary>
            <div className="connection-links">
              {[...links].sort((left, right) => Number(Boolean(getCompatibilityResult(right.id)?.launchable)) - Number(Boolean(getCompatibilityResult(left.id)?.launchable))).map((link) => {
                const recipe = key === "recipes" ? getCompatibilityResult(link.id) : undefined
                const command = recipe?.launchable ? dockerCommand(recipe) : null
                return (
                  <div className="connection-link-row" key={`${key}-${link.id}`}>
                    <Link href={relationHref(link)} scroll={false}>
                      <span><strong>{relationTitle(link)}</strong>{relationMeta(link) && <small>{relationMeta(link)}</small>}</span>
                      <span className="link-affordance" aria-hidden="true">Open <b>↗</b></span>
                    </Link>
                    {command && <CopyButton label="Copy Docker" value={command} />}
                  </div>
                )
              })}
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}

function HardwarePrices({ links }: { links: RecordLink[] }) {
  const prices = links.flatMap((link) => {
    const record = getEntityDetail("prices", link.id) as unknown as PriceRecord | undefined
    return record ? [{ link, record }] : []
  })
  if (prices.length === 0) return null

  return (
    <section className="hardware-prices" aria-label="Current market prices">
      <div className="section-heading"><span className="mono-label">MARKET PRICES</span><small>{prices.length} {prices.length === 1 ? "region" : "regions"}</small></div>
      <div className="hardware-price-list">
        {prices.map(({ link, record }) => {
          const lowest = record.summary.lowest_new ?? record.summary.lowest_refurbished ?? record.summary.lowest_used
          return (
            <Link href={relationHref(link)} key={record.id} scroll={false}>
              <span><strong>{record.region.name}</strong><small>{record.summary.in_stock_count} in stock · {record.summary.listing_count} listings · observed {formatDate(record.observed_at)}</small></span>
              <span><strong>{formatAmount(lowest, record.region.currency)}</strong><small>Open market record <b>↗</b></small></span>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function HardwareDetails({ record }: { record: Record<string, unknown> }) {
  const hardware = record as unknown as Hardware & { relationships?: Relationships }
  const relationships = relationshipEntries(hardware.relationships)
  const count = (key: string) => relationships.find(([name]) => name === key)?.[1].length ?? 0
  const priceLinks = relationships.find(([name]) => name === "prices")?.[1] ?? []
  const recipeLinks = relationships.find(([name]) => name === "recipes")?.[1] ?? []
  const dockerReady = recipeLinks.filter((link) => getCompatibilityResult(link.id)?.launchable).length
  const lowestPrice = priceLinks.flatMap((link) => {
    const price = getEntityDetail("prices", link.id) as unknown as PriceRecord | undefined
    if (!price) return []
    const amount = price.summary.lowest_new ?? price.summary.lowest_refurbished ?? price.summary.lowest_used
    return amount === null ? [] : [{ amount, currency: price.region.currency }]
  }).sort((left, right) => left.amount - right.amount)[0]
  const connectedRelationships = Object.fromEntries(Object.entries(hardware.relationships ?? {}).filter(([key]) => key !== "prices"))

  return (
    <>
      <Summary
        description={`${hardware.vendor.toUpperCase()} ${hardware.kind} accelerator with ${hardware.memory.vram_type ?? "unspecified memory"}.`}
        facts={[
          { label: "Memory", value: formatMemory(hardware.memory.vram_gb), detail: hardware.memory.vram_type ?? "Type unknown" },
          { label: "Bandwidth", value: formatBandwidth(hardware.memory.bandwidth_gb_per_s), detail: "memory bandwidth" },
          { label: "Recipes", value: `${count("recipes")} total`, detail: `${dockerReady} Docker ready · ${count("models")} models` },
          { label: "Market", value: lowestPrice ? formatAmount(lowestPrice.amount, lowestPrice.currency) : "No price yet", detail: `${count("prices")} price ${count("prices") === 1 ? "region" : "regions"}` },
        ]}
        label="HARDWARE PROFILE"
      />
      <HardwarePrices links={priceLinks} />
      <Connections relationships={connectedRelationships} />
    </>
  )
}

function ModelDetails({ modelInstances, record }: { modelInstances: ModelInstanceResult[]; record: Record<string, unknown> }) {
  const model = record as unknown as Model & { relationships?: Relationships }
  const relationships = relationshipEntries(model.relationships)
  const count = (key: string) => relationships.find(([name]) => name === key)?.[1].length ?? 0
  const action = model.huggingface?.url ? <a className="record-action" href={model.huggingface.url} rel="noreferrer" target="_blank">Hugging Face</a> : undefined

  return (
    <>
      <Summary
        action={action}
        description={`${model.family} model${model.architecture ? ` with a ${model.architecture} architecture` : ""}.`}
        facts={[
          { label: "Parameters", value: formatParams(model.params), detail: `${formatParams(model.active_params)} active` },
          { label: "Architecture", value: model.architecture ?? "Unknown", detail: model.family },
          { label: "Published variants", value: modelInstances.length.toLocaleString(), detail: "model instances" },
          { label: "Registry coverage", value: `${count("recipes")} recipes`, detail: `${count("hardware")} hardware targets` },
        ]}
        label="MODEL PROFILE"
      />
      {modelInstances.length > 0 && <HuggingFaceCards instances={modelInstances} />}
      <Connections relationships={model.relationships} />
    </>
  )
}

function ObservationRows({ observations, currency }: { currency: string; observations: PriceObservation[] }) {
  const sorted = [...observations].sort((left, right) => Number(right.in_stock) - Number(left.in_stock) || left.amount - right.amount)
  return (
    <details className="record-section" open>
      <summary><span>Market observations</span><small>{observations.length.toLocaleString()} listings</small></summary>
      <div className="observation-list">
        {sorted.map((observation, index) => (
          <a href={observation.url} key={`${observation.url}-${index}`} rel="noreferrer" target="_blank">
            <span><strong>{observation.retailer}</strong><small>{observation.condition} · {observation.in_stock === true ? "in stock" : observation.in_stock === false ? "out of stock" : "stock unknown"}</small></span>
            <span><strong>{formatAmount(observation.amount, currency)}</strong><small>{formatDate(observation.observed_at)}</small></span>
          </a>
        ))}
      </div>
    </details>
  )
}

function PriceDetails({ record }: { record: Record<string, unknown> }) {
  const price = record as unknown as PriceRecord & { relationships?: Relationships }
  const lowest = price.summary.lowest_new ?? price.summary.lowest_refurbished ?? price.summary.lowest_used
  const condition = price.summary.lowest_new !== null ? "new" : price.summary.lowest_refurbished !== null ? "refurbished" : price.summary.lowest_used !== null ? "used" : "unavailable"

  return (
    <>
      <Summary
        description={`${price.product.name} listings observed in ${price.region.name}.`}
        facts={[
          { label: "Lowest available", value: formatAmount(lowest, price.region.currency), detail: condition },
          { label: "Region", value: price.region.code, detail: `${price.region.name} · ${price.region.currency}` },
          { label: "Availability", value: `${price.summary.in_stock_count} in stock`, detail: `${price.summary.listing_count} listings` },
          { label: "Observed", value: formatDate(price.observed_at), detail: `${price.summary.retailer_count} retailers` },
        ]}
        label="MARKET SNAPSHOT"
      />
      {price.observations.length > 0 && <ObservationRows currency={price.region.currency} observations={price.observations} />}
      <Connections relationships={price.relationships} />
    </>
  )
}

function SpeedDetails({ record }: { record: Record<string, unknown> }) {
  const sweep = record as unknown as SpeedSweep & { relationships?: Relationships }
  const result = getCompatibilityResult(sweep.recipe_id)
  const speed = peakSpeed(sweep.rows)
  const context = maxContext(sweep.rows)

  return (
    <>
      <Summary
        description={result ? `${result.model.name} measured on ${result.recipe.hardware_count > 1 ? `${result.recipe.hardware_count}× ` : ""}${result.hardware.name}.` : "Measured inference evidence."}
        facts={[
          { label: "Peak rate", value: speed === null ? "Unknown" : `${speed.toLocaleString(undefined, { maximumFractionDigits: 1 })} tok/s`, detail: "best recorded point" },
          { label: "Context", value: context === null ? "Unknown" : context.toLocaleString(), detail: "maximum measured tokens" },
          { label: "Measured points", value: sweep.rows.length.toLocaleString(), detail: formatDate(sweep.measured_at) },
          { label: "Engine", value: result?.recipe.engine.name ?? "Unknown", detail: result?.model_instance.weights.precision ?? "precision unknown" },
        ]}
        label="SPEED EVIDENCE"
      />
      <details className="record-section" open>
        <summary><span>Measured points</span><small>{sweep.rows.length.toLocaleString()} rows</small></summary>
        <div className="measurement-table" role="table" aria-label="Speed sweep measurements">
          <div role="row"><span role="columnheader">Context</span><span role="columnheader">Concurrency</span><span role="columnheader">Decode</span><span role="columnheader">TTFT</span></div>
          {sweep.rows.map((row, index) => (
            <div role="row" key={index}>
              <span role="cell">{row.context_tokens?.toLocaleString() ?? "—"}</span>
              <span role="cell">{row.concurrency ?? "—"}</span>
              <span role="cell">{(row.decode_tok_s_per_stream ?? row.decode_tok_s)?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—"} tok/s</span>
              <span role="cell">{row.ttft_ms_p50?.toLocaleString(undefined, { maximumFractionDigits: 1 }) ?? "—"} ms</span>
            </div>
          ))}
        </div>
      </details>
      <Connections relationships={sweep.relationships} />
    </>
  )
}

function RawRecord({ record }: { record: Record<string, unknown> }) {
  return (
    <details className="raw-record">
      <summary><span>Raw registry record</span><small>{Object.keys(record).length.toLocaleString()} fields · source data</small></summary>
      <div className="raw-record-body"><DataTree value={record} /></div>
    </details>
  )
}

export function RecordDetails({ compatibility, modelInstances, record, selectedHardware, topic }: RecordDetailsProps) {
  return (
    <>
      {topic === "hardware" && <HardwareDetails record={record} />}
      {topic === "models" && <ModelDetails modelInstances={modelInstances} record={record} />}
      {topic === "prices" && <PriceDetails record={record} />}
      {topic === "speed-sweeps" && <SpeedDetails record={record} />}
      {topic === "recipes" && compatibility && (
        <>
          <RecipeSummary result={compatibility} selectedHardware={selectedHardware} />
          <Connections relationships={record.relationships} />
        </>
      )}
      <RawRecord record={record} />
    </>
  )
}
