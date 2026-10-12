---
id: P36
deps: [P06]
owns: ["src/plugins/dotclaude/slices/asks/", "tests/dotclaude/asks/"]
verify: just check
agent: implementer
---

# P36 `asks` on weaker checks

## Goal

The `asks` slice asks only when a change weakens a check, and never for a read.
A change to a protected file that keeps or adds checks gets no ask.

## Context

- The entry: `.dotclaude/spec/changes/1.0.0/packages.md`, P36.
- The decision of the user: `.dotclaude/spec/changes/1.0.0/change.md`, decisions, 2026-10-12.
  The user rule: a command that is safe, not destructive, and not malicious runs with no ask, on macOS, Linux, and Windows.
- On 2026-10-12, a trace of 140 commands through the `asks` hook on `dotclaude-1-0-0` gave 132 with no ask.
  The 8 asks were `sed -i` on a CI file, a test file, a limits file, and `biome.json`.
  An `Edit` of the CI file, the test file, and `biome.json` also asked, and an `Edit` of plain source did not.
- What asks on each change now:
  - `pathReasons` in `domain/kinds.ts`: each change to a CI file, a lint config, a runner config, a hook file, or a settings file.
  - `protectedReason` in `domain/protect.ts`: each changed line of a test file or a limits file.
  - `writes.ts`: each shell write to a protected file.
- What already finds a weaker check: `skipReasons` (a skipped or focused test), the suppression words of `comments.ts`, and `settingsKey`, `checkScriptChanged`, and `checkRecipeChanged` in `content.ts`.
- `change` in `domain/text.ts` gives the text before and after a `Write`, `Edit`, or `MultiEdit`.
- The rules of the wave: `.dotclaude/spec/changes/1.0.0/packages.md:7-15`.

## Steps

1. For each kind of protected file, write a pure function that compares the text before and after, and gives a reason only when the change weakens a check.
   - Test file: a test, an assert, or an `expect` is removed, or a test is skipped or focused.
     An edit that changes an expected value asks.
     A test that is added, or a rename, a format change, or a move with the same asserts, does not ask.
   - Limits file: a bound changes value.
   - Lint config or runner config: a rule goes off or to a lower level, an ignore or exclude entry is added, a rule is removed, or a threshold such as coverage gets lower.
   - CI file: a job or a step is removed, a check command is removed, or `continue-on-error`, `|| true`, `if: false`, or a skip is added.
   - Hook file: a hook or a matcher is removed, or a hook command changes to one that cannot fail.
   - Settings file: a deny or ask rule is removed, an allow rule is added, or a hook is removed or turned off.
   - When the function cannot read the format, it asks, so that an unknown change never passes with no ask.
2. Use these functions in place of `pathReasons` and `protectedReason` for `Write`, `Edit`, and `MultiEdit`.
3. A shell edit in place of a protected file, such as `sed -i` or `perl -pi`, has no text after the edit before it runs, so it asks.
   Find in the mod types whether a handler can run the edit on a copy first, with no write to the project and no command that runs code.
   `sed` commands `e`, `w`, and `r` and the `perl` code run code or files.
   When the copy can run safely, use it, and give no ask when the change does not weaken a check.
   When it cannot, keep the ask, and write the reason in the report.
4. Tests in `tests/dotclaude/asks/`: for each kind, one change that weakens a check and asks, and one that keeps or adds checks and does not ask.
   Each test fails without the change.
   Test the decision, not the words of the reason.

## Acceptance

- `just check` and `just lab` pass.
- Each kind of step 1 has a test that asks and a test that does not.
- A test shows that the read commands of the trace of 2026-10-12 get no ask.

## Boundaries

- Change only the paths of `owns`.
- Use arrow functions, and add no legacy shim and no fallback for an old layout.
