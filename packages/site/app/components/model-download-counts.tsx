"use client"

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

type DownloadCounts = Record<string, number | null>

const DownloadContext = createContext<DownloadCounts | null>(null)

function compact(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, notation: "compact" }).format(value)
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
  const value = repository && counts ? counts[repository] : undefined
  const pending = repository !== null && counts === null
  return (
    <span className="model-download-count">
      <strong>{pending ? "…" : typeof value === "number" ? compact(value) : "—"}</strong>
      <small>{pending ? "loading HF lifetime" : typeof value === "number" ? "HF lifetime downloads" : "not published"}</small>
    </span>
  )
}
