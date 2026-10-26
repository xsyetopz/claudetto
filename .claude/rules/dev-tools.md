---
paths:
  - "dev/**"
  - "tools/**"
  - "justfile"
---

`tools/` holds the scripts of the free gate (`just check`), and `dev/` holds the paid and manual tools, such as the sandbox and the evals.
A `dev/` file can import `tools/`, and a `tools/` file imports no `dev/` file.
Each tool has a caller in `justfile`, `package.json`, `biome.json`, or `.github/workflows/`, which `tests/repo/tool-callers.test.ts` checks.
`tools/check.ts` runs the steps of `just check`, and the CI workflow runs `bun tools/check.ts --ci`.
