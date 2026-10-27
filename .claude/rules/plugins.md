---
paths:
  - "plugins/**"
---

A file in `plugins/` imports its own plugin and packages, and no other plugin, `tools/`, or `tests/`, because each plugin installs and works alone.
A file in the import graph of a hooks module (`hooks/register.ts`) has no `node:` import, no `bun:` import, and no use of `Bun`, because Claude Code runs the module in its mod runtime.
When the latest Claude Code has a setting, a hook, or another extension point for a need, use it, and keep runtime code for the needs that it leaves open, because a copy of a built-in feature drifts from it.
