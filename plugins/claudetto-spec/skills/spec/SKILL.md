---
name: spec
description: Use before writing code for any request that adds or changes behaviour (a new function, feature or rule), also in a repo with no specs/ yet; and before changing code, tests or specs in a repo with specs/, including "make the tests pass" or "the test is wrong" requests - spec, failing tests, then code (clarify, spec, red, green, check). Skip typos, renames, dependency bumps and questions.
license: MIT
---

# Spec

Loop: clarify, spec, red, green, check. Formats and `spec_check` output: `references/FORMAT.md`.

A user who wants to review the spec before any test or code splits the loop with two commands: `/claudetto-spec:specify <request>` stops after the spec, and `/claudetto-spec:implement` runs red, green and check from the spec as the user left it. This skill runs the whole loop.

First Glob `specs/*.md` and read the specs the request touches.

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root, if present, for constraints before writing the spec. Never create a constitution file.
- Interactive session: ask each expensive unknown through AskUserQuestion.
- No one to answer (non-interactive `-p` run): write each unknown as an `Open:` line in the spec, also when you take a cheap default for it (`Open: rate form; assumed a fraction`), and list each assumption in the final reply.

## Spec

- Edit the capability's existing `specs/<capability>.md`, or add one. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>`, where the ID is an uppercase prefix, one hyphen and a number (`[A-Z][A-Z0-9]*-\d+`, such as `CART-1`), one sentence of behaviour, at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.

## Red

1. Write tests in the project's own framework; cite the requirement ID in the test name.
2. Run them and see them fail.
3. `git add` the test files before writing implementation.

## Green

- Implement without editing staged tests.
- The spec as the session found it, with the user's uncommitted edits, is the spec to implement. A requirement changes only when the request cites its ID or says to change the spec. Describing the new behaviour, "change whatever is needed", "the test is wrong" or a deadline does not.
- If the request contradicts a requirement it does not cite, or a staged test cannot pass honestly, change nothing: stop and report the conflict naming the requirement ID. Never edit the test or spec to fit.

## Check

- Load `spec_check` through ToolSearch (deferred) and call it.
- Run the project's test command.
- Report both results.
