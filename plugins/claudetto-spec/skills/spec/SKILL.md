---
name: spec
description: Use before writing code for any request that adds or changes behaviour (a new function, feature or rule), also in a repo with no specs/ yet; and before changing code, tests or specs in a repo with specs/, including "make the tests pass" or "the test is wrong" requests - spec, failing tests, then code (clarify, spec, red, green, check). Skip typos, renames, dependency bumps and questions.
license: MIT
---

# Spec

Loop: clarify, spec, red, green, check. The requirement format is under Spec below; read `references/FORMAT.md` only when a `spec_check` finding is unclear.

First read the specs the request touches, with the code and tests they name, in one call (one `cat` of every file), listing `specs/` only if you have not listed it yet. `specs/` and every path here are in the session's working directory, never this skill's directory.

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root for constraints before writing the spec, when a listing you already made shows one. Never create a constitution file.
- Interactive session: ask each expensive unknown through `AskUserQuestion`.
- No one to answer (non-interactive `-p` run): write each unknown as an `Open:` line in the spec, also when you take a cheap default for it (`Open: rate form; assumed a fraction`), and list each assumption in the final reply.

## Spec

- Edit the capability's existing `specs/<capability>.md`, or add one. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>`, where the ID is an uppercase prefix, one hyphen and a number (`[A-Z][A-Z0-9]*-\d+`, such as `CART-1`), one sentence of behaviour (a single full stop; put each detail in a scenario, because `spec_check` flags a second sentence), at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.

## Red

1. Write tests in the project's own framework; cite the requirement ID in the test name.
2. Run them and see them fail, and `git add` the test files in that same command (`<test command>; git add <files>`), before writing implementation.

## Green

- Implement without editing staged tests.
- The spec as the session found it, with the user's uncommitted edits, is the spec to implement; the session prompt's amend rule says when a requirement may change. A staged test that cannot pass honestly is a conflict to report, never a test to edit.

## Check

- Call `spec_check` once, here and not before, and run the project's test command in the same turn.
- Report both results.
