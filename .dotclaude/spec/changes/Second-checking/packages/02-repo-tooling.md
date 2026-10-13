---
schema: dotclaude-spec/2
kind: package
id: P02
title: Repo tooling
wave: 1
deps: []
owns: ["tools/","tests/tools/","tests/support/","biome.json","package.json","tsconfig.json","justfile",".dotclaude/spec/changes/1.0.0/evidence/second-check-repo-tooling.md"]
satisfies: []
verify: just test tests/tools tests/support && just validate
agent: implementer
status: done
---

## Goal

Check the build, generate, release, and validate tooling for an input or an order that breaks it, and for a spec that claims one path twice.

## Context

- The spec of 1.0.0 gives `tools/generate/` to P01b1, P13, and (its `emit/snippet.ts`) P01b3, and (its `emit/register.ts`) P01b4. Read the three packages and `dotclaude-spec ready` rules to see if the overlap is a defect of the tool or only of the text.
- `justfile:29-32` `check` and `ci` differ (`ci` has no typecheck and no `generate --check`). Check if this is a decision of the repo or a gap.
- `tools/` release and bump scripts: version string edge cases (`1.0.0` to a pre-release, a missing tag, a dirty tree).
- `just sandbox-install` (commit `2913ef0f`) already lets `--clean` pass on a missing folder; confirm with a test, and check a second `--clean` and a folder that holds a read-only file.
- Report of the user from a 1.0.0 sandbox: `just validate` and `just lab` made 9 calls to `http-intake.logs.us5.datadoghq.com:443`, which the sandbox denied. `tools/validate.ts:67,70` and `tools/lab.ts:9` start `claude plugin validate` and `claude plugin test`, and the telemetry of that CLI makes the calls. Find in the dossiers (`external/cc-2.1.296/`, `external/dossier/`) the documented env var of Claude Code that stops the telemetry and the error reports, such as `CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC`, `DISABLE_TELEMETRY`, or `DISABLE_ERROR_REPORTING`, cite it, and set it for each `claude` call of `tools/` in one shared place. A test pins the env of the call.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-repo-tooling.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/tools tests/support && just validate` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
