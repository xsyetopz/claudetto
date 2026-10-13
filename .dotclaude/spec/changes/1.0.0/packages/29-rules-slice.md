---
schema: dotclaude-spec/2
kind: package
id: P29
title: `rules` slice
wave: 3
deps: ["P28","P24","P26","P27"]
owns: ["src/plugins/dotclaude/slices/rules/domain/","src/plugins/dotclaude/slices/rules/adapters/","src/plugins/dotclaude/slices/rules/slice.ts","src/plugins/dotclaude/slices/setup/domain/drift.ts","src/plugins/dotclaude/slices/setup/adapters/mod.ts","tests/dotclaude/setup/rules.test.ts","src/plugins/dotclaude/slices/trim/domain/","src/plugins/dotclaude/slices/surface/adapters/mod.ts","src/plugins/dotclaude/slices/surface/domain/tools.ts","tests/dotclaude/rules/domain/","tests/dotclaude/trim/","tests/dotclaude/surface/"]
satisfies: []
verify: just test tests/dotclaude/rules && just lab
agent: implementer
status: done
---

# P29 `rules` slice

## Goal

dotclaude uses `.claude/rules/`.
The setup and its drift check know each entry of P28.
`trim` and `surface` count rules as a source of context.
Each part of a slice that adds guidance for some files only at runtime becomes a `paths:` rule, when P28 shows that a rule can do the same work.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md:153-157`, and the evidence: `.dotclaude/spec/changes/1.0.0/evidence/claude-directory.md` from P28.
- The rules parts of the setup are in `src/plugins/dotclaude/slices/setup/domain/drift.ts` and `adapters/mod.ts`.
  The `adapters/mod.ts` file also names `rules.ts` in a comment.
- The rules parts of `surface` are in `src/plugins/dotclaude/slices/surface/adapters/mod.ts` and `domain/tools.ts`.
  The `trim` slice has no file that names a rule in this checkout, so its folder is in `owns`.
- The `skills/` folder of the slice `rules` is P30, so this package does not own it.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.
- The findings of step 4: `.dotclaude/spec/changes/1.0.0/evidence/rules-slice.md`.

## Steps

1. Create the slice `rules` in `src/plugins/dotclaude/slices/rules/`, without the folder `skills/`.
2. Change the drift check in `setup/domain/drift.ts` to know each entry of P28.
3. Count the rules as a source of context in `trim` and in `surface`.
4. Turn each runtime guidance for some files into a `paths:` rule, when P28 shows that a rule can do the same work.
5. Write the tests in `tests/dotclaude/setup/rules.test.ts`, `tests/dotclaude/rules/domain/`, `tests/dotclaude/trim/`, and `tests/dotclaude/surface/`.
6. Run `just test tests/dotclaude/rules`, `just lab`, and `just generate`.

## Acceptance

- `just test tests/dotclaude/rules` and `just lab` pass.
- The drift check reports a gap for each entry of P28 that is missing.

## Boundaries

- Change only the paths of `owns`.
- Write each text that goes to Claude in strict ASD-STE100, with no forceful words.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
