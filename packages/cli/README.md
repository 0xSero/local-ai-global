# CLI

Detect local hardware, find compatible Local AI recipes, and resolve the selected registry graph.

`local-ai` is a small Bash 5 client over the checked-out registry. It is the interactive local workflow: identify the machine, show recipes it can run, select one in a TUI, and return the complete model, hardware, recipe, and benchmark data needed by a launcher.

## Quick start

From the monorepo root:

```bash
pnpm install
./packages/cli/bin/local-ai detect
./packages/cli/bin/local-ai list
./packages/cli/bin/local-ai choose
```

The CLI requires Bash 5 and `jq`. `search` also requires `rg`. `choose` uses `gum` when available and falls back to Bash's built-in numbered selection menu.

## Workflow

```text
detect hardware -> list compatible recipes -> choose a recipe -> resolve its registry graph
```

The CLI reads the pinned `packages/registry/source/registry` checkout directly. It does not call the hosted API, download model weights, build containers, or launch an inference server yet.

## Commands

### Detect hardware

```bash
local-ai detect
```

Prints the stable registry hardware ID for the current machine.

- macOS uses `system_profiler` to identify the Apple chip and unified memory.
- NVIDIA systems use `nvidia-smi` to match the GPU name and VRAM.
- Other Linux accelerators use `lspci` and, when present, `rocminfo`.

If automatic detection cannot produce an exact registry record, the command fails instead of guessing.

### List compatible recipes

```bash
local-ai list
local-ai list rtx-pro-6000-blackwell-96gb
local-ai list rtx-pro-6000-blackwell-96gb --json
```

Without an ID, `list` detects the local hardware. Each result is marked:

- `exact` when the recipe targets the detected hardware record.
- `capacity` when it targets the same vendor and accelerator backend with no more VRAM than the detected hardware.

Results are ordered by match quality, validation status, model name, and recipe ID.

### Choose in the TUI

```bash
local-ai choose
local-ai choose rtx-pro-6000-blackwell-96gb
```

Shows compatible recipes in `gum` or a numbered terminal menu. The selected recipe is returned as a resolved JSON graph.

### Resolve a recipe

```bash
local-ai show deepseek-fp8-rtx-pro-6000-blackwell-96gb-vllm-tp1
```

Returns:

```json
{
  "recipe": {},
  "model_instance": {},
  "model": {},
  "hardware": {},
  "speed_sweeps": []
}
```

This is the handoff contract for a future launcher: one recipe plus every registry record it references.

### Read one record

```bash
local-ai get hardware rtx-pro-6000-blackwell-96gb
local-ai get model qwen3-8-27b
local-ai get model-instance qwen-qwen3-8-27b--nvfp4
local-ai get recipe deepseek-fp8-rtx-pro-6000-blackwell-96gb-vllm-tp1
```

The collection name maps directly to a directory under `packages/registry/source/registry`.

### Search the registry

```bash
local-ai search qwen
local-ai search blackwell
```

Searches hardware, models, model instances, and recipes. Results are printed as tab-separated collection and ID pairs.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `LOCAL_AI_REGISTRY_DIR` | Workspace `packages/registry/source/registry` | Read a different registry data directory |
| `LOCAL_AI_HARDWARE` | Automatically detected | Force a specific hardware ID |
| `LOCAL_AI_HARDWARE_COUNT` | Detected identical GPU count or `1` | Override the number of available accelerators |

The hardware overrides must still refer to valid registry data:

```bash
LOCAL_AI_HARDWARE=rtx-5090-32gb \
LOCAL_AI_HARDWARE_COUNT=2 \
  local-ai list --json
```

To use a standalone registry checkout:

```bash
LOCAL_AI_REGISTRY_DIR=/path/to/registry local-ai choose
```

## Hardware-count behavior

On NVIDIA systems, the CLI counts GPUs whose reported name and memory match the first detected GPU. Recipes requiring more devices than the available count are excluded.

On macOS and accelerators without an NVIDIA inventory, the default count is one. Set `LOCAL_AI_HARDWARE_COUNT` for an explicitly configured multi-device system.

## Exit behavior

The command exits non-zero when a dependency is unavailable, hardware cannot be matched, a record does not exist, no compatible recipe is found, or arguments are invalid. Errors are written to standard error with a `local-ai:` prefix.

## Development

From the monorepo root:

```bash
bash -n packages/cli/bin/local-ai
./packages/cli/bin/local-ai help
./packages/cli/bin/local-ai get hardware rtx-pro-6000-blackwell-96gb
pnpm --filter @local-ai/cli typecheck
```

Keep hardware, model, and recipe knowledge in `@local-ai/registry`. The CLI should remain a small local interface over that data.
