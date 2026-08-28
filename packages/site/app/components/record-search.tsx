"use client"

import { usePathname, useRouter } from "next/navigation"
import { useRef, useTransition, type FormEvent } from "react"

type RecordSearchProps = {
  query: string
}

export function RecordSearch({ query }: RecordSearchProps) {
  const debounceRef = useRef<NodeJS.Timeout | undefined>(undefined)
  const formRef = useRef<HTMLFormElement>(null)
  const pathname = usePathname()
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function apply() {
    const input = formRef.current?.elements.namedItem("q")
    if (!(input instanceof HTMLInputElement)) return
    const params = new URLSearchParams()
    if (input.value.trim()) params.set("q", input.value.trim())
    const suffix = params.toString()
    startTransition(() => router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false }))
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    clearTimeout(debounceRef.current)
    apply()
  }

  function searchSoon() {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(apply, 240)
  }

  return (
    <form action={pathname} aria-busy={pending} aria-label="Search connected registry data" className="record-search" method="get" onSubmit={submit} ref={formRef} role="search">
      <label>
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
        <span className="sr-only">Search connected registry data</span>
        <input autoComplete="off" defaultValue={query} key={query} name="q" onInput={searchSoon} placeholder="Search recipes, hardware, models, instances, and prices" type="search" />
      </label>
      <span>Filters every connected record on this page</span>
      <noscript><button type="submit">Search</button></noscript>
    </form>
  )
}
