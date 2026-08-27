# Omarchy plugin

The Omarchy-specific presentation and lifecycle adapter. It owns the bar panel, menu-facing commands, container lifecycle, and agent configuration. It does not own model, hardware, recipe, price, or benchmark data.

The current Omarchy implementation is preserved here as an integration package. Its next consolidation step is to call `@local-ai/cli` and the read-only API instead of maintaining a second catalog shape.
