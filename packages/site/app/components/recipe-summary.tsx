import { CopyButton } from "@/app/components/copy-button"
import type { CompatibilityResult } from "@local-ai/registry"
import type { Hardware } from "@local-ai/registry/schema"

function shellValue(value: string): string {
  if (/\$\{[A-Z0-9_]+\}/.test(value)) return `"${value.replaceAll("\\", "\\\\").replaceAll('"', '\\"').replaceAll("`", "\\`")}"`
  return `'${value.replaceAll("'", `'"'"'`)}'`
}

export function dockerCommand(result: CompatibilityResult): string | null {
  const launch = result.recipe.launch
  if (launch.kind !== "docker" || typeof launch.image !== "string") return null
  const lines = ["docker run --rm"]
  if (launch.accelerator_backend === "nvidia") lines.push("  --gpus all")
  if (launch.ipc === "host") lines.push("  --ipc host")
  if (typeof launch.shm_size === "string") lines.push(`  --shm-size ${shellValue(launch.shm_size)}`)
  if (typeof launch.host_port === "number" && typeof launch.container_port === "number") lines.push(`  -p ${launch.host_port}:${launch.container_port}`)
  if (launch.environment && typeof launch.environment === "object") {
    for (const [key, value] of Object.entries(launch.environment)) lines.push(`  -e ${shellValue(`${key}=${String(value)}`)}`)
  }
  if (Array.isArray(launch.mounts)) {
    for (const mount of launch.mounts) {
      if (!mount || typeof mount !== "object" || !("source" in mount) || !("target" in mount)) continue
      const suffix = "read_only" in mount && mount.read_only ? ":ro" : ""
      lines.push(`  -v ${shellValue(`${String(mount.source)}:${String(mount.target)}${suffix}`)}`)
    }
  }
  lines.push(`  ${shellValue(launch.image)}`)
  if (Array.isArray(launch.arguments)) {
    for (const argument of launch.arguments) lines.push(`  ${shellValue(String(argument))}`)
  }
  return lines.map((line, index) => index < lines.length - 1 ? `${line} \\` : line).join("\n")
}

function displayNumber(value: unknown, suffix = ""): string {
  return typeof value === "number" ? `${value.toLocaleString()}${suffix}` : "Unknown"
}

export function RecipeSummary({ result, selectedHardware }: { result: CompatibilityResult; selectedHardware?: Hardware }) {
  const { hardware, model, model_instance: instance, recipe } = result
  const command = dockerCommand(result) ?? `local-ai show ${shellValue(recipe.id)}`
  const executable = recipe.launch.kind === "docker" && dockerCommand(result) !== null
  const selectedDiffers = selectedHardware && selectedHardware.id !== hardware.id

  return (
    <section className="recipe-summary" aria-label="Resolved recipe">
      <div className="recipe-summary-heading">
        <div>
          <span className="mono-label">RESOLVED RECIPE</span>
          <h3>{model.name}</h3>
          <p>{instance.repository}</p>
        </div>
        <span className={`recipe-status ${recipe.status}`}>{recipe.status}</span>
      </div>
      <dl className="recipe-facts">
        <div><dt>{selectedDiffers ? "Recipe target" : "Hardware"}</dt><dd>{recipe.hardware_count > 1 ? `${recipe.hardware_count}× ` : ""}{hardware.name}</dd><small>{hardware.memory.vram_gb.toLocaleString()} GB each · {hardware.accelerator_backend}</small></div>
        {selectedDiffers && <div><dt>Selected hardware</dt><dd>{selectedHardware.name}</dd><small>{selectedHardware.memory.vram_gb.toLocaleString()} GB · capacity match</small></div>}
        <div><dt>Engine</dt><dd>{recipe.engine.name}</dd><small>{recipe.engine.version ?? "Version unknown"}</small></div>
        <div><dt>Weights</dt><dd>{instance.weights.precision ?? "Unknown precision"}</dd><small>{instance.weights.format ?? "Format unknown"} · {displayNumber(instance.weights.size_gb, " GB")}</small></div>
        <div><dt>Context</dt><dd>{displayNumber(recipe.serving.max_context_tokens, " tokens")}</dd><small>TP {displayNumber(recipe.serving.tensor_parallel)}</small></div>
      </dl>
      <div className="recipe-command-heading">
        <div><span className="mono-label">{executable ? "LAUNCH COMMAND" : "RESOLUTION COMMAND"}</span><p>{executable ? "Rendered from the pinned registry fields below." : "This is a reference recipe; no executable launch contract is published."}</p></div>
        <div><CopyButton label="Copy command" value={command} /><CopyButton label="Copy JSON" value={JSON.stringify(recipe, null, 2)} /></div>
      </div>
      <pre className="recipe-command"><code>{command}</code></pre>
    </section>
  )
}
