# Close-out of 1.0.0 and Second-checking (P55)

## Approval

The user approved all 10 lines of D9 on 2026-10-14, in an `AskUserQuestion` answer.
The lines are in `design.md`, "Close-out of 1.0.0".
For the `Second-checking` line, Jev picked accept and archive, with the audit facts in this file (0.25, not sure).

## P39 Attribution Rule

`grep -niE "attribut|co-authored|generated with" src/plugins/dotclaude/slices/surface/texts.ts/tool-bash.md` exited 1.
So the file has no attribution rule, and P39 stays `done`.

## Verify Fields of 1.0.0

`dotclaude-spec verify` runs the whole `verify` field in a shell (`spec/adapters/verify.ts:80`).
The fields of P16 and P38 to P41 were prose, so no run could pass.
The user chose to set each field to its command part, and to cite the evidence of the prose part here (`AskUserQuestion` answer, 2026-10-14).

| Package | Old field | New field | Evidence of the prose part |
| --- | --- | --- | --- |
| P16 | `just check`, and the user approves the version 1.0.0 and the push | `just check` | The tags `*--v1.0.0` exist for 8 plugins, and `1.0.0/evidence/release-check.md`. |
| P38 | `just check`, `just lab`, and the probe of step 1 with its output in the evidence file | `just check && just lab` | `1.0.0/evidence/session-stamp.md` and `session-stamp-resume.md`. |
| P39 | `just check`, `just lab`, and one commit and one PR body in `just sandbox` that carry the attribution | `just check && just lab` | `1.0.0/evidence/attribution.md`, "Sandbox Check, 2026-10-13". |
| P40 | `just check`, `just lab`, and one session in `just sandbox` that loads each supported AGENTS file | `just check && just lab` | `1.0.0/evidence/agents-md.md`, "Sandbox Session, 2026-10-13". |
| P41 | `just check`, `just lab`, and one session in `just sandbox` where a notice shows before the action that it is about | `just check && just lab` | `1.0.0/evidence/you-should-know.md`, "Sandbox Sessions, 2026-10-13" and "Interactive Session, 2026-10-13". |

Each `verify` ran outside the sandbox.
In the sandbox, 159 tests fail because the fixture repositories sign commits with the global git config of the user and cannot read `~/.ssh`, and 10 tests fail because a test server cannot bind a port.
P94 has the fixture defect as a lead.

### First Runs, 2026-10-14 00:59Z to 01:06Z

Each of the 5 runs in the main checkout gave exit 1, with the note "The command left changes outside `.dotclaude/spec`".
The note named `wiki/_Sidebar.md`, `wiki/claude-code/Undocumented-Reads.md`, and `wiki/claude-code/Undocumented-Settings.md`.
These files are the uncommitted P160 page and its 2 links, and their last change was at 00:31Z, before the first run.
In each run, `just check` gave 2308 pass, 1 skip, and 0 fail, and `validate` and `lab` ran.

Lead for the spec review: `verify.ts:87-93` reads the dirty files only after the command.
So it counts a file that was dirty before the command as a change of the command, and the note gives the wrong cause.

### Second Runs, 2026-10-14 01:09Z

The user chose a clean worktree (`AskUserQuestion` answer, 2026-10-14).
The method:

1. `git worktree add --detach /tmp/claude-501/p55-verify-wt HEAD`, at `765e6954`.
2. `bun install` in the worktree.
   It changed `bun.lock`, and the user ran `git checkout -- bun.lock` there, because the guard refuses that command.
3. `dotclaude-spec verify <P> --in /tmp/claude-501/p55-verify-wt` for P16, P38, P39, P40, and P41, in sequence, outside the sandbox.

Each run gave exit 0, and each package became `verified`.

### Merges and Drops

`merge` needs a clean main checkout, and it has no `--in` option.
The user chose to stash the 2 tracked wiki files during the merges (`AskUserQuestion` answer, 2026-10-14).
`git stash pop` put them back after the drops, and the untracked page stayed in place.

- `review approve` and `merge` moved P16, P38, P39, P40, and P41 to `done`.
  The commits are `0383a45e`, `029ca0f6`, `def25d7b`, `e9cc79ab`, and `87872662`, and none is pushed.
- These drops exited 0:
  - `drop P18 --reason "moved to 1.1.0 P78"`
  - `drop P43 --reason "moved to 1.1.0 P79"`
  - `drop P45 --reason "moved to 1.1.0 P81"`
  - `drop P47 --reason "moved to 1.1.0 P80"`
- `dotclaude-spec status 1.0.0` gives `1.0.0 implementing 57/57`, with 57 `done` and 5 `canceled`.
  `accept 1.0.0` and `archive 1.0.0` did not run, because the user did not ask for them (P55, step 5).

## Second-checking

The audit of the spec slice of 2026-10-14 found these facts:

- Each of the 9 `verified` events in `Second-checking/events.jsonl` (lines 9, 11, 12, 15, 18, 19, 20, 26, and 29) has no verify record.
  Each has the note "Converted from schema 1, which had no verify record (no SHA, no exit status)."
- Each of the 9 `done` events has no `approved` step before it.
  `merge.ts:141-142` and `states.ts:44-62` refuse `verified` to `done`, so a writer outside the CLI wrote these events.
- The P07 record, line 29:
  `{"at":"2026-10-13T15:17:41.775Z","package":"P07","state":"verified","note":"Converted from schema 1, which had no verify record (no SHA, no exit status)."}`

P77 adds the gate that refuses such events.
No `events.jsonl` was edited by hand.

The user approved line 10 of D9, so `accept Second-checking` and `archive Second-checking` ran on 2026-10-14, and each exited 0.
The change is now in `.dotclaude/spec/changes/archive/`.

## Drops of 1.1.0

After the plan gate of 1.1.0, each `drop` exited 0:

- `drop P63 --reason "user 2026-10-14: questions are fixed by prompting only"`
- `drop P65 --reason "user 2026-10-14: openers are fixed by prompting only"`
- `drop P71 --reason "D2: no agent has maxTurns"`
- `drop P73 --reason "D6: origin tags and role-aware text only"`
