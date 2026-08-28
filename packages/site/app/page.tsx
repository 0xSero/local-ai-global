import Link from "next/link"

import { HardwareMedia } from "@/app/components/hardware-media"
import { ModalCloseButton, RecordModal } from "@/app/components/record-modal"
import { ModelPublisherMark } from "@/app/components/model-publisher-mark"
import { RecordDetails } from "@/app/components/record-details"
import { RegistrySearch, type SearchFilter } from "@/app/components/registry-search"
import {
  collectionCounts,
  getCompatibilityResult,
  getEntityDetail,
  getFacets,
  getHardware,
  getSpeedSweep,
  listBenchmarks,
  listHardware,
  listModelInstances,
  listModels,
  listPrices,
  listSpeedSweeps,
  marketPriceCount,
  queryCompatibility,
  type CompatibilityFilters,
  type CompatibilityResult,
  type BenchmarkResult,
  type PriceResult,
} from "@local-ai/registry"
import type { Hardware, SpeedRow, SpeedSweep } from "@local-ai/registry/schema"

export const dynamic = "force-dynamic"

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type Topic = "recipes" | "hardware" | "models" | "prices" | "benchmarks" | "speed-sweeps"

type EvidenceRow = SpeedRow & {
  sweepId: string
}

type RowTag = {
  label: string
  name: string
  value: string
}

const TOPICS: Array<{ key: Topic; label: string; countKey: string | null; description: string }> = [
  { key: "recipes", label: "Recipes", countKey: "recipe", description: "Browse model × hardware compatibility by hardware or by model, with engine, launch status, and evidence." },
  { key: "hardware", label: "Hardware", countKey: "hardware", description: "Accelerator specifications connected to compatible models, recipes, and regional prices." },
  { key: "models", label: "Models", countKey: "model", description: "Canonical models connected to artifacts, supported hardware, and recipes." },
  { key: "prices", label: "Prices", countKey: "price", description: "Fresh regional listing observations in native currency. Candidate matches remain inspectable." },
  { key: "benchmarks", label: "Benchmarks", countKey: "speed_sweeps", description: "Comparable model × hardware results derived from raw sweep evidence." },
  { key: "speed-sweeps", label: "Speed Sweeps", countKey: "speed_sweeps", description: "Measured inference evidence connected back to the recipe that produced it." },
]

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumFractionDigits: 0,
  style: "currency",
})

function validTopic(value: string): Topic | "" {
  return TOPICS.some((topic) => topic.key === value) ? value as Topic : ""
}

function numberField(record: Record<string, unknown>, key: string): number | null {
  const value = record[key]
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function formatTokens(value: number | null): string {
  if (value === null) return "Unknown context"
  if (value >= 1024) {
    const thousands = value / 1024
    return `${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}K`
  }
  return value.toLocaleString()
}

function formatRate(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 })
}

function formatAmount(amount: number, currency: string): string {
  return currency === "USD" ? USD_FORMATTER.format(amount) : `${currency} ${amount.toLocaleString()}`
}

function formatDate(value: string | null): string {
  if (!value) return "Date unknown"
  const date = new Date(value)
  return Number.isNaN(date.valueOf())
    ? value
    : date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })
}

function formatBandwidth(value: Hardware["memory"]["bandwidth_gb_per_s"]): string {
  if (typeof value === "number") return `${value.toLocaleString()} GB/s`
  if (value) return `${value.min.toLocaleString()}–${value.max.toLocaleString()} GB/s`
  return "Bandwidth not published"
}

function formatParams(value: number | null): string {
  return value === null ? "Not published" : `${value.toLocaleString(undefined, { maximumFractionDigits: 1 })}B`
}

function recipeEvidence(result: CompatibilityResult): EvidenceRow[] {
  return result.recipe.speed_sweeps_ids.flatMap((sweepId) => {
    const sweep = getSpeedSweep(sweepId)
    return sweep ? sweep.rows.map((row) => ({ ...row, sweepId })) : []
  })
}

function peakRecipeSpeed(result: CompatibilityResult): number | null {
  const values = recipeEvidence(result).flatMap((row) => {
    const value = row.decode_tok_s_per_stream ?? row.decode_tok_s ?? row.prefill_tok_s
    return typeof value === "number" ? [value] : []
  })
  return values.length > 0 ? Math.max(...values) : null
}

function peakSweepSpeed(sweep: SpeedSweep): number | null {
  const values = sweep.rows.flatMap((row) => {
    const value = row.decode_tok_s_per_stream ?? row.decode_tok_s ?? row.prefill_tok_s
    return typeof value === "number" ? [value] : []
  })
  return values.length > 0 ? Math.max(...values) : null
}

function hrefWithRecord(state: URLSearchParams, id: string): string {
  const selected = new URLSearchParams(state)
  selected.set("record", id)
  return `/?${selected.toString()}`
}

function hrefWithFilter(state: URLSearchParams, name: string, value: string): string {
  const selected = new URLSearchParams(state)
  selected.delete("record")
  selected.delete("offset")
  selected.set(name, value)
  return `/?${selected.toString()}`
}

function stateHref(state: URLSearchParams): string {
  const query = state.toString()
  return query ? `/?${query}` : "/"
}

function compatibilityTitle(id: string): string | null {
  const result = getCompatibilityResult(id)
  if (!result) return null
  const hardware = result.recipe.hardware_count > 1
    ? `${result.recipe.hardware_count}× ${result.hardware.name}`
    : result.hardware.name
  return `${result.model.name} on ${hardware}`
}

function recordTitle(detail: Record<string, unknown>, fallback: string, topic: Topic): string {
  if (topic === "recipes") return compatibilityTitle(fallback) ?? fallback
  if (topic === "benchmarks") {
    const benchmark = detail as BenchmarkResult
    return `${benchmark.model.name} on ${benchmark.hardware.name} · benchmark`
  }
  if (topic === "speed-sweeps") {
    const sweep = getSpeedSweep(fallback)
    const title = sweep ? compatibilityTitle(sweep.recipe_id) : null
    if (title) return `${title} · speed sweep`
  }
  if (typeof detail.name === "string") return detail.name
  if (typeof detail.repository === "string") return detail.repository
  const product = detail.product
  if (product && typeof product === "object" && "name" in product && typeof product.name === "string") return product.name
  const model = detail.model
  if (model && typeof model === "object" && "name" in model && typeof model.name === "string") return model.name
  if (typeof detail.id === "string") return detail.id
  return fallback
}

function facetOptions(values: Array<string | number>, allLabel: string, format: (value: string | number) => string = String): SearchFilter["options"] {
  return [{ label: allLabel, value: "" }, ...values.map((value) => ({ label: format(value), value: String(value) }))]
}

function TaxonomyTags({ state, tags }: { state: URLSearchParams; tags: RowTag[] }) {
  return (
    <span className="taxonomy-tags">
      {tags.slice(0, 4).map((tag) => (
        <Link aria-label={`Filter by ${tag.label}`} href={hrefWithFilter(state, tag.name, tag.value)} key={`${tag.name}:${tag.value}`}>
          {tag.label}
        </Link>
      ))}
    </span>
  )
}

function RecipeRows({ by, data, state }: { by: "hardware" | "model"; data: CompatibilityResult[]; state: URLSearchParams }) {
  return (
    <div className="browser-list recipe-browser-list">
      {data.map((result) => {
        const context = numberField(result.recipe.serving, "max_context_tokens")
        const speed = peakRecipeSpeed(result)
        const validation = result.launchable ? "validated" : "candidate"
        const tags: RowTag[] = [
          { label: validation, name: "validation", value: validation },
          { label: result.recipe.engine.name, name: "engine", value: result.recipe.engine.name },
          { label: result.speed_evidence.available ? "measured" : "unmeasured", name: "evidence", value: String(result.speed_evidence.available) },
          { label: `${result.hardware.memory.vram_gb} GB+`, name: "min_vram_gb", value: String(result.hardware.memory.vram_gb) },
        ]
        return (
          <article className="browser-row recipe-browser-row" key={result.id}>
            <Link aria-label={`Open ${result.model.name} recipe`} className="row-open" href={hrefWithRecord(state, result.id)} scroll={false} />
            <span className={`status-mark ${result.launchable ? "validated" : "candidate"}`} aria-hidden="true" />
            {by === "hardware" ? (
              <>
                <span className="row-primary"><strong>{result.hardware.name}</strong><small>{result.recipe.hardware_count} × {result.hardware.memory.vram_gb} GB</small></span>
                <span><strong>{result.model.name}</strong><small>{result.model_instance.weights.precision ?? result.model_instance.weights.format ?? "Unknown precision"}</small></span>
              </>
            ) : (
              <>
                <span className="row-primary"><strong>{result.model.name}</strong><small>{result.model_instance.weights.precision ?? result.model_instance.weights.format ?? "Unknown precision"}</small></span>
                <span><strong>{result.hardware.name}</strong><small>{result.recipe.hardware_count} × {result.hardware.memory.vram_gb} GB</small></span>
              </>
            )}
            <span><strong>{result.recipe.engine.name}</strong><small>{result.recipe.launch.kind}</small></span>
            <span><strong>{formatTokens(context)}</strong><small>context</small></span>
            <span><strong>{speed === null ? "—" : `${formatRate(speed)} tok/s`}</strong><small>{result.speed_evidence.available ? "measured" : "no evidence"}</small></span>
            <TaxonomyTags state={state} tags={tags} />
            <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
          </article>
        )
      })}
    </div>
  )
}

function PriceRows({ data, state }: { data: PriceResult[]; state: URLSearchParams }) {
  return (
    <div className="browser-list collection-list">
      {data.map((record) => {
        const amount = record.summary.lowest_new ?? record.summary.lowest_refurbished ?? record.summary.lowest_used
        const condition = record.summary.lowest_new !== null
          ? "new"
          : record.summary.lowest_refurbished !== null ? "refurbished" : record.summary.lowest_used !== null ? "used" : "unavailable"
        const tags: RowTag[] = [
          { label: record.region.code, name: "region", value: record.region.code },
          { label: record.product.category, name: "category", value: record.product.category },
          { label: condition, name: "condition", value: condition },
        ]
        return (
          <article className="browser-row price-row" key={record.id}>
            <Link aria-label={`Open ${record.product.name} market observations`} className="row-open" href={hrefWithRecord(state, record.id)} scroll={false} />
            <span className="row-primary"><strong>{record.product.name}</strong><small>{record.product.category}</small></span>
            <span><strong>{amount === null ? "No available listing" : formatAmount(amount, record.region.currency)}</strong><small>lowest available · {condition}</small></span>
            <span><strong>{record.region.name}</strong><small>{record.region.currency}</small></span>
            <span><strong>{record.observed_at.slice(0, 10)}</strong><small>observed</small></span>
            <span><strong>{record.summary.listing_count} listings</strong><small>{record.summary.retailer_count} retailers</small></span>
            <TaxonomyTags state={state} tags={tags} />
            <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
          </article>
        )
      })}
    </div>
  )
}

function BenchmarkRows({ data, state }: { data: BenchmarkResult[]; state: URLSearchParams }) {
  return (
    <div className="browser-list benchmark-list">
      {data.map((benchmark) => {
        const precision = benchmark.model_instance.precision ?? benchmark.model_instance.format ?? "Unknown precision"
        const tags: RowTag[] = [
          { label: benchmark.hardware.vendor, name: "q", value: benchmark.hardware.vendor },
          { label: benchmark.engine.name, name: "q", value: benchmark.engine.name },
          { label: `${benchmark.hardware.total_memory_gb} GB`, name: "q", value: `${benchmark.hardware.total_memory_gb} GB` },
        ]
        return (
          <article className="browser-row benchmark-row" key={benchmark.id}>
            <Link aria-label={`Open benchmark for ${benchmark.model.name}`} className="row-open" href={hrefWithRecord(state, benchmark.id)} scroll={false} />
            <span className="row-primary"><strong>{benchmark.model.name}</strong><small>{precision} · {formatDate(benchmark.measured_at)}</small></span>
            <span><strong>{benchmark.hardware.name}</strong><small>{benchmark.hardware.count} × {benchmark.hardware.memory_gb} GB</small></span>
            <span><strong>{benchmark.engine.name}</strong><small>{benchmark.metrics.point_count} points</small></span>
            <span><strong>{benchmark.metrics.peak_decode_tok_s === null ? "—" : `${formatRate(benchmark.metrics.peak_decode_tok_s)} tok/s`}</strong><small>peak decode</small></span>
            <span><strong>{benchmark.metrics.peak_prefill_tok_s === null ? "—" : `${formatRate(benchmark.metrics.peak_prefill_tok_s)} tok/s`}</strong><small>peak prefill</small></span>
            <span><strong>{formatTokens(benchmark.metrics.max_context_tokens)}</strong><small>{benchmark.metrics.best_ttft_ms === null ? "TTFT unknown" : `${formatRate(benchmark.metrics.best_ttft_ms)} ms TTFT`}</small></span>
            <TaxonomyTags state={state} tags={tags} />
            <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
          </article>
        )
      })}
    </div>
  )
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams
  const value = (key: string) => {
    const selected = params[key]
    return Array.isArray(selected) ? selected[0] : selected ?? ""
  }

  const topic = validTopic(value("topic"))
  const query = value("q")
  const validation = value("validation")
  const recipeBrowse = value("by") === "model" ? "model" : "hardware"
  const offset = Math.max(0, Number(value("offset")) || 0)
  const limit = topic === "recipes" ? 24 : 32
  const pagination = { limit, offset }
  const facets = getFacets()
  const counts = collectionCounts()

  const recipeFilters: CompatibilityFilters = {
    engine: value("engine"),
    evidence: value("evidence"),
    hardware_id: value("hardware_id"),
    launchable: validation === "validated" ? "true" : validation === "candidate" ? "false" : "",
    min_vram_gb: value("min_vram_gb"),
    model_id: value("model_id"),
    q: query,
    sort_by: recipeBrowse,
  }
  const overviewRecipes = queryCompatibility({ launchable: "true" }, { limit: 8, offset: 0 })
  const recipeResults = topic === "recipes" ? queryCompatibility(recipeFilters, pagination) : { data: [], total: 0 }
  const hardwareResults = topic === "hardware" ? listHardware({
    backend: value("backend"),
    min_vram_gb: value("min_vram_gb"),
    priced_only: value("priced_only"),
    q: query,
    vendor: value("vendor"),
  }, pagination) : { data: [], total: 0 }
  const modelResults = topic === "models" ? listModels({
    architecture: value("architecture"),
    family: value("family"),
    q: query,
  }, pagination) : { data: [], total: 0 }
  const priceResults = topic === "prices" ? listPrices({
    category: value("category"),
    condition: value("condition"),
    in_stock: value("in_stock"),
    q: query,
    region: value("region"),
    retailer: value("retailer"),
  }, pagination) : { data: [], total: 0 }
  const priceTotal = counts.price ?? (topic === "prices" ? priceResults.total : listPrices({}, { limit: 1, offset: 0 }).total)
  const benchmarkResults = topic === "benchmarks" ? listBenchmarks({ q: query }, pagination) : { data: [], total: 0 }
  const sweepResults = topic === "speed-sweeps" ? listSpeedSweeps({ q: query }, pagination) : { data: [], total: 0 }

  const filterKeys: Partial<Record<Topic, string[]>> = {
    hardware: ["vendor", "backend", "min_vram_gb", "priced_only"],
    models: ["family", "architecture"],
    prices: ["region", "category", "condition", "retailer", "in_stock"],
    recipes: ["by", "hardware_id", "model_id", "validation", "engine", "evidence"],
  }
  const viewState = new URLSearchParams()
  if (topic) viewState.set("topic", topic)
  if (topic === "recipes") viewState.set("by", recipeBrowse)
  if (query) viewState.set("q", query)
  for (const key of topic ? filterKeys[topic] ?? [] : []) {
    const selected = value(key)
    if (selected) viewState.set(key, selected)
  }
  if (offset > 0) viewState.set("offset", String(offset))

  const detailCollection = topic
  const selectedRecord = detailCollection && value("record") ? getEntityDetail(detailCollection, value("record")) : undefined
  const selectedModelInstances = topic === "models" && value("record")
    ? listModelInstances({ model_id: value("record") }, { limit: 100, offset: 0 }).data
    : []
  const selectedCompatibility = topic === "recipes" && value("record") ? getCompatibilityResult(value("record")) : undefined
  const selectedHardware = value("hardware_id") ? getHardware(value("hardware_id")) : undefined
  const closeHref = stateHref(viewState)
  const selectedTitle = selectedRecord && topic ? recordTitle(selectedRecord, value("record"), topic) : ""
  const total = topic === "recipes"
    ? recipeResults.total
    : topic === "hardware"
      ? hardwareResults.total
      : topic === "models"
        ? modelResults.total
        : topic === "prices"
          ? priceResults.total
          : topic === "benchmarks"
            ? benchmarkResults.total
            : topic === "speed-sweeps" ? sweepResults.total : 0
  const topicLabel = TOPICS.find((item) => item.key === topic)?.label
  const topicDescription = TOPICS.find((item) => item.key === topic)?.description

  const pageState = new URLSearchParams(viewState)
  pageState.delete("offset")
  const previousState = new URLSearchParams(pageState)
  previousState.set("offset", String(Math.max(0, offset - limit)))
  const nextState = new URLSearchParams(pageState)
  nextState.set("offset", String(offset + limit))

  const recipeSearchFilters: SearchFilter[] = [
    { label: "Browse", name: "by", value: recipeBrowse, options: [{ label: "By hardware", value: "hardware" }, { label: "By model", value: "model" }] },
    { label: "Hardware", name: "hardware_id", value: value("hardware_id"), options: [{ label: "All hardware", value: "" }, ...listHardware({}, { limit: 200, offset: 0 }).data.map((hardware) => ({ label: hardware.name, value: hardware.id }))] },
    { label: "Model", name: "model_id", value: value("model_id"), options: [{ label: "All models", value: "" }, ...listModels({}, { limit: 200, offset: 0 }).data.map((model) => ({ label: model.name, value: model.id }))] },
    { label: "Status", name: "validation", value: validation, options: facetOptions(["validated", "candidate"], "All statuses", (item) => item === "validated" ? "Validated · launch-safe" : "Candidate or reference") },
    { label: "Engine", name: "engine", value: value("engine"), options: facetOptions(facets.recipes.engine, "Any engine") },
    { label: "Evidence", name: "evidence", value: value("evidence"), options: facetOptions(["true", "false"], "Any evidence", (item) => item === "true" ? "Measured speed attached" : "No measured speed") },
  ]
  const hardwareSearchFilters: SearchFilter[] = [
    { label: "Vendor", name: "vendor", value: value("vendor"), options: facetOptions(facets.hardware.vendor, "Any vendor") },
    { label: "Backend", name: "backend", value: value("backend"), options: facetOptions(facets.hardware.backend, "Any backend") },
    { label: "Memory", name: "min_vram_gb", value: value("min_vram_gb"), options: facetOptions(facets.hardware.vram_gb, "Any memory", (item) => `At least ${item} GB`) },
    { label: "Pricing", name: "priced_only", value: value("priced_only"), options: facetOptions(["true"], "All hardware", () => "Priced only") },
  ]
  const modelSearchFilters: SearchFilter[] = [
    { label: "Family", name: "family", value: value("family"), options: facetOptions(facets.models.family, "Any family") },
    { label: "Architecture", name: "architecture", value: value("architecture"), options: facetOptions(facets.models.architecture, "Any architecture") },
  ]
  const priceSearchFilters: SearchFilter[] = [
    { label: "Region", name: "region", value: value("region"), options: facetOptions(facets.prices.region, "Any region") },
    { label: "Category", name: "category", value: value("category"), options: facetOptions(facets.prices.category, "Any category") },
    { label: "Condition", name: "condition", value: value("condition"), options: facetOptions(facets.prices.condition, "Any condition") },
    { label: "Retailer", name: "retailer", value: value("retailer"), options: facetOptions(facets.prices.retailer, "Any retailer") },
    { label: "Availability", name: "in_stock", value: value("in_stock"), options: facetOptions(["true", "false", "unknown"], "Any availability", (item) => item === "true" ? "In stock" : item === "false" ? "Out of stock" : "Unknown stock") },
  ]
  const topicFilters = topic === "recipes"
    ? recipeSearchFilters
    : topic === "hardware"
      ? hardwareSearchFilters
      : topic === "models"
        ? modelSearchFilters
        : topic === "prices" ? priceSearchFilters : []

  return (
    <main className="registry-main">
      <nav aria-label="Registry collections" className="topic-tabs">
        {TOPICS.map((item) => (
          <Link aria-current={topic === item.key ? "page" : undefined} href={`/?topic=${item.key}`} key={item.key}>{item.label}</Link>
        ))}
      </nav>

      {!topic ? (
        <>
          <header className="overview-heading"><span className="mono-label">READ-ONLY / SOURCE-BACKED</span><h1>Registry index</h1></header>
          <section className="overview-search" aria-label="Search recipes"><RegistrySearch filters={[]} query="" topic="" /></section>
          <nav aria-label="Registry topic counts" className="topic-index">
            {TOPICS.map((item, index) => {
              const count = item.key === "prices" ? priceTotal : item.countKey ? counts[item.countKey] : undefined
              return (
                <Link href={`/?topic=${item.key}`} key={item.key}>
                  <span className="mono-label">0{index + 1}</span><strong>{item.label}</strong><span>{typeof count === "number" ? count.toLocaleString() : "—"}</span>
                </Link>
              )
            })}
          </nav>
          <section className="overview-recipes">
            <div className="section-heading"><div><span className="mono-label">VALIDATED / LAUNCH-SAFE</span><h2>Launch-safe recipes</h2></div><Link href="/?topic=recipes&validation=validated">View all</Link></div>
            <RecipeRows by="model" data={overviewRecipes.data} state={new URLSearchParams("topic=recipes&by=model&validation=validated")} />
          </section>
        </>
      ) : (
        <>
          <header className="topic-heading"><div><span className="mono-label">COLLECTION / {topic.toUpperCase()}</span><h1>{topicLabel}</h1><p className="topic-description">{topicDescription}</p></div><span className="topic-total">{total.toLocaleString()} records</span></header>
          <section className="topic-search" aria-label={`${topicLabel} search`}><RegistrySearch filters={topicFilters} query={query} topic={topic} /></section>

          {topic === "recipes" && <RecipeRows by={recipeBrowse} data={recipeResults.data} state={viewState} />}
          {topic === "hardware" && (
            <div className="browser-list hardware-catalog-list">
              {hardwareResults.data.map((hardware) => {
                const hasPrices = marketPriceCount(hardware.id) > 0
                const recipeCount = queryCompatibility({ hardware_id: hardware.id }, { limit: 1, offset: 0 }).total
                const tags: RowTag[] = [
                  { label: hardware.vendor, name: "vendor", value: hardware.vendor },
                  { label: hardware.accelerator_backend, name: "backend", value: hardware.accelerator_backend },
                  { label: `${hardware.memory.vram_gb} GB+`, name: "min_vram_gb", value: String(hardware.memory.vram_gb) },
                  ...(hasPrices ? [{ label: "priced", name: "priced_only", value: "true" }] : []),
                ]
                return (
                  <article className="browser-row hardware-catalog-row" key={hardware.id}>
                    <Link aria-label={`Open ${hardware.name}`} className="row-open" href={hrefWithRecord(viewState, hardware.id)} scroll={false} />
                    <HardwareMedia hardware={hardware} />
                    <span className="row-primary"><strong>{hardware.name}</strong><small>{hardware.family ?? hardware.kind}</small></span>
                    <span><strong>{hardware.memory.vram_gb} GB</strong><small>{hardware.memory.vram_type ?? "Memory type unknown"}</small></span>
                    <span><strong>{formatBandwidth(hardware.memory.bandwidth_gb_per_s)}</strong><small>{hardware.accelerator_backend}</small></span>
                    <span><strong>{recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}</strong><small>{marketPriceCount(hardware.id)} price {marketPriceCount(hardware.id) === 1 ? "region" : "regions"}</small></span>
                    <TaxonomyTags state={viewState} tags={tags} />
                    <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
                  </article>
                )
              })}
            </div>
          )}
          {topic === "models" && (
            <div className="browser-list model-catalog-list">
              {modelResults.data.map((model) => {
                const instances = listModelInstances({ model_id: model.id }, { limit: 100, offset: 0 }).data
                const recipeCount = queryCompatibility({ model_id: model.id }, { limit: 1, offset: 0 }).total
                const publisher = model.huggingface.repository?.split("/")[0]
                const tags: RowTag[] = [
                  { label: model.family, name: "family", value: model.family },
                  ...(model.architecture ? [{ label: model.architecture, name: "architecture", value: model.architecture }] : []),
                ]
                return (
                  <article className="browser-row model-catalog-row" key={model.id}>
                    <Link aria-label={`Open ${model.name}`} className="row-open" href={hrefWithRecord(viewState, model.id)} scroll={false} />
                    <ModelPublisherMark fallback={model.family || model.name} publisher={publisher} />
                    <span className="row-primary"><strong>{model.name}</strong><small>{model.huggingface.repository ?? model.family}</small></span>
                    <span><strong>{formatParams(model.params)}</strong><small>{model.active_params === null ? "parameter count" : `${formatParams(model.active_params)} active`}</small></span>
                    <span><strong>{model.architecture ? model.architecture.toUpperCase() : model.family}</strong><small>{model.architecture ? "registry topology" : "model family"}</small></span>
                    <span><strong>{recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}</strong><small>{instances.length} published {instances.length === 1 ? "variant" : "variants"}</small></span>
                    <TaxonomyTags state={viewState} tags={tags} />
                    <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
                  </article>
                )
              })}
            </div>
          )}
          {topic === "prices" && <PriceRows data={priceResults.data} state={viewState} />}
          {topic === "benchmarks" && <BenchmarkRows data={benchmarkResults.data} state={viewState} />}
          {topic === "speed-sweeps" && (
            <div className="browser-list collection-list">
              {sweepResults.data.map((sweep) => {
                const speed = peakSweepSpeed(sweep)
                const result = getCompatibilityResult(sweep.recipe_id)
                const title = result ? `${result.model.name} on ${result.hardware.name}` : "Unlinked speed sweep"
                const precision = result?.model_instance.weights.precision ?? result?.model_instance.weights.format ?? "Unknown precision"
                const tags: RowTag[] = [
                  ...(result ? [
                    { label: result.hardware.vendor, name: "q", value: result.hardware.vendor },
                    { label: result.recipe.engine.name, name: "q", value: result.recipe.engine.name },
                  ] : []),
                  { label: "measured", name: "q", value: "measured" },
                ]
                return (
                  <article className="browser-row collection-row" key={sweep.id}>
                    <Link aria-label={`Open speed sweep for ${title}`} className="row-open" href={hrefWithRecord(viewState, sweep.id)} scroll={false} />
                    <span className="row-primary"><strong>{result?.model.name ?? "Unlinked recipe"}</strong><small>{precision} · {formatDate(sweep.measured_at)}</small></span>
                    <span><strong>{result?.hardware.name ?? "Hardware unknown"}</strong><small>{result ? `${result.recipe.hardware_count} × ${result.hardware.memory.vram_gb} GB` : "No linked hardware"}</small></span>
                    <span><strong>{result?.recipe.engine.name ?? "Engine unknown"}</strong><small>{sweep.rows.length} measured points</small></span>
                    <span><strong>{speed === null ? "—" : `${formatRate(speed)} tok/s`}</strong><small>peak recorded</small></span>
                    <TaxonomyTags state={viewState} tags={tags} />
                    <svg aria-hidden="true" className="row-arrow" viewBox="0 0 20 20"><path d="m7 4 6 6-6 6" /></svg>
                  </article>
                )
              })}
            </div>
          )}

          {total === 0 && <div className="empty-state"><h2>No records found.</h2><p>Clear the search or remove a filter.</p></div>}
          {(offset > 0 || offset + limit < total) && (
            <nav aria-label={`${topicLabel} pages`} className="pagination">
              {offset > 0 ? <Link href={stateHref(previousState)}>Previous</Link> : <span />}
              <span>{offset + 1}–{Math.min(offset + limit, total)} of {total}</span>
              {offset + limit < total ? <Link href={stateHref(nextState)}>Next</Link> : <span />}
            </nav>
          )}
        </>
      )}

      {selectedRecord && detailCollection && (
        <RecordModal closeHref={closeHref} titleId="record-modal-title">
          <header className="record-modal-header">
            <div>
              <span className="mono-label">{detailCollection.toUpperCase()} / RECORD</span>
              <h2 id="record-modal-title">{selectedTitle}</h2>
              <code>{String(selectedRecord.id ?? value("record"))}</code>
            </div>
            <ModalCloseButton className="modal-close" closeHref={closeHref} label="Close record details">Close</ModalCloseButton>
          </header>
          <div className="record-modal-body">
            <RecordDetails
              compatibility={selectedCompatibility}
              modelInstances={selectedModelInstances}
              record={selectedRecord}
              selectedHardware={selectedHardware}
              topic={topic}
            />
          </div>
          <footer className="record-modal-footer">
            <a href={`/api/v1/${detailCollection}/${value("record")}`}>JSON API</a>
            <Link href={`/${detailCollection}/${value("record")}`}>Permanent record URL</Link>
          </footer>
        </RecordModal>
      )}
    </main>
  )
}
