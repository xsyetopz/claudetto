---
id: P15
deps: [P14, P33, P35, P36]
owns: ["wiki/Attributions.md", "wiki/Home.md", "wiki/Install.md", "wiki/Quickstart.md", "wiki/Troubleshooting.md", "wiki/_Footer.md", "wiki/_Sidebar.md", "wiki/changelog/", "wiki/core/", "wiki/design/", "wiki/development/", "wiki/evals/", "wiki/plugins/", "wiki/settings/", "README.md", "CHANGELOG.md", "docs/", "tools/wiki.ts"]
verify: bun run lint:md
agent: implementer
---

# P15 Docs

## Goal

Update the docs for 1.0.0: the wiki, the README, and a new `CHANGELOG.md` that starts at 1.0.0, with the numbers of P14.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:181-184`.
- The numbers come from `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`, which P14 writes.
- The `wiki/` folder holds 15 entries in this checkout.
  The entry names `wiki/` as a whole, but P18 owns `wiki/archive/`, so `owns` lists each other entry of `wiki/` by path (`.dotclaude/spec/changes/1.0.0/packages.md:188`).
- The wiki source is `wiki/`, and `just wiki` publishes it (`CLAUDE.md`).
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The Markdown rules: `CLAUDE.md`, with the 100-column bound for headings and code blocks, and `bun run lint:md`.

## Steps

1. Update the pages of `wiki/`, the `README.md`, and `docs/` for the 1.0.0 change.
2. Write `CHANGELOG.md` new, so that it starts at 1.0.0, with the numbers of P14.
3. Run `bun run lint:md`.

## Acceptance

- `bun run lint:md` passes.
- Each number in the docs has the source `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
- A `reviewer` pass on the text finds no claim without a source.

## Boundaries

- Change only the paths of `owns`.
- Write the docs in STE-flavored ASD-STE100, with one sentence on each line.
- Put each code item in inline code.
- Do not edit `wiki/archive/`, because P18 owns it.
