---
name: spec-review
description: User command - compare the working diff and tests with specs/*.md and name each gap by requirement ID (no code, untested scenario, hollow test). Reports only; edits nothing.
disable-model-invocation: true
context: fork
disallowed-tools: Write Edit MultiEdit NotebookEdit
license: MIT
---

# Spec Review

Compare the working change with `specs/*.md` (format: `../spec/references/FORMAT.md`) and report gaps by requirement ID. Nothing else: no style, naming or refactoring remarks, and no fixes.

1. Glob `specs/*.md`. Read `git diff HEAD` (plus untracked files from `git status --short`), the touched code and every test file. Narrow to the capability in `$ARGUMENTS` if given.
2. Load `spec_check` through ToolSearch (deferred) and call it. Its `uncovered` and `citedUnasserted` are leads only: it cannot tell that a test or code misses the requirement's sentence.
3. Per requirement, decide from the code and tests themselves, not from names or comments:
   - **No code**: nothing implements the behaviour sentence.
   - **No test**: a listed `Given`/`When`/`Then` scenario has no test that sets up that `Given` and asserts that `Then`. Name the scenario.
   - **Hollow test**: a test cites the ID, yet its assertions cannot fail on a violation of the requirement (`expect(true)`, no assertion, asserts only that a call did not throw, mocks away the behaviour under test).
4. A requirement whose behaviour and every scenario are implemented and asserted is not a gap. Do not mention it beyond a count.

Reply with one line per gap: `<ID> - no code | no test: <scenario> | hollow test: <file:line>` plus at most one clause saying why. End with the number of requirements checked. If there are no gaps, say so.
