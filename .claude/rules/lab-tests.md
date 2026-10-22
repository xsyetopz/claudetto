---
paths:
  - "plugins/*/tests/*.test.ts"
---

Each plugin with hooks keeps its hook lab tests in `plugins/<name>/tests/`, and `claude plugin test` runs them against the hooks module.
