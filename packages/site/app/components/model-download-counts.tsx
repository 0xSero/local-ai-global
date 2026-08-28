"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type ModelMetrics = {
  downloadsAllTime: number | null
  publishedAt: string | null
}

type DownloadCounts = Record<string, ModelMetrics | null>

const DownloadContext = createContext<DownloadCounts | null>(null)

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value)
}

function published(value: string | null): string {
  if (!value) return "Publication date unavailable"
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return "Publication date unavailable"
  return `Published ${date.toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
}

export function ModelDownloadProvider({ children, repositories }: { children: ReactNode; repositories: string[] }) {
  const unique = useMemo(() => [...new Set(repositories)].sort(), [repositories])
  const [counts, setCounts] = useState<DownloadCounts | null>(null)

  useEffect(() => {
    if (unique.length === 0) {
      setCounts({})
      return
    }
    const controller = new AbortController()
    const search = new URLSearchParams()
    for (const repository of unique) search.append("repository", repository)
    fetch(`/api/huggingface/downloads?${search}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ data: DownloadCounts }> : Promise.reject())
      .then((result) => setCounts(result.data))
      .catch(() => {
        if (!controller.signal.aborted) setCounts({})
      })
    return () => controller.abort()
  }, [unique])

  return <DownloadContext.Provider value={counts}>{children}</DownloadContext.Provider>
}

export function ModelDownloadCount({ repository }: { repository: string | null }) {
  const counts = useContext(DownloadContext)
  const metrics = repository && counts ? counts[repository] : undefined
  const pending = repository !== null && counts === null
  const downloads = metrics?.downloadsAllTime
  return (
    <span className="model-download-count">
      <strong>{pending ? "…" : typeof downloads === "number" ? `${compact(downloads)} downloads` : "—"}</strong>
      <small>{pending ? "Loading HF metadata" : metrics ? published(metrics.publishedAt) : repository ? "HF metadata unavailable" : "Not published on HF"}</small>
    </span>
  )
}
