---
paths:
  - "plugins/**"
  - "tests/**"
  - "tools/**"
  - "package.json"
  - "bunfig.toml"
---

Code that needs Python is Python, and the tests and `tools/` run on Bun 1.4.3 or later, with `bun install` for the dev dependencies.
The core plugin is in `plugins/claudetto/`, next to two add-on plugins: `claudetto-browser` and `claudetto-docs`.
Each add-on plugin works without the core plugin, so it imports nothing from another plugin.
Only `plugins/` ships to users.
`tests/` has one folder for each plugin, with `tests/claudetto/<slice>/` for each slice of the core plugin.
`tests/kernel/` tests `plugins/claudetto/kernel/`, and `tests/support/` holds the helpers of the tests.
`tools/` holds the repository scripts.
`plugins/` is the source of each plugin, and Claude Code reads its files as they are.
An add-on plugin keeps its own copy of each kernel file that it uses, and a test keeps each copy equal to the file in `plugins/claudetto/kernel/`.
