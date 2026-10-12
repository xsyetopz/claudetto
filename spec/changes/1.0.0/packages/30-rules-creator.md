---
id: P30
deps: [P28]
owns: ["src/plugins/dotclaude/slices/rules/skills/", "tests/dotclaude/rules/skills.test.ts"]
verify: just validate
agent: implementer
---

# P30 `/rules-creator` skill

## Goal

Write the skill `/rules-creator`, based on the `skill-creator` skill of Anthropic.
The skill is short, and it covers each needed area: scope, `paths` globs and their limits, user or project folder, the split of a large `CLAUDE.md`, a check that each glob matches files, and the start cost.

## Context

- The entry: `spec/changes/1.0.0/packages.md:158-161`.
- The evidence for the `paths` globs and the scope comes from P28: `spec/changes/1.0.0/evidence/claude-directory.md`.
- The skill goes in `src/plugins/dotclaude/slices/rules/skills/`, and the generator reads it (`tools/generate/emit/slices.ts:52-57`).
- The rules of the wave: `spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. Write the skill in `src/plugins/dotclaude/slices/rules/skills/`, with each area of the Goal.
2. Write `tests/dotclaude/rules/skills.test.ts` for the skill: a check that each glob matches at least one file, and a check of the start cost.
3. Run `just generate` and `just validate`.

## Acceptance

- `just validate` passes.
- A `reviewer` pass on the text finds no forceful word and no claim without a source.

## Boundaries

- Change only the paths of `owns`.
- Write the skill text in strict ASD-STE100, with no forceful word.
- Use arrow functions, and add no legacy shim.
