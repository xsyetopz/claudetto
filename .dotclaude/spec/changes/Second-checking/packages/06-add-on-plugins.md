---
id: P06
deps: []
owns: ["src/plugins/dotclaude-codegraph/", "src/plugins/dotclaude-browser/", "src/plugins/dotclaude-docs/", "src/plugins/dotclaude-sessions/", "src/plugins/dotclaude-lab/", "src/plugins/dcc-plugin-agents-md/", "src/plugins/dcc-plugin-you-should-know/", "tests/browser/", "tests/codegraph/", "tests/docs/", "tests/sessions/", "tests/lab/", "tests/dcc-plugin-agents-md/", "tests/dcc-plugin-you-should-know/", ".dotclaude/spec/changes/1.0.0/evidence/second-check-add-on-plugins.md"]
verify: just test tests/sessions tests/lab tests/dcc-plugin-agents-md tests/dcc-plugin-you-should-know && just lab
agent: implementer
---

# P06 Add-on plugins and lab

## Goal

Make the usage parser, the lab capture, and the two dcc plugins tolerate odd input, and record that the sandbox port failure is not a repo defect.

## Context

- `src/plugins/dotclaude-sessions/slices/usage/domain/parse.ts:117-122` a `null` line throws at `entry.type`; `transcript.ts:82-89` skips `null` and keeps arrays. Delta: `specs/usage-parse.md`.
- `src/plugins/dotclaude-lab/slices/capture/domain/report.ts:194-196` parses the HTTP reply of `count_tokens` after a `res.ok` check; the risk is a 200 reply whose body is not JSON. Separately, the capture files are JSONL since commit `882b50c3`: check each reader of them for a torn last line.
- `tests/lab/capture` 9 failures (`proxy.test.ts`, `sizing.test.ts`), `EADDRINUSE` on port 0 in the sandbox. A run outside the sandbox gave 109 pass, 0 fail, so these are a sandbox limit; record that in the evidence file. Do not skip or mock.
- `dcc-plugin-agents-md` (commit `d0fb523b`): `claudeMdExcludes` matched with `/`; test a Windows path with `\`, a drive letter in lower case, and a UNC path.
- Report of the user from a 1.0.0 sandbox: the notice of `dcc-plugin-you-should-know` did not pop up, and did not let the user expand the note to give the agent a heads-up. Find how the builtin `cc-plugin-you-should-know@builtin` (Claude Code 2.1.287 and later) shows its notice and changes the TUI: search `external/cc-2.1.296/strings.txt` and `external/cc-extract/` with `grep -o` and a short bound, and search `external/2026-10-02/export-What is your experience with the new cc-plugin-you-should-know@builtin plugin*.jsonl` for user reports. Read `.dotclaude/spec/changes/1.0.0/evidence/you-should-know.md` and `src/plugins/dcc-plugin-you-should-know/`. Use only documented extension points of the mod runtime (`$.*` of `types/index.d.ts`), never a patch of the CLI. Write the cause and the fix in the evidence file; when the mod runtime has no extension point for a part, record it as `open` with the evidence.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-add-on-plugins.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/sessions tests/lab tests/dcc-plugin-agents-md tests/dcc-plugin-you-should-know && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
