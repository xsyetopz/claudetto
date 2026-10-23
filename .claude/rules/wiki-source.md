---
paths:
  - "src/wiki/**"
  - "docs/**"
---

Docs, design, and evidence: the [wiki](https://github.com/xsyetopz/claudetto/wiki), with its source in `src/wiki/`.
Write public docs in `src/wiki/`, run `just generate` to write `wiki/`, and run `just wiki` to publish them.
`docs/README.md` only links to the wiki.
`external/` holds local sources, and git ignores it.
