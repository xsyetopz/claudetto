---
name: spec
description: Load first, before reading any file (it lists specs/ and the session directory itself), for any request that adds or changes behaviour (a new function, feature or rule), also in a repo with no specs/ yet; and before changing code, tests or specs in a repo with specs/, including "make the tests pass" or "the test is wrong" requests - spec, failing tests, then code (clarify, spec, red, green, check). Skip typos, renames, dependency bumps and questions.
license: MIT
allowed-tools: Bash(sh ${CLAUDE_SKILL_DIR}/context.sh)
---

# Spec

Loop: clarify, spec, red, green, check, in three turns of tool calls after this one, because each extra turn re-sends the whole conversation. Calls in one turn run in order, so a test run after an edit in the same turn sees the edit. The requirement format is under Turn 2 below; read `references/FORMAT.md` only when a `spec_check` finding is unclear.

The session's working directory, its `specs/` files, the requirement headings in use and the user's uncommitted spec edits, read when this skill loaded:

!`sh ${CLAUDE_SKILL_DIR}/context.sh`

`specs/` and every path here are in that directory, never this skill's directory. Edit and Write take absolute paths that start with it. A new requirement ID must be free among the headings above, not only in the spec you edit.

## Turn 1: Read

One command that `cat`s every spec the request touches, the code and tests they name, the README, and each tracked file listed above that already handles the request's concept (its units, names and rules bind the new code), skipping files already shown. Edit works on a file a `cat` showed, so never Read it again.

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root for constraints before writing the spec, when the listing above shows one. Never create a constitution file.
- Interactive session: ask each expensive unknown through `AskUserQuestion`.
- No one to answer (non-interactive `-p` run): write each unknown as an `Open:` line in the spec, also when you take a cheap default for it (`Open: rate form; assumed a fraction`), and list each assumption in the final reply.

## Turn 2: Spec and Red

- Edit the capability's existing `specs/<capability>.md`, or add one, in one edit. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>`, where the ID is an uppercase prefix, one hyphen and a number (`[A-Z][A-Z0-9]*-\d+`, such as `CART-1`), one sentence of behaviour (a single full stop; put each detail in a scenario, because `spec_check` flags a second sentence), at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.
- In the same turn, write tests in the project's own framework, citing the requirement ID in each test name, and end the turn with one command that runs them and stages them (`<test command>; git add <files>`), to see them fail before any implementation.

## Turn 3: Green and Check

- Implement without editing staged tests.
- The spec as the session found it, with the user's uncommitted edits shown above, is the spec to implement: code and tests follow every requirement in it, also an edit the request does not name. The session prompt's amend rule says when the spec text itself changes. A staged test that cannot pass honestly is a conflict to report, never a test to edit.
- In the same turn, after the code edits, call `spec_check` once and run the project's test command once; neither runs earlier or again.
- Then reply with both results.
