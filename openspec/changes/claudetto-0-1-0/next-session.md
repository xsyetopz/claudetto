# Next Session: `claudetto-0-1-0`

This file gives the next session the state of the change, the order of the work, and the rules.
Read it first, then [tasks.md](tasks.md), [design.md](design.md) D9 and D10, and the wiki pages `wiki/evidence/Failure-Gaps-0.1.0.md` and `wiki/evidence/Model-Guidance.md`.
It was written on 2026-10-16, on the branch `feat/claudetto-0-1-0`.

## State

- Groups 1 to 20 of `tasks.md` are marked done.
  The uncommitted tree holds all of that work.
- Group 21 is new and open.
  It adds the specs `turn-gate` and `ground-gates`, and requirements in `role-agents` and `lab-tools`.
- `openspec validate claudetto-0-1-0 --strict` passes.
- D58, D59, and D60 are new in `src/wiki/rationale/Decisions-Engine.md`.

## Work That Is Not Done

The seccomp and `bwrap` work of the `setup` slice is not done, although a subagent reported it.
The report covers these parts:

- the lookup of the seccomp helper;
- the checks of `allowAllUnixSockets`, `bwrapPath`, the CPU arch, a container, and AppArmor;
- the steps of `skills/setup/SKILL.md`;
- 10 mutation proofs.

These parts are not verified:

- `just check` fails.
- No test or step ran on Linux.
- The source of the embedded helper is not decided.
- The cuts in `skills/setup/SKILL.md` need a review.
- A sysctl read in the code uses `cat`.
- `sandbox-cmd.test.ts:217` conflicts with the seccomp check.

Task 21.2 covers this work.
Do not mark it done before `just check` and the Linux tests in `just docker check` pass.

## Order of the Work

1. Task 21.1: the open checks at no cost, in `just lab`.
   The answers decide how 21.3, 21.4, and 21.7 read their inputs.
   To see how a hook works, read the bundle of Claude Code `2.1.302`, and do not patch it.
2. Task 21.2: make `just check` pass.
3. Tasks 21.3 to 21.5, 21.7 to 21.10.
4. Task 21.6: ask the user before the paid run, with the expected cost and the weekly share.
   The weekly share was 80% on 2026-10-16.
5. Task 21.11: the full gate.
6. The older open items below.
7. The release steps below.

## The Judge Must Not Repeat the Old Failures

dotclaude 0.28.0 had a judge on `Stop`, and 0.29.0 removed it (`wiki/archive/Stop-Prompt-Hooks.md`).
Task 21.4 is done only when each fix has a lab test that fails on the old behavior:

| Failure of 0.28.0 | Fix |
| --- | --- |
| The same false claim passed after a block in 2 of 3 runs | No pass on `stop_hook_active`, and a cap of 2 continuations in the gate |
| The whole judge prompt went into the block text | The judge runs in the hooks module, and the hook returns only the reason |
| Each turn cost about 6,914 more input tokens | Only `last_assistant_message` and a tool-call summary, and no run on a reply that only asks a question |

## Rules for This Work

- Fix each failure with a mechanism, not with a prompt line.
- No regex or word match on natural language.
  A check reads tool calls, exit codes, task states, git state, and file stats.
- 0.1.0 is not a prototype.
  Do not defer a part of a task to a later version.
- Edit `src/`, then run `just generate`.
  Do not edit `plugins/` by hand.
- Keep each file at 300 lines or less, and each test file at 500 lines or less.
- Give each shell command a timeout, and search narrow paths.
- Stop a process by its PID.
  When the process list fails, report the state as unknown.

## Security Rules

- Do not read `~/.ssh/id_ed25519`, and do not touch the ssh-agent.
- Do not write to the real `~/.claude`.
- Commits wait until the user runs `! ssh-add --apple-use-keychain ~/.ssh/id_ed25519`.
- Do not commit the root `marketplace.ts` or `.dotclaude/rate-limits.jsonl`.
- Do not run `just wiki`.

## Older Open Items

- The root-cause redesign from the 6 audits.
- The redesign of the download ask in `asks/domain/download.ts`.
- The prompt fix in `doing-tasks.md`, `planner`, and `reviewer` (task 21.5 covers part of it).
- An AppArmor job in CI, the WSL2 notes, and an OrbStack evidence page.
- The bare `bin/` names in the setup `SKILL.md`, the `minispec` messages, and the usage text of `decide`.

## Release Steps

1. Stage all changes except the root `marketplace.ts`.
2. Run `just check` and `just docker check`, and show the results.
3. After the user runs `ssh-add`, make the 9 signed commits, push, and wait for CI.
4. Fast-forward `main`, then delete the old tags and branches, after the user confirms each deletion.
5. Tell the user to back up `~/.claude` before the install of `claudetto`.

## Checks of This Session

```sh
timeout 60 openspec validate claudetto-0-1-0 --strict
bun run lint:md
just generate
just test tests/support/wiki-links.test.ts
just validate
```
