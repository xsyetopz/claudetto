---
name: spec
description: Use for every request to add or change behaviour, such as a new feature or rule, also in a repo with no specs/ yet; and before changing code, tests or specs in a repo with specs/, including "make the tests pass" or "the test is wrong" requests - spec, failing tests, then code (clarify, spec, red, green, check). Skip typos, renames, dependency bumps and questions.
license: MIT
---

# Spec

Loop: clarify, spec, red, green, check. Formats and `spec_check` output: `references/FORMAT.md`.

First Glob `specs/*.md` and read the specs the request touches.

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
- A requirement changes only when the request cites its ID or says to change the spec. Describing the new behaviour, "change whatever is needed", "the test is wrong" or a deadline does not.
- If the request contradicts a requirement it does not cite, or a staged test cannot pass honestly, change nothing: stop and report the conflict naming the requirement ID. Never edit the test or spec to fit.

## Check

- Load `spec_check` through ToolSearch (deferred) and call it.
- Run the project's test command.
- Report both results.
