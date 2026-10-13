---
paths:
  - "src/plugins/**/*.ts"
  - "plugins/**"
---

Each add-on plugin works without the core plugin, so it imports nothing from another plugin.

No file in `plugins/` imports another plugin, `tools/`, or `tests/`.
