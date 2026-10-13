---
schema: dotclaude-spec/2
kind: package
id: P03
title: Core plugin: prompt and agents
wave: 1
deps: []
owns: ["src/plugins/dotclaude/plugin.ts","src/plugins/dotclaude/slices/prompt/","src/plugins/dotclaude/slices/agents/","src/plugins/dotclaude/slices/styles/","src/plugins/dotclaude/slices/surface/","src/plugins/dotclaude/slices/attribution/","src/plugins/dotclaude/slices/trim/","src/plugins/dotclaude/slices/decide/","src/plugins/dotclaude/slices/checks/","src/plugins/dotclaude/evals/","tests/dotclaude/prompt/","tests/dotclaude/agents/","tests/dotclaude/styles/","tests/dotclaude/surface/","tests/dotclaude/attribution/","tests/dotclaude/trim/","tests/dotclaude/decide/","tests/dotclaude/checks/","tests/dotclaude/evals/","tests/dotclaude/settings-pin.test.ts","tests/dotclaude/imports.test.ts","tests/dotclaude/import-rules.test.ts",".dotclaude/spec/changes/1.0.0/evidence/second-check-core-prompt-agents.md"]
satisfies: []
verify: just test tests/dotclaude/prompt && just lab
agent: implementer
status: done
---

## Goal

Check the prompt transforms, the agent definitions, the attribution hook, and the trim and decide slices for inputs that change the result.

## Context

- Attribution (`git commit` trailer, `gh pr create` footer): a command with a heredoc message, `-F`, `--amend`, an existing `Co-Authored-By`, a `-m` after the `--trailer`, a pipeline or `&&` chain with two `git commit` words. The CHANGELOG says the `attribution` setting and `includeCoAuthoredBy: false` keep control; test each.
- Model name of a subagent or an unnamed model gets `Claude`; test an id with no version and one with a suffix such as `[1m]`.
- The `checks` slice (`dotclaude-run-checks`: a command of plain words runs with no shell, a command with shell syntax runs through `sh -c`, the log file, the exit status) and the `evals` folder have no other owner; test a quoted argument, an empty command, and a command that prints no newline.
- `plugin.ts`: the slice registration order, and a slice that throws at load.
- `ls tests/dotclaude/` first: a test folder named here that does not exist is dropped from `owns` and from the check.

## Steps

1. Read the dossiers of `external/` that bear on the area (search with `grep`, never read an `export-*.jsonl` whole), and note each Claude Code claim with its file and line.
2. For each candidate of Context, write a test that fails on `ad61fb01` when the defect is real.
   If no such test is possible, mark the candidate `rejected` or `open` with the reason.
3. Fix each confirmed candidate at its cause, in the style of the code around it.
4. Search the owned paths for the same pattern (a bare `JSON.parse`, a non-atomic write, a path split on `\`), and give each hit the same test or the same verdict.
5. Write the evidence table to `.dotclaude/spec/changes/1.0.0/evidence/second-check-core-prompt-agents.md`.
6. Remove from `specs/` of this change each requirement that the evidence rejects.

## Acceptance

- `just test tests/dotclaude/prompt && just lab` passes, or the report says that it did not run and names the cause.
- Each candidate of Context has a verdict in the evidence file.
- Each fix has a test that failed before it.

## Boundaries

- Change only the paths of `owns`.
- Do not raise a bound, skip or loosen a test, or edit a lint rule or a rule of `validate`.
- Do not run `just generate`; use `just generate --check`.
- Keep a public signature of the kernel.
