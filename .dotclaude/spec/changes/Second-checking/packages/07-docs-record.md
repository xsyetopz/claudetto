---
id: P07
deps: ["P01", "P02", "P03", "P04", "P05", "P06", "P08", "P09"]
owns: ["CHANGELOG.md", "README.md", "docs/", "wiki/", "src/wiki/", ".dotclaude/spec/changes/1.0.0/evidence/second-check-summary.md"]
verify: just check
agent: implementer
---

# P07 Record, changelog, generate, full check

## Goal

Join the evidence of the six areas, write the changelog entry, regenerate `plugins/`, and run the full check once.

## Context

- The evidence files `second-check-*.md` of P01 to P06.
- `CHANGELOG.md`: the section `[1.0.0] - 2026-10-13` is the release in progress or already cut; read `git tag` and `package.json` and put the entry where the state says (a version with no tag is the release in progress), and say which in the report.
- `wiki/` and `src/wiki/`: change a page only where a confirmed fix changes the behavior it describes.
- Run `just generate` here, and only here. `plugins/` is generated, so it is not in `owns`; `dotclaude-spec merge` commits it with the lane files.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-summary.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just check` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Keep a public signature of the kernel.
