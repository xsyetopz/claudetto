---
schema: dotclaude-spec/2
kind: package
id: P05
title: Core plugin: setup, rules, handoff, stamp
wave: 1
deps: []
owns: ["src/plugins/dotclaude/slices/setup/","src/plugins/dotclaude/slices/rules/","src/plugins/dotclaude/slices/handoff/","src/plugins/dotclaude/slices/stamp/","tests/dotclaude/setup/","tests/dotclaude/rules/","tests/dotclaude/handoff/",".dotclaude/spec/changes/1.0.0/evidence/second-check-core-setup-rules-handoff.md"]
satisfies: []
verify: just test tests/dotclaude/setup && just lab
agent: implementer
status: done
---

## Goal

Make the setup command and the handoff hooks safe for a settings file that is odd, a second run, and an interrupted write.

## Context

- `slices/setup/adapters/settings-cmd.ts:96` writes the user `settings.json` with no `writeAtomic`. Delta: `specs/setup-settings.md`.
- `slices/setup/adapters/exclude-step.ts:49,54` reads `.git/info/exclude` then appends. The line already appends whole lines with one `appendFileSync`; the race is the read at line 49 then the append. See Risks of `design.md`: re-check just before the append, add no lock.
- `slices/setup/adapters/account.ts:11-21` parses the output of `claude auth status --json` inside a try/catch; confirm with a test of empty, torn, and non-object output.
- Settings merge: a settings file with comments or a BOM, a key that holds a scalar where the snippet has an object (`env`, `permissions`), a `statusLine` of another tool, `availableModels` replace rule, a second `--apply` that must change nothing.
- The tests of the handoff and stamp slices are in the `lab/` folder of each slice, and `tests/dotclaude/stamp/` does not exist; the `verify` line runs `just lab` for them.
- Handoff: `HANDOFF_WAIT_TURNS`, a handoff file that is empty or partial, a session that ends between the write prompt and the resume.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-core-setup-rules-handoff.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/dotclaude/setup && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
