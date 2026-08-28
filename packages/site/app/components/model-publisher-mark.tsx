function initials(value: string): string {
  const parts = value.split(/[^a-z0-9]+/i).filter(Boolean)
  if (parts.length > 1) return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
  return value.slice(0, 2).toUpperCase()
}

export function ModelPublisherMark({ className = "model-row-mark", fallback, publisher }: { className?: string; fallback: string; publisher?: string | null }) {
  const label = publisher ?? fallback
  return (
    <span aria-label={`${label} publisher`} className={className} role="img">
      <span aria-hidden="true">{initials(label)}</span>
      {publisher && <img alt="" loading="lazy" src={`/images/models/${encodeURIComponent(publisher)}`} />}
    </span>
  )
}
