# Design: `claudetto` 0.1.0

## Context

See [proposal.md](proposal.md), section "Why", for the motivation.
The faults are in [faults.md](faults.md) and [faults-review.md](faults-review.md).
The kept and dropped features are in [features.md](features.md).
The layers, the graphs, the file tree, and the long-term rules are in [architecture.md](architecture.md).

The current state that shapes the approach:

- The repository builds 8 plugins from `src/` with `just generate`.
  A test fails when a file in `plugins/` differs from its source.
- Claude Code 2.1.300 gives the Mod API (`register.ts` with `$`), the classic hooks of `hooks.json`, and the built-in settings and env vars.
  The evidence for each extension point is in the dossier `external/cc-kg/2.1.299/` and its delta for 2.1.300.
- The `spec` slice has a binary and an event log, and costs tool calls (E6).
- Compaction stops long sessions at 270k to 277k tokens (L1, U8).
  The handover eval in `-p` (`handover-eval-300.md`) shows that a `session.compact` hook can replace the summary.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Each add-on imports nothing from another plugin.

## Goals / Non-Goals

**Goals:**

- One source tree that builds the core plugin and the 6 add-ons, with the bounds of the repository kept.
- Each feature uses the highest rung of the decision ladder that can do the work.
- The handover keeps a session going in the TUI and in `-p`, and falls back to the built-in compaction on each failure.
- A test or a lab run for each requirement of the specs.

**Non-Goals:**

- No compatibility layer for dotclaude 1.0.0 settings, files, or commands.
- No patch and no monkey-patch of the Claude Code binary or its npm package.
- No event log for MiniSpec.
- No change to the eval harness in `external/sdd/eval/` as part of this change.
- No new dotclaude env var where a Claude Code env var or flag can do the work.

## Decisions

### D1. Generator style stays

The source in `src/` stays small and hand-written.
`tools/` generates `plugins/` and the marketplace file.
The generator renames the plugins to `claudetto` and `claudetto-<name>`.

- Alternative: hand-written plugins with no generator.
  This loses the drift test and doubles the shared kernel in each add-on.
- Alternative: a bundler that inlines the kernel at publish time only.
  This makes `plugins/` differ from what the tests run.

### D2. The decision ladder

For each feature, the order is:

1. The Mod API.
2. A classic hook.
3. A built-in part of Claude Code: a setting, an env var, or a flag.
4. Nothing.

Each slice states its rung in one line of its source, and a test checks that the line is present.
A slice goes down a rung only for a reason that a test or a lab run shows, such as the Mod API not running in a mode.

- Alternative: classic hooks first, because they are older and documented.
  The Mod API gives typed inputs and model calls that classic hooks do not have (`$.model.fork`, `session.compact`).

### D3. Handover as the compaction, not as `/clear`

The handover runs inside `session.compact` for the main thread, with the trigger `auto` or `manual`.
It returns the first user message, one user message with the handover, and the tail with its `handle`.
On `nothing-to-fork`, `empty-reply`, `api-error`, or a missing or empty file, it calls `next(e)`.

The eval `handover-eval-300.md` gives the evidence:

- In `p5`, the hook replaced the summary in plain `-p`, and the run kept its `result` and its cost.
- In `p4`, without the tail, the run looped until the thrash notice, because `$.model.fork` does not see the newest tool result.
- In `p6`, a manual `/compact` after `--resume` gave `nothing-to-fork`, and `next(e)` succeeded.
- In 5 repeats of `p5` (`handover-repeat-300.md`), 2 runs read a done chunk again, because the fork called the facts unseen.
  With the done-step rule, 5 of 5 runs were clean.
- With a wrong value in the handover, 0 of 5 runs gave the right answer, also with the permission to re-check.
  With the ground check, 5 of 5 runs read 1 line and gave the right answer (`handover-edge-300.md`).

The manual command in the TUI clears and submits the resume prompt, because the TUI has a surface for it.
In `-p`, the manual command uses the compaction path.

- Alternative: write the file and run `/clear`.
  In plain `-p`, a clear erases the `result` and the cost, and no prompt can follow it.
- Alternative: write the file and do not clear (the Sixth Set, Jev confidence 0.45).
  The context stays full, so the session still stops.

The trigger comes from `autoCompactWindow` and `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, which are built in.
The bounds go to `src/kernel/budget.ts`.

### D4. MiniSpec with a CLI and no event log

MiniSpec, the SDD workflow, is skills, Markdown templates, and the `minispec` CLI.
The layout is near the layout of OpenSpec: `minispec/specs/` and `minispec/changes/<name>/`.
The tier of a change sets the files: small has no folder, medium has a proposal and tasks, big and large add specs and a design.
Each check in a task is a command, so a reviewer can run it.
The CLI follows <https://clig.dev/>, and the skills call it only to create, validate, show the status of, or archive a change.
The checked tasks are the record of the done work, so the handover reads the state from `tasks.md`.

This replaces the earlier choice of no binary (the user, 2026-10-15: "minispec, if like openspec, has its own binary, too").
The cause of E6 was the event log and the calls of the `spec` binary for each step, so the CLI keeps no log, and the 15 percent bound of the `minispec` spec stays.

- Alternative: no binary, skills and templates only.
  Validation and archive need a parser, and a parser in a skill costs more tool calls than one CLI call.
- Alternative: depend on the OpenSpec CLI.
  This adds a runtime dependency for each user, and its output does not follow the guidelines in each case.

### D5. The decision API is opt-in

The decision API calls Jev or a small Claude model only when the user turns it on.
Without it, the skill asks the user.

- Alternative: on by default.
  This sends text to an external service that the user did not choose.

### D6. The roots of the output sweep

The sweep removes only a path that is in the record and inside an allowed root: the temp folder of the user, the worktree folder of Claude Code, and the sandbox config folders.
It keeps each path that a live session, a running job, or a worktree in use needs.
A session is live when its process runs, and a job is running when Claude Code lists it.
It does not follow a symlink out of a root.

- Alternative: sweep by a name pattern, such as each `tmp.*`.
  This can remove the files of another program.
- Alternative: sweep only at session end.
  A crash leaves outputs, so the sweep also runs at session start and with a command.

The age bound is 7 days, because a session that waits longer than one week is rare and `--resume` still has its transcript.
The size bound is 5 GiB, because the removed folders of this repository held about 2 GB, and a smaller bound removes the outputs of one large eval run.
Both bounds are in `slices/gc/limits.ts`.

### D7. Model and effort of the agents

The sweep in `external/sdd/eval/runs/big-sweep-300/` sets `model` and `effort` in the frontmatter of each agent.
Opus goes to `high` at most.
The results are a rough guide (n=1), and on a tie the cheaper setting wins.
The sweep measured only change tasks.
The table comes from `external/sdd/eval/results-big-sweep.md` and two questions to Jev (2026-10-15).
The first question gave Jev the results, the roles, and the rules.
The second question added the words of the user and the risk that a reviewer of the implementer's model family shares its blind spots.

| Role | Model and effort | Reason |
| --- | --- | --- |
| `implementer` | Haiku `xhigh` | Rank 1: 5 of 6 resolved, F2P share 0.96, 8.55 USD. Jev: 0.97 |
| `debugger` | Opus `high` | Rank 2, and the example of the user. Jev, second question: 0.77 against 0.23 |
| `reviewer` | Opus `high` | A model family that is not the family of the implementer. Jev, second question: 0.85 against 0.15 |
| `planner` | Haiku `xhigh` | Rank 1 is better than rank 4 (Opus `medium`). Jev: 0.83 |
| `investigator`, `researcher` | Haiku `xhigh` | Jev: 0.57 and 0.53 against 0.30 and 0.28 for Haiku `low`. Jev is not sure, so quality before speed decides |

### D8. Add-ons copy the kernel

The generator copies the parts of `src/kernel/` that an add-on uses into the add-on.
No add-on imports from another plugin at run time.

- Alternative: a shared npm package.
  This adds an install step and a version skew between plugins.

## Risks / Trade-offs

- [The handover and `session.identity` clash with managed setups]
  When managed settings are present, a managed MCP file exists, or the login is Team or Enterprise, the built-in guard `cc-plugin-sec-default` gives `session.compact` only to the `appendPlugins` tier.
  A plugin that a person installs is skipped, so a Team user gets no handover.
  `session.identity` gives a `deny` to each plugin outside that list.
  The evidence is in the bundle only (`handover-managed-300.md`), because a real managed run needs `sudo` to write `/Library/Application Support/ClaudeCode/`.
  `CLAUDE_CODE_MANAGED_SETTINGS_PATH`, `CLAUDE_CODE_REMOTE_SETTINGS_PATH`, and `--managed-settings` do not seat the guard.
  → The handover spec says once that the handover is off, and names the `appendPlugins` entry.
  How the mod detects the skip is not tested, and a task covers it.
- [A large tool result in the tail keeps the context above the trigger]
  → The mod cuts the tail to the last tool result, or calls `next(e)` when the cut is not enough.
  A lab test covers each path.
- [The handover can lock in a wrong fact]
  The ground check finds only a value that is quoted and not in the messages.
  A wrong fact in prose, or a value that a tool result holds in another place, passes.
  Each arm of the eval has 5 runs on one Haiku task.
  → The done-step rule allows small re-checks, and the eval runs again for each change of the prompt.
- [`$.model.complete` after `nothing-to-fork` is not tested]
  → The handover calls `$.model.complete` on the messages and calls `next(e)` when the call fails, and task 3.2 tests both paths.
- [The handover in the TUI and in `-p --input-format stream-json` is not tested]
  → The tasks have a sandbox run for each mode before the alpha tag.
- [The YSK add-on reads a GrowthBook cache, not an API]
  → When the cache has no value, the add-on does nothing and says why.
- [The prompt extract is a stale 2.1.299 copy (V6)]
  → The prompt profile builds from the live block of 2.1.300.
- [The `Stop` agent hook did not fire in `-p` (V7)]
  → Task 1.10 finds the cause before a slice uses an agent hook.
- [The 6 new env vars of 2.1.300 are not in the docs]
  → A setting uses them only with a test that pins the behavior.
- [The agent sweep has one run for each setting]
  → The results file calls the ranking a rough guide, and the cheaper setting wins a tie.
- [The minimum version 2.1.300 excludes older installs]
  → The plugin says the version at session start and turns off the handover below it.

## Migration Plan

1. Build `claudetto` on the branch `feat/claudetto-0-1-0`, with `just check` green at each task group.
2. Run the sandbox sessions of the handover in the TUI, plain `-p`, and `stream-json`.
3. Tag `0.1.0-alpha.1`, and publish the new marketplace file.
4. Remove the historical dotclaude pages from `wiki/`, and add the `claudetto` pages.
5. The users of dotclaude 1.0.0 remove the old plugins and install `claudetto`.
   No setting carries over, and the wiki says so.

Rollback: the tag `1.0.0` and its marketplace file stay.
A user who installs from that tag gets dotclaude 1.0.0.

## Open Questions

None.
C3 is decided: `tools/validate.ts` exempts `.claude/skills/openspec-*` (the user, 2026-10-15: "excempt agreed").
