import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
  outputFileTracingIncludes: {
    "/*": ["../registry/**/*.json"],
  },
  transpilePackages: ["@local-ai/api", "@local-ai/registry", "@local-ai/sdk"],
}

export default nextConfig
