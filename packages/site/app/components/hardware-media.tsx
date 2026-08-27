import type { Hardware } from "@local-ai/registry/schema"

const IMAGE_BY_ID: Record<string, string> = {
  "dgx-spark-gb10-128gb": "/images/hardware/dgx-spark-single.png",
  "rtx-3090-24gb": "/images/hardware/rtx-3090.png",
  "rtx-3090-ti-24gb": "/images/hardware/rtx-3090ti.png",
  "rtx-4090-24gb": "/images/hardware/rtx-4090.png",
  "rtx-5090-32gb": "/images/hardware/rtx-5090.png",
  "rtx-6000-ada-48gb": "/images/hardware/rtx-6000-ada.png",
  "rtx-a6000-48gb": "/images/hardware/rtx-a6000.png",
  "rtx-pro-6000-blackwell-96gb": "/images/hardware/rtx-pro-6000.png",
}

export function hardwareImageSrc(hardware: Hardware): string | null {
  const exact = IMAGE_BY_ID[hardware.id]
  if (exact) return exact
  if (hardware.id.startsWith("apple-") && hardware.products.some((product) => product === "Mac Studio" || product === "Mac Pro")) {
    return "/images/hardware/m3-ultra-mac-studio-cutout.png"
  }
  if (hardware.id.startsWith("apple-") && hardware.products.includes("Mac mini") && !hardware.products.some((product) => product.startsWith("MacBook"))) {
    return "/images/hardware/m4-pro-mac-mini.png"
  }
  if (hardware.id.startsWith("apple-") && hardware.products.some((product) => product.startsWith("MacBook"))) {
    return "/images/hardware/m4-max-macbook-pro-cutout.png"
  }
  return null
}

export function HardwareMedia({ hardware, size = "card" }: { hardware: Hardware; size?: "card" | "hero" }) {
  const src = hardwareImageSrc(hardware)
  return (
    <span className={`hardware-media ${size} ${src ? "has-image" : "vendor-fallback"}`}>
      {src
        ? <img alt={`${hardware.name} product`} loading="lazy" src={src} />
        : <span aria-hidden="true">{hardware.vendor === "nvidia" ? "NV" : hardware.vendor === "apple" ? "" : hardware.vendor === "amd" ? "AMD" : "INTEL"}</span>}
    </span>
  )
}
