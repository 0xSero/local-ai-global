"use client"

import { useEffect, useState } from "react"

export function CopyButton({ label, value }: { label: string; value: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle")

  useEffect(() => {
    if (status === "idle") return
    const timeout = window.setTimeout(() => setStatus("idle"), 1800)
    return () => window.clearTimeout(timeout)
  }, [status])

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setStatus("copied")
    } catch {
      const input = document.createElement("textarea")
      input.value = value
      input.style.position = "fixed"
      input.style.opacity = "0"
      document.body.appendChild(input)
      input.select()
      const copied = document.execCommand("copy")
      input.remove()
      setStatus(copied ? "copied" : "failed")
    }
  }

  const text = status === "copied" ? "Copied" : status === "failed" ? "Copy failed" : label
  return <button aria-live="polite" className={`copy-button ${status}`} onClick={copy} type="button">{text}</button>
}
