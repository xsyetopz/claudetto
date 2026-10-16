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
  The handoff eval in `-p` (`handoff-eval-300.md`) shows that a `session.compact` hook can replace the summary.
- Each file has 300 lines or less, and each test file has 500 lines or less.
- Each add-on imports nothing from another plugin.

## Goals / Non-Goals

**Goals:**

- One source tree that builds the core plugin and the 6 add-ons, with the bounds of the repository kept.
- Each feature uses the highest rung of the decision ladder that can do the work.
- The handoff keeps a session going in the TUI and in `-p`, and falls back to the built-in compaction on each failure.
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

### D3. Handoff as the compaction, not as `/clear`

The handoff runs inside `session.compact` for the main thread, with the trigger `auto` or `manual`.
It returns one user message with the text of the first user message and the handoff, and the tail with its `handle`.
The two texts are in one message, because Claude Code sends each message that a hook gives back to the output again, and `num_turns` counts each user message there (`handoff-turns-301.md`).
The first user message loses its `handle`, so an image or an attachment in it does not stay.
On `nothing-to-fork`, a `haiku` completion writes the handoff from a digest of the messages of at most 15,000 tokens, because a completion reads no prompt cache (`handoff-cost-301.md`).
On a digest that does not fit, `empty-reply`, `api-error`, or a missing or empty file, it calls `next(e)`.

The eval `handoff-eval-300.md` gives the evidence:

- In `p5`, the hook replaced the summary in plain `-p`, and the run kept its `result` and its cost.
- In `p4`, without the tail, the run looped until the thrash notice, because `$.model.fork` does not see the newest tool result.
- In `p6`, a manual `/compact` after `--resume` gave `nothing-to-fork`, and `next(e)` succeeded.
- In 5 repeats of `p5` (`handoff-repeat-300.md`), 2 runs read a done chunk again, because the fork called the facts unseen.
  With the done-step rule, 5 of 5 runs were clean.
- With a wrong value in the handoff, 0 of 5 runs gave the right answer, also with the permission to re-check.
  With the ground check, 5 of 5 runs read 1 line and gave the right answer (`handoff-edge-300.md`).

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
The checked tasks are the record of the done work, so the handoff reads the state from `tasks.md`.

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
A session is live when its `sessions/<pid>.json` file names a running process, and a job belongs to a session, so a live session covers its jobs.
The sweep also keeps a path that holds the working directory of a live session.
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
The user set `debugger` and `reviewer` to `medium` (the user, 2026-10-16).
The results are a rough guide (n=1), and on a tie the cheaper setting wins.
The sweep measured only change tasks.
The table comes from `external/sdd/eval/results-big-sweep.md` and two questions to Jev (2026-10-15).
The first question gave Jev the results, the roles, and the rules.
The second question added the words of the user and the risk that a reviewer of the implementer's model family shares its blind spots.

| Role | Model and effort | Reason |
| --- | --- | --- |
| `implementer` | Haiku `xhigh` | Rank 1: 5 of 6 resolved, F2P share 0.96, 8.55 USD. Jev: 0.97 |
| `debugger` | Opus `medium` | Rank 2, and the example of the user. Jev, second question: 0.77 against 0.23 |
| `reviewer` | Opus `medium` | A model family that is not the family of the implementer. Jev, second question: 0.85 against 0.15 |
| `planner` | Haiku `xhigh` | Rank 1 is better than rank 4 (Opus `medium`). Jev: 0.83 |
| `investigator`, `researcher` | Haiku `xhigh` | Jev: 0.57 and 0.53 against 0.30 and 0.28 for Haiku `low`. Jev is not sure, so quality before speed decides |

### D8. Add-ons copy the kernel

The generator copies the parts of `src/kernel/` that an add-on uses into the add-on.
No add-on imports from another plugin at run time.

- Alternative: a shared npm package.
  This adds an install step and a version skew between plugins.

### D9. The turn gate runs in the hooks module

The gate runs at `Stop` and at `SubagentStop`, in the hooks module of the core plugin (D39), and not as a `type: "prompt"` hook.
Its first part reads `background_tasks` and blocks a stop while a task has the status `running`, with no model call.
Its second part is the judge, which is on by default, and which the user can turn off (the user, 2026-10-16).
The judge fixes the three failures of the dotclaude 0.28.0 judge ([Stop Prompt Hooks](../../../wiki/archive/Stop-Prompt-Hooks.md)):

- The same false claim passed after a block in 2 of 3 runs, because the prompt answered `ok` when `stop_hook_active` was `true`.
  → The gate does not pass on `stop_hook_active`, and its own count stops the loop after 2 continuations.
- Each block sent the whole judge prompt to Claude, because Claude Code puts a hook `prompt` into the `Stop hook feedback` text.
  → The hook returns only the reason of the judge.
- Each turn cost about 6,914 more input tokens, because the prompt hook sends the transcript.
  → The judge gets only `last_assistant_message` and a summary of the tool calls of the turn, and it does not run on a reply that only asks a question.

The rubric comes from the official texts in [Model Guidance](../../../wiki/evidence/Model-Guidance.md), and the judge model is not Haiku.
No part matches words of the reply.

### D10. The ground gates read structure

Each ground gate reads a fact that a tool gives, not words: git state, the lockfile and the registry, file stats, and the hash of a `tool_input`.
The read gate keeps a record for each agent of the path, the `mtime`, the size, and the line ranges, because the built-in dedup covers only the same range (D60).
A handoff, a compaction, or the clear of old tool results empties the record, because the content then is not in the context.
The guard already denies a `Bash` command part that only prints a file, so `Read` is the only read path.

## Risks / Trade-offs

- [The handoff and `session.identity` clash with managed setups]
  When managed settings are present, a managed MCP file exists, or the login is Team or Enterprise, the built-in guard `cc-plugin-sec-default` gives `session.compact` only to the `appendPlugins` tier.
  A plugin that a person installs is skipped, so a Team user gets no handoff.
  `session.identity` gives a `deny` to each plugin outside that list.
  The evidence is in the bundle only (`handoff-managed-300.md`), because a real managed run needs `sudo` to write `/Library/Application Support/ClaudeCode/`.
  `CLAUDE_CODE_MANAGED_SETTINGS_PATH`, `CLAUDE_CODE_REMOTE_SETTINGS_PATH`, and `--managed-settings` do not seat the guard.
  → The handoff spec says once that the handoff is off, and names the `appendPlugins` entry.
  How the mod detects the skip is not tested, and a task covers it.
- [A large tool result in the tail keeps the context above the trigger]
  → The mod cuts the tail to the last tool result, or calls `next(e)` when the cut is not enough.
  A lab test covers each path.
- [The handoff can lock in a wrong fact]
  The ground check finds only a value that is quoted and not in the messages.
  A wrong fact in prose, or a value that a tool result holds in another place, passes.
  Each arm of the eval has 5 runs on one Haiku task.
  → The done-step rule allows small re-checks, and the eval runs again for each change of the prompt.
- [The digest after `nothing-to-fork` drops the unlabeled lines of a large result, and the built-in compaction reads all of them]
  → Task 3.2 has a resume trial of each arm with the retention fixture (`handoff-retention-301.md`).
- [The handoff in the TUI and in `-p --input-format stream-json` is not tested]
  → The tasks have a sandbox run for each mode before the alpha tag.
- [The YSK add-on reads a GrowthBook cache, not an API]
  → When the cache has no value, the add-on does nothing and says why.
- [The prompt extract is a stale 2.1.299 copy (V6)]
  → The prompt profile builds from the live block of 2.1.301 (`live-block.ts`), and a test compares the intro rules with it.
- [No hook gives the model of a subagent before its task prompt is fixed]
  The `agent.spawn` call has no model when the agent file or `CLAUDE_CODE_SUBAGENT_MODEL` chooses it, and only the result of `next(e)` has the model that the engine resolved.
  → The `session.append` hook writes the block into the task row of the subagent after the spawn resolves, for each agent from each source.
  A live run shows that the rewrite reaches the first request of a subagent that runs in the background (`prompt-live-301.md`).
- [The `Stop` agent hook did not fire in `-p` (V7)]
  → Task 1.10 finds the cause before a slice uses an agent hook.
- [The 6 new env vars of 2.1.300 are not in the docs]
  → A setting uses them only with a test that pins the behavior.
- [The agent sweep has one run for each setting]
  → The results file calls the ranking a rough guide, and the cheaper setting wins a tie.
- [The minimum version 2.1.302 excludes older installs]
  → The docs and the README state the version, and the code has no runtime check of it (the user, 2026-10-15).
- [The judge costs a model call at each stop]
  → The setup and the docs state the measured cost of one judge call, and the user can turn the judge off.
- [A judge call fails or times out]
  → The gate allows the stop and logs the failure, and the background-task part still runs.
- [The mod API may not give `background_tasks`, the `mtime`, or the clear of tool results]
  → Task 21.1 answers each question in the lab before a slice uses it.
- [A child process that the harness does not track]
  → The gate does not see it, and a lock file with the PID covers the long checks of the plugin (`I17`).

## Migration Plan

1. Build `claudetto` on the branch `feat/claudetto-0-1-0`, with `just check` green at each task group.
2. Run the sandbox sessions of the handoff in the TUI, plain `-p`, and `stream-json`.
3. Tag `0.1.0-alpha.1`, and publish the new marketplace file.
4. Remove the historical dotclaude pages from `wiki/`, and add the `claudetto` pages.
5. The users of dotclaude 1.0.0 remove the old plugins and install `claudetto`.
   No setting carries over, and the wiki says so.

Rollback: the tag `1.0.0` and its marketplace file stay.
A user who installs from that tag gets dotclaude 1.0.0.

## Open Questions

- The snippet keeps `allowUnsandboxedCommands: true` (`I10`) (the user, 2026-10-16).
  The hard stop of `/claudetto:setup sandbox` still writes `false`.
- The judge is on by default (the user, 2026-10-16).
  Task 21.6 measures the cost of one call, and the docs state it.
C3 is decided: `tools/validate.ts` exempts `.claude/skills/openspec-*` (the user, 2026-10-15: "excempt agreed").
