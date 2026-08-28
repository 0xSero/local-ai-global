import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { getRegistryIndex, listBenchmarks } from "../src/index"

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const sourceRoot = path.join(packageRoot, "source")
const registryRoot = path.join(sourceRoot, "registry")
const output = path.join(packageRoot, "dist", "huggingface")
const dataDirectory = path.join(output, "data")

function readJson(file: string): unknown {
  return JSON.parse(readFileSync(path.join(registryRoot, file), "utf8"))
}

function collection(collection: string): unknown[] {
  const ids = getRegistryIndex().collections[collection]
  return ids.map((id) => {
    if (collection !== "price") return readJson(`${collection}/${id}.json`)
    const separator = id.lastIndexOf("--")
    return readJson(`price/${id.slice(0, separator)}/${id.slice(separator + 2)}.json`)
  })
}

function benchmarks(): unknown[] {
  const records: unknown[] = []
  let offset = 0
  while (true) {
    const page = listBenchmarks({}, { limit: 500, offset })
    records.push(...page.data)
    offset += page.data.length
    if (offset >= page.total || page.data.length === 0) return records
  }
}

function writeJsonl(name: string, records: unknown[]): void {
  writeFileSync(path.join(dataDirectory, `${name}.jsonl`), `${records.map((record) => JSON.stringify(record)).join("\n")}\n`)
}

rmSync(output, { force: true, recursive: true })
mkdirSync(dataDirectory, { recursive: true })
cpSync(path.join(registryRoot, "huggingface", "README.md"), path.join(output, "README.md"))
cpSync(path.join(registryRoot, "schema"), path.join(output, "schema"), { recursive: true })

writeJsonl("hardware", collection("hardware"))
writeJsonl("models", collection("model"))
writeJsonl("model-instances", collection("model-instance"))
writeJsonl("recipes", collection("recipe"))
writeJsonl("prices", collection("price"))
writeJsonl("speed-sweeps", collection("speed-sweeps"))
writeJsonl("benchmarks", benchmarks())

const revision = execFileSync("git", ["rev-parse", "HEAD"], { cwd: sourceRoot, encoding: "utf8" }).trim()
writeFileSync(path.join(output, "source.json"), `${JSON.stringify({
  exported_at: new Date().toISOString(),
  schema_version: getRegistryIndex().schema_version,
  source_repository: "https://github.com/0xSero/local-ai-registry",
  source_revision: revision,
}, null, 2)}\n`)

execFileSync("tar", [
  "-czf",
  path.join(output, "registry-snapshot.tar.gz"),
  "-C",
  registryRoot,
  "index.json",
  "hardware",
  "model",
  "model-instance",
  "price",
  "recipe",
  "speed-sweeps",
  "schema",
])

console.log(output)
