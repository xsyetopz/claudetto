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
  the reserve and deficit arrows of the `5h` and `7d` status line rows, which 0.28.0 had (P04),
  ` · ` between the items of the status line, with aligned columns where the width permits (P04),
  the notice of `dcc-plugin-you-should-know`, which did not pop up and did not let the user expand the note (P06),
  and the calls of `just validate` and `just lab` to `http-intake.logs.us5.datadoghq.com`, which the sandbox denied (P02).

Out of scope:

- New features, and a change of a rule of `validate`, of a lint rule, or of a test bound to make a check pass.
- The `export-*.jsonl` files of `external/` are read by search only, never whole.
- The 9 `tests/lab/capture` failures are a sandbox limit: the user ran `just test tests/lab` outside the sandbox on 2026-10-13 and got 109 pass, 0 fail across 14 files.
  They are not a task.

Rule of each package: a candidate becomes a fix only after a test that fails on the current code shows it.
A candidate that no test can show is recorded in `evidence/` as rejected, with the reason.

## Tasks

- [ ] T1 Second-check the kernel: the JSONL reader of the spec store, `writeAtomic` on Windows, the shell output bound.
  Verify: `just test tests/kernel`
- [ ] T2 Second-check the repo tooling: the overlap of `owns` between the generator and the register emitter, and the release and validate checks, and stop the telemetry calls of the `claude` CLI that the tools start.
  Verify: `just test tests/tools tests/support && just validate`
- [ ] T3 Second-check the prompt, agents, styles, surface, attribution, trim, decide, and checks slices and the evals of the core plugin.
  Verify: `just test tests/dotclaude/prompt && just lab`
- [ ] T4 Second-check the guard, asks, spec, sembr, and statusline slices: path separators, substitutions, JSON parse of stdin and cache. Restore the pace arrows and add the ` · ` separators of the status line.
  Verify: `just test tests/dotclaude/guard tests/dotclaude/statusline && just lab`
- [ ] T5 Second-check the setup, rules, handoff, and stamp slices: the atomic settings write and the exclude append.
  Verify: `just test tests/dotclaude/setup && just lab`
- [ ] T6 Second-check the add-on plugins: the usage parser of `dotclaude-sessions`, the lab capture report, and the two `dcc-plugin-*` plugins. Make the you-should-know notice pop up and let the user expand it, as the builtin plugin does.
  Verify: `just test tests/sessions tests/lab tests/dcc-plugin-agents-md tests/dcc-plugin-you-should-know && just lab`
- [ ] T7 Record each confirmed and each rejected candidate, write the changelog entry, regenerate, and run the full check.
  Verify: `just check`
