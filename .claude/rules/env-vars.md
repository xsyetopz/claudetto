---
paths:
  - "justfile"
  - "plugins/**"
  - "tests/**"
  - "tools/**"
  - "dev/**"
---

Use the env vars of Claude Code and flags.
Add a claudetto env var only when neither can do the work, and give it the prefix `CLAUDETTO_`.
