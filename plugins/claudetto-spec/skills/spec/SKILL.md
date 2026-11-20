---
name: spec
description: Spec-first loop (clarify, spec, red, green, check) for new or changed behaviour only; skip typos, renames, dependency bumps and questions.
license: MIT
---

# Spec

Loop: clarify, spec, red, green, check. Formats and `spec_check` output: `references/FORMAT.md`.

- Specs in this repo: !`git ls-files 'specs/*.md' 2>/dev/null || true`

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root, if present, for constraints before writing the spec. Never create a constitution file.
- Interactive session: ask each expensive unknown through AskUserQuestion.
- No one to answer (non-interactive `-p` run): write the unknown as an `Open:` line, take the cheap default if one exists, and list each assumption in the final reply.

## Spec

- Edit the capability's existing `specs/<capability>.md`, or add one. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>`, one sentence of behaviour, at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.

## Red

1. Write tests in the project's own framework; cite the requirement ID in the test name.
2. Run them and see them fail.
3. `git add` the test files before writing implementation.

## Green

- Implement without editing staged tests.
- If the request contradicts an existing requirement, or a staged test cannot pass honestly, stop and report the conflict naming the requirement ID. Never edit the test or spec to fit.

## Check

- Load `spec_check` through ToolSearch (deferred) and call it.
- Run the project's test command.
- Report both results.
