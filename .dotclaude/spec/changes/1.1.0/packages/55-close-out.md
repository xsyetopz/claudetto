---
schema: dotclaude-spec/2
kind: package
id: P55
title: Close-out of 1.0.0 and Second-checking
wave: 1
deps: []
owns: [".dotclaude/spec/changes/1.0.0/",".dotclaude/spec/changes/1.1.0/evidence/close-out.md",".dotclaude/spec/changes/Second-checking/",".dotclaude/spec/archive/"]
satisfies: ["REQ-1"]
verify: plugins/dotclaude/bin/dotclaude-spec validate && plugins/dotclaude/bin/dotclaude-spec status
agent: main session
status: done
---

## Goal

Each open package of 1.0.0 is `done` or `canceled`, the change `Second-checking` is archived, as the user approved (D9), and the dropped briefs P71 and P73 of 1.1.0 are `canceled`.

## Context

- The proposals and their evidence: `design.md`, "Close-out of 1.0.0".
- The commands: `dotclaude-spec review`, `merge`, `drop`, `accept`, and `archive` (`dotclaude-spec --help`).
- A `done` needs the gates of `spec/domain/gates.ts`, so a package with no verify record may need `verify` first.
- `Second-checking/events.jsonl:29`: P07 is `verified` with the note "Converted from schema 1, which had no verify record".
- The audit of 2026-10-14: each of the 9 `done` events of `Second-checking` has no `approved` step before it, and each of its 9 `verified` events has no verify record.
  Show both facts to the user with the P07 record in step 6.
- P71 (D2) and P73 (D6) are dropped, and the CLI `drop` runs only after the plan gate.

## Steps

1. Show the table of proposals to the user, and wait for the approval of each line.
2. For P39, confirm that `src/plugins/dotclaude/slices/surface/texts.ts/tool-bash.md` has no attribution rule.
   If it has one, propose `cancel, moved` for P39 in place of `done`.
3. For each approved `done`, run `implement` if the package is `planned` (`verify` needs `doing`, `verify.ts:56`), then `verify` with the `verify` of the package, then `review approve`, then `merge`.
4. For each approved cancel, run `drop <package> --reason "moved to 1.1.0 P<n>"`.
5. Run `accept 1.0.0` and `archive 1.0.0` only if the user asks for it.
6. Show the user the P07 record of `Second-checking` and the audit facts, and write them in `evidence/close-out.md`.
   Run `accept Second-checking` and `archive Second-checking` only after the user approves it (D9, line 10).
7. After the plan gate of 1.1.0, run `drop P71 --reason "D2: no agent has maxTurns"`, `drop P73 --reason "D6: origin tags and role-aware text only"`, and the `drop` lines of the briefs of P63 and P65.

## Acceptance

- `dotclaude-spec status` shows no open package in 1.0.0 and no `Second-checking` change.
- P63, P65, P71, and P73 are `canceled`.
- `dotclaude-spec validate` prints `Valid.`

## Boundaries

- Do not change a status before the user approves its line.
- Do not edit `events.jsonl` by hand.
