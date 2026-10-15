# Review of the Handoff Slice (P89)

A `reviewer` run did the review on 2026-10-14, read only, on `main` at `76dc06d7`, with Claude Code 2.1.296.
The main session wrote this file from its report.
P57 owns `reportNote` at `src/plugins/dotclaude/slices/handoff/domain/context.ts:41`, with the repeat on each tool call (`evidence/injected-instructions.md`), so this file does not list it as a new finding.

## Confirmed Findings

### Dead code: `resetState`

- File: `src/plugins/dotclaude/slices/handoff/adapters/mod.ts:86`.
- Command: `grep -rn resetState --include='*.ts' src tests tools plugins`.

```text
src/plugins/dotclaude/slices/handoff/adapters/mod.ts:86:export const resetState = ...
plugins/dotclaude/slices/handoff/adapters/mod.ts:87:export const resetState = ...
```

- The docstring says "A test calls it between runs", but no test calls it.
- The lab gives each test new module state.
  The proof: `with manual the hint goes out without the reply` passes after a test that already hinted the same kind of trigger.
- Failing test: input, an `export` of `adapters/mod.ts` that no file in `src/` or `tests/` imports.
  Expected, no such export.
  Actual, `resetState`.
  Test file: `tests/dotclaude/handoff/exports.test.ts` (new), or remove the function.

### Test that cannot fail: the `off` reset of `wanted`

- Files: `src/plugins/dotclaude/slices/handoff/lab/resume-flow.test.ts:113-135` and `adapters/mod.ts:257-258`.
- The test "a turn in `auto` with no trigger starts no handoff after an `off` turn" has no `off` turn and no merge.
- Command: copy `plugins/dotclaude` to `$TMPDIR`, delete `wanted = undefined;` in the `off` branch of the copy, and run `claude plugin test` on the copy.

```text
tests/resume-flow.test.ts:
(pass) with `off` a package that goes to `done` leaves no handoff for a later turn
(pass) a turn in `auto` with no trigger starts no handoff after an `off` turn
 130 pass
 0 fail
```

- Failing test: input, `keepOptions({ mainHandover: "off" })`, then `onToolCall` with `dotclaude-spec merge P01`, then `onTurnComplete`, then `keepOptions({ mainHandover: "auto" })`, then `onTurnComplete` at 10 percent.
  Expected, 0 prompts.
  Actual on the mutant, 1 write prompt.
  Test file: `tests/dotclaude/handoff/off-mode.test.ts` (new), with a fake `$`, because the lab cannot change options in a test.

### I17: a tool error is read as "no file"

- Files: `adapters/mod.ts:106` and `adapters/mod.ts:156`.
- `resume` reads every non-zero exit of `dotclaude-handoff newest` as "the file is not written yet".
- Command: run `dotclaude-handoff newest` in an empty folder, with an extra argument, and from a path that does not exist.

```text
No handoff file in .dotclaude/handoff.
exit=1
Usage: dotclaude-handoff path | newest
exit=2
error: Module not found "/nonexistent/bin/dotclaude-handoff"
exit=1
```

- When the CLI fails to start, the exit status is the same as for "no file".
  Then the write prompt goes out again, and the user gets "The handoff file is not written.", although the file can exist.
- Failing test: input, a `process.run` stub that gives `newest` the exit status `2` after the write turn.
  Expected, no second write prompt and no `REASON_NO_FILE` hint.
  Actual, 2 write prompts, then the hint `The handoff file is not written.`
  Test file: `src/plugins/dotclaude/slices/handoff/lab/handoff.test.ts`.

### I15: a test pins the words of the hint

- File: `src/plugins/dotclaude/slices/handoff/lab/handoff.test.ts:121-123`.
- Command: `grep -n 'toBe(' handoff.test.ts` shows the full hint sentence in `toBe`.
- The behavior under test is that the reply is not repeated.
- Failing test: input, a hint with other words that still omits the reply.
  Expected, a pass.
  Actual, a fail.
  Use `not.toContain("The reply of the turn.")` in the same file.
  Severity: nit.

## Unconfirmed Findings

- I03: `writePrompt` (`domain/text.ts:4-11`) and `skills/handoff/SKILL.md` do not ask for ruled-out approaches or the verify command, which the I03 recipe lists.
  A test of these words would be a test of prose, so this finding has no failing test.
- I03 and I14: `resumeText` (`domain/text.ts:16`) always says "continue the work" and adds the next step from `dotclaude-spec next`.
  This text also goes out after `/handoff` in `manual` mode.
  A session that the user paused can start the work again (SL `157f1ff7`).
  No command shows this.
- I12: `boundFor("haiku")` gives `100000` (from `bun -e`).
  If `usage.model` holds an alias, a Haiku 5.5 agent goes past the 100K price step.
  The types do not say which form `usage.model` holds.

## Checked With No Finding

- I01, I02, I04 to I11, I13, I16, and I18: these are clean in the slice.
- I11: subagent state is removed at the `turn.complete` of the subagent, which the types say fires with `agentId`.
- Silent `catch`: the slice has none.
- A copy of kernel code: `runBin` matches the `spec` and `decide` adapters, but the kernel has no helper of this kind.
- A bound outside `limits.ts`: `WAIT_TURNS` at `resume-flow.test.ts:9` copies `HANDOFF_WAIT_TURNS`.
  When the bound changes, the retry test fails, so the test catches the drift.
- `bun test tests/dotclaude/handoff`: 10 pass.
- `claude plugin test plugins/dotclaude`: 130 pass.
- No guard stopped a command.
  The scratch copies in `$TMPDIR` are deleted, and `git status` of `src`, `tests`, and `plugins` is clean.
