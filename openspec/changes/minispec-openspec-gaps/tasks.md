## 1. Validate

- [x] 1.1 Make "Archive would refuse this delta" an ERROR in `domain/validate.ts`, and change its parity case. Check: a test that `validate --strict` of a `MODIFIED` for a missing requirement exits `1` fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 1.2 Add the WARNING for a scenario with no `WHEN`/`GIVEN` step or no `THEN` step. Check: a test for "Only an AND Step" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 1.3 Add the WARNING for an overlap of open changes. Check: a test for "Two Changes Modify One Requirement" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 1.4 Add the WARNING for a duplicate or out-of-order task number in `tasks.md`. Check: a test for "Duplicate Number" fails before the change, then `bun test tests/claudetto/spec/`.

## 2. Archive and Status

- [x] 2.1 Put the open task count in the JSON of `archive --yes --json`. Check: a test for "One Open Task" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 2.2 Add the declared scenario rename to `MODIFIED`, in `validate` and in the merge, and name the form in `skills/propose/SKILL.md` and `skills/update/SKILL.md`. Check: a test for "Renamed Scenario" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 2.3 Mark an artifact `done` only when each `##` section of its template has text. Check: a test for "Half-Written Proposal" fails before the change, then `bun test tests/claudetto/spec/`.

## 3. OpenSpec Surface

The gaps come from the surface check of 2026-10-26 against OpenSpec `1.15.0` (`.claude/claudetto/research/minispec-surface-2026-10-26.md`).

- [x] 3.1 Read the schema `spec-driven` as the preset `story` in `adapters/ctx.ts`, so `new change`, `status`, and `instructions` work in a project that `openspec init` made. Check: a test for "OpenSpec Project" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 3.2 Give a usage error with exit `2` for an unknown flag of a command, and print the usage with exit `0` for `-h`, `--help`, and `help`, and the version for `--version`. Check: a test for "Unknown Flag" and "Help" fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 3.3 Add `validate --archived`, `status --all`, `show --no-scenarios`, and `new change --goal` (writes `goal:` to `.openspec.yaml`) with the output of OpenSpec `1.15.0`, and list each flag in the usage line. Check: a parity case for each flag fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 3.4 Print the `Next:` line after `new change`, with the `/claudetto:` skill in place of the `openspec` command. Check: a test that the output has a `Next:` line fails before the change, then `bun test tests/claudetto/spec/`.
- [x] 3.5 Pin the parity tests, `adapters/cli.ts:1`, and the spec texts "Parity with OpenSpec" and "Same Result as OpenSpec" to OpenSpec `1.15.0`, and name the seven skills in "No Start Cost". Check: `bun test tests/claudetto/spec/`.

## 4. Close

- [x] 4.1 Add a parity exception for each difference from OpenSpec `1.15.0`, with its OpenSpec issue number, and add the entries to the `0.4.0-alpha.1` section of `CHANGELOG.md`. Check: `just check`.
- [x] 4.2 Get a `claudetto:Reviewer` review of the diff against this plan, and fix each defect. Check: the review lists no open defect.
