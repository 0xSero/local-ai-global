import type { NextConfig } from "next"
import path from "node:path"

const nextConfig: NextConfig = {
  agentRules: false,
  turbopack: {
    root: path.join(process.cwd(), "../.."),
  },
  outputFileTracingIncludes: {
    "/*": ["../registry/source/registry/**/*.json"],
  },
  transpilePackages: ["@local-ai/api", "@local-ai/registry", "@local-ai/sdk"],
}

export default nextConfig
