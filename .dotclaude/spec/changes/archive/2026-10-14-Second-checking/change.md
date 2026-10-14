---
schema: dotclaude-spec/2
kind: change
id: Second-checking
size: large
status: archived
verify: just check
---

# Second-checking

## Why

The 1.0.0 implementation of dotclaude was built by a 0.28.0 session in one day (2026-10-13, 50 packages).
No second pair of eyes has read its edge cases.
The report of the first look found candidates in code (a torn JSONL line, a `null` JSONL line, a non-atomic settings write, a POSIX backslash path), and it found that `just test` fails 9 tests of `tests/lab/capture` in the sandbox with `EADDRINUSE` on port 0.
This change treats 1.0.0 as possibly wrong, confirms or rejects each candidate with a failing test, and fixes only what the code and the `external/` dossiers support.

## Scope

The code under review is the repository `/Users/krystian/CodeProjects/xsyetopz/dotclaude` at the commit `ad61fb01`.
The spec store of this change lives in the sandbox project, and each `owns` path and each `Verify:` command is relative to that repository.
The dossiers are under `external/` of that repository.

In scope:

- Six review areas with disjoint paths: `kernel`, `repo-tooling`, `core-prompt-agents`, `core-guard-asks-spec`, `core-setup-rules-handoff`, `add-on-plugins`.
- A last package for the docs, the changelog, `just generate`, and `just check`.
- Four requests of the user (2026-10-13), each in the package that owns its paths:
  the reserve and deficit arrows of the `5h` and `7d` status line rows, which 0.28.0 had (P08),
  ` · ` between the items of the status line, with aligned columns where the width permits (P08),
  the notice of `dcc-plugin-you-should-know`, which did not pop up and did not let the user expand the note (P06),
  and the calls of `just validate` and `just lab` to `http-intake.logs.us5.datadoghq.com`, which the sandbox denied (P02).
- Three decisions of the user (2026-10-13) on the open candidates of P01: repair a torn last line of `events.jsonl` (P04), make the write asks fail closed on a truncated command (P04), and retry the Windows rename of `writeAtomic`, with a test that the Windows CI runs (P01).
- Four answers of the user (2026-10-13) on the status line (P09): `↻` before the reset time, the run-out clock `⏵`, two rows for `5h` and `7d` where the layout fits, and percent colors from the projected use. The usage bars stay out.

Out of scope:

- New features, and a change of a rule of `validate`, of a lint rule, or of a test bound to make a check pass.
- The `export-*.jsonl` files of `external/` are read by search only, never whole.
- The 9 `tests/lab/capture` failures are a sandbox limit: the user ran `just test tests/lab` outside the sandbox on 2026-10-13 and got 109 pass, 0 fail across 14 files.
  They are not a task.

Rule of each package: a candidate becomes a fix only after a test that fails on the current code shows it.
A candidate that no test can show is recorded in `evidence/` as rejected, with the reason.

## Tasks

- [ ] T1 Second-check the kernel: the JSONL reader of the spec store, the shell output bound, and a retry of the Windows rename of `writeAtomic`.
  Verify: `just test tests/kernel`
- [ ] T2 Second-check the repo tooling: the overlap of `owns` between the generator and the register emitter, and the release and validate checks, and stop the telemetry calls of the `claude` CLI that the tools start.
  Verify: `just test tests/tools tests/support && just validate`
- [ ] T3 Second-check the prompt, agents, styles, surface, attribution, trim, decide, and checks slices and the evals of the core plugin.
  Verify: `just test tests/dotclaude/prompt && just lab`
- [ ] T4 Second-check the guard, asks, spec, and sembr slices: path separators and substitutions. Repair a torn last line of `events.jsonl`, and make the write asks fail closed on a truncated command.
  Verify: `just test tests/dotclaude/guard tests/dotclaude/asks tests/dotclaude/spec tests/kernel && just lab`
- [ ] T8 Restore the pace arrows of the status line, add the ` · ` separators, and check the parse of stdin and of the git cache.
  Verify: `just test tests/dotclaude/statusline && just lab`
- [ ] T9 Put back `↻` and the run-out clock `⏵` of the usage windows, put `5h` and `7d` on two rows where the layout fits, and color each percent by its projected use at the end of the window.
  Verify: `just test tests/dotclaude/statusline && just lab`
- [ ] T5 Second-check the setup, rules, handoff, and stamp slices: the atomic settings write and the exclude append.
  Verify: `just test tests/dotclaude/setup && just lab`
- [ ] T6 Second-check the add-on plugins: the usage parser of `dotclaude-sessions`, the lab capture report, and the two `dcc-plugin-*` plugins. Make the you-should-know notice pop up and let the user expand it, as the builtin plugin does.
  Verify: `just test tests/sessions tests/lab tests/dcc-plugin-agents-md tests/dcc-plugin-you-should-know && just lab`
- [ ] T7 Record each confirmed and each rejected candidate, write the changelog entry, regenerate, and run the full check.
  Verify: `just check`
