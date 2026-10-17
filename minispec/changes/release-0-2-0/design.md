# Design: release-0-2-0

## Context

`0.1.0-alpha.1` is tagged, so this change starts with `just bump` to `0.2.0`.
The version is `0.2.0` and not `0.1.0-alpha.2`, because the change breaks users, and the user asked for `0.2.0` for a breaking change (2026-10-17).
The breaks are the rewrite of `claudetto-you-should-know` (D1), the telemetry switches of the snippet, which turn off the built-in parts that need feature flags (D31), the removal of the slices `worktree`, `attribution`, and `corrections` with the `commit-msg` hook and `.claudetto/corrections.md` (D12), and the MiniSpec files with no frontmatter that `minispec validate` refuses (D9).
`CHANGELOG.md` names each break under `0.2.0`.
The working tree has uncommitted deletions of `openspec/` and `.claude/skills/openspec-*`, which are the user's work.
The user asks for no legacy upkeep: no alias, shim, or migration for a removed thing.
The user asks for prompts that give goals, not narrow steps, because narrow steps make a model narrow.
`.claude/rules/extension-points.md` forbids runtime code for a feature that Claude Code has.

Evidence from `external/2026-10-17/` (untrusted, used as leads):

- Haiku 5.5 is strong and cheap under 100K tokens of context, and fits small, well-defined fixes (`export-If you let Claude Code use Opus for small bug fixes...jsonl`: 30 of 30 small fixes passed, $0.013 against $0.206 on Opus).
  On a harder bug, Sonnet won (same file).
- "Sonnet 5.5 for almost everything, Opus 5.5 for the most complicated tasks, and Haiku 5.5 for the simplest" (`export-Haiku 5.5 on Steroids.jsonl`).
  Sonnet stays on the task, and Opus reads the whole tree (`export-Anyone solely trying out Sonnet 5.5 this week-.jsonl`).
- Cache writes are 3% of tokens and 46% of cost, and a pause past the TTL rebuilds the cache (`export-I priced 19,593 requests...jsonl`).
  `promptCacheTtl`, `CLAUDE_CODE_PROMPT_CACHE_TTL`, and `subagentPromptCacheTtl` set the TTL from 2.1.242 (`export-Your Claude Code prompt cache drops...jsonl`).
- Self-review prompts make a run take hours (`export-Is it just me, or does Claude Code take hours...jsonl`).
- "Hooks for musts, rules for shoulds" (`export-Opus 5.5 does not follow rules.jsonl`).

## Decisions

### D1. Rewrite `claudetto-you-should-know` to match the built-in, with no telemetry

The built-in `cc-plugin-you-should-know` needs feature-flag fetching (`external/cc-2.1.302/docs/env.md:587`), and D31 turns that off.
The user wants the built-in look and behavior with no telemetry, and chose a rewrite on 2026-10-17.
The current add-on (1,607 lines of `.ts`) "looks nothing like builtin", in the words of the user.

- The add-on is new code on the documented mods API: a `ui.render` hook on `AbovePrompt`, which draws in the terminal and the Desktop app with the flags off (`plugins_mods_overview.md:198`), and a side agent from `$.agent.spawn`.
- Task 2.1 reads all of the code of the built-in in the 2.1.302 bundle, which `CLAUDE.md` permits for evidence, for its look, its feel, and its behavior: the trigger, the model, the prompt, the state, the timing, the keys, and the render tree.
  The notes of the built-in in this session agree: a first line `<kind> · <summary>`, such as `Heads up` or `You should know`, a bold title, a short list, and a last line that says what the main agent does next.
- The add-on is the smallest code that gives the same look, feel, and behavior, with one test for each behavior of task 2.1, and fewer lines than the 1,607 of the current add-on.
  It is written new, and no code of the bundle goes into it, because `anthropics/claude-code` is "All rights reserved".
- The `mods/` folder of `anthropics/claude-code` has `agents-md`, `diff`, `sec-default`, and `telemetry`, and not `you-should-know` (GitHub API, 2026-10-17), so its source is not public.
- The add-on sends no telemetry and calls no `$.telemetry` method.
- The snippet keeps `cc-plugin-you-should-know@builtin` off, so that two notes do not show.

- Alternative: a fork of the built-in code from the bundle.
  Rejected, because it puts closed Anthropic code in a public repository.
- Alternative: remove the add-on.
  Rejected by the user, because D31 turns off the built-in.

### D2. No `maxTurns`, and no context cap for subagents

Each cap stopped a helper before it wrote its result, and no measurement set the values.
Claude Code compaction and the handoff trigger already bound the context.
The Haiku price step at 100K stays a reason to give Haiku only small work (D3), not a reason to stop a run.

A Haiku run past 100K tokens pays 5x for each later step ($0.50 and $2.50 per MTok against $0.10 and $0.50), and nothing in D3 enforces the small scope.
So a Haiku agent keeps one guard that does not stop the run:

- First choice: compaction keeps a Haiku subagent under 100K, with `HAIKU_AUTOCOMPACT_WINDOW` of `src/kernel/budget.ts`, if the docs or the bundle show that a subagent compacts at that window.
- Else: one notice near `HAIKU_HANDOFF_TRIGGER_TOKENS` less 10K, which says that the price step is close and asks for a report of the done and the open work, so that the caller resumes with a fresh run.
  A user who runs Haiku workers reports a warning at 80K and 95K that works (`2026-10-17/export-Haiku 5.5 isn't getting enough love.jsonl`).

A second opinion (Jev) leaned to compaction at confidence 0.30, so the choice rests on the check of task 4.2.

- Alternative: raise the caps.
  Rejected, because any fixed cap stops a large task, and the caller can stop a run with `TaskStop`.
- Alternative: no guard for Haiku.
  Rejected, because one long Haiku run can cost more than the Sonnet run that it replaces.

### D3. Roster by model fit

| Role | Model | Effort | Work |
| --- | --- | --- | --- |
| `scout` (new) | Haiku 5.5 | `high` | Find the files, symbols, and lines that a change touches, read-only. |
| `fixer` (new) | Haiku 5.5 | `high` | One closed, mechanical change in one or two files with a known check. |
| `implementer` | Sonnet 5.5 | `high` | One slice over several files from a plan, with a known check. |
| `investigator` | Sonnet 5.5 | `high` | A read-only question over many files, logs, or history. |
| `researcher` | Sonnet 5.5 | `high` | A question from web pages and docs. |
| `planner` | Opus 5.5 | `high` | A plan that the caller reviews. |
| `debugger` | Opus 5.5 | `medium` | An unknown cause. |
| `reviewer` | Opus 5.5 | `medium` | A review or a fact check with a fresh context. |

Evidence from the older dossiers:

- As subagents on 6 real tasks at `high`, code search found 45, 44, and 44 of 48 files on Opus, Sonnet, and Haiku, for $6.17, $1.38, and $0.44.
  Haiku at `xhigh` found the same 44 files for 3x the cost (`2026-10-12/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl`).
  So `scout` is Haiku at `high`, and no Haiku role uses `xhigh`.
- In the same test, web research had 1, 3, and 10 wrong facts, and a fact check marked 0, 6, and 30 correct sentences as wrong, on Opus, Sonnet, and Haiku.
  So the researcher leaves Haiku, and no review or fact check runs on Haiku or Sonnet.
- Haiku below `high` fails a reasoning trap, and "Haiku is not for intent or deciding, it is for mechanical predefined tasks" (`2026-10-14/export-DO NOT USE Haiku 5.5 on Medium effort.jsonl`).
  Haiku follows a misleading comment in real code (`2026-10-11/export-Haiku 5.5 is cheap bad.jsonl`).
  So Haiku gets no planning and no open work.
- At the same effort, Opus leads Sonnet by 5 to 8 points on hard agentic coding, and they tie on research and docs (`2026-09-29_p2/export-Sonnet 5.5 vs Opus 5.5- the Terminal-Bench -win- is Max vs Xhigh...jsonl`).
  "Have Opus 5.5 plan out the task in detail and hand the implementation to Sonnet as a subagent" (`2026-09-29/export-Sonnet 5.5 is not worth using it unless at Low-Med effort.jsonl`).
  So the planner is Opus and the implementer is Sonnet.

The descriptions say the size of work for each role, so that the caller picks by size.

- Alternative: one agent with a model parameter.
  Rejected, because the caller then picks the model with no rule, and the description cannot say the fit.

### D4. The status line shows the effective window

The main session shows `windowOf(size)` from `src/kernel/budget.ts`.
A subagent row shows the window of its model family: `HAIKU_AUTOCOMPACT_WINDOW` for Haiku, else `windowOf(size)`.

- Alternative: show both windows.
  Rejected, because the extra number takes room and the user acts on the effective one.

### D5. One-line notices

Each `$.ui.log` text is one line.
A helper in `src/kernel/text.ts` folds line breaks to ` · ` before the call, and the notice text drops its own `claudetto` prefix.
The cap notice names the count of open tasks, not the full block reason.

- Alternative: send a multi-line text.
  Rejected, because the notice line renders a line break as `�`.

### D6. Prompt cache TTL in the setup snippet

D18 in [`design-surfaces.md`](design-surfaces.md) replaces this decision: the snippet sets no `promptCacheTtl`, and `subagentPromptCacheTtl` waits for the measure of task 7.9.
Task 7.1 confirms the key names in the Claude Code docs before the change.
One user measured that a 1-hour TTL lowers the cost of the main session and raises the cost of subagents (`2026-10-07_p2/export-Subagents use a 5-min cache by default...jsonl`).

D12 and D13 are in [`design-trim.md`](design-trim.md), and D24 to D29 are in [`design-evidence.md`](design-evidence.md).

### D7. A fast check after each change of behavior, the full checks at the end of a part

The prompt says to run a fast check after each edit that changes behavior: the lint and the type check of the changed files, and the tests of those files.
It says to run the full checks that cover a part once the part is done, and to skip each check for an edit that changes no behavior, such as a typo in a comment.
The fast check finds an error near its cause, and the full suite of a large codebase, which can take many minutes, runs once for each part.
Böckeler: "Computational sensors are cheap and fast enough to run on every change, alongside the agent."
Anthropic warns that Claude "will happily spend hours running tests instead of making progress".
Jev picked `fast-per-edit-full-per-part` at confidence 0.83 on 2026-10-17, over the earlier rule of full checks at the end of a part only.
The prompt names no test tool, so that the model uses the command of the project, such as a path argument of the test runner.
The turn gate keeps its claim rule, so a claim still needs a run.

- Alternative: a hook that counts test runs.
  Rejected, because a rule for a should is enough and a hook adds code.

### D8. jscpd integration

- `src/plugins/claudetto/slices/dry/assets/jscpd.base.json` holds the base from the user's `jscpd-strict` skill, which covers all formats of jscpd 5.4.1.
- `bin/jscpd-config` (TypeScript, Bun) merges a `jscpd.local.json` chain with `extends` into `.jscpd.json`, with the merge rules of the user's `jscpd_config.py`: deep merge of objects, append for the ignore lists, `<key>Remove`, and `null` to delete a key.
- This repository gets `jscpd.local.json` that extends the shipped base, `.jscpd-baseline.json`, and the `just dry` recipe in `just check`, with `failOnNewClones: 0`.
- The skill `dry` says when to run jscpd, how to read a clone report, and when a merge of two clones is right, as goals and limits, in at most 60 lines.
- No format list or language name is in code.
  The formats come from the config only.
- Semantic clones are off in this repository (`"semantic": null`), because the model is 548 MB.
- Alternative: a Python script, as in the user's skill.
  Rejected, because `tools/` and `bin/` run on Bun, and one runtime is less to keep.

### D9. MiniSpec frontmatter and `.minispec.yml`

Each file of a change starts with YAML frontmatter: `proposal.md` has `name`, `tier`, `status`, and `created`, and `tasks.md` has `change`.
`.minispec.yml` at the repository root holds the paths of `specs/` and `changes/`, and the tier defaults.
`minispec new` writes both, and `minispec validate` checks both.
Files with no frontmatter fail validation, with no migration, by the no-legacy rule.

- Alternative: `.minispec.yaml` too.
  Accept both names, and refuse a repository that has both.

### D10. Setup acts on the user's yes

When the user agrees to a change that the setup offers, such as the `claude` alias in `~/.zshrc`, the setup makes the change in the same turn.
The sandbox write list gets the cache folder of each toolchain that the project uses, read from the env of the toolchain (`CARGO_TARGET_DIR`, `cargo metadata`, and the like), not from a fixed list of paths.

### D11. Helpers start from the current branch

A subagent worktree branches from the default branch "unless `worktree.baseRef` is set to `"head"`" (`code.claude.com/docs/en/worktrees`, "Isolate subagents with worktrees").
The settings snippet already sets `worktree.baseRef` to `head` (`src/wiki/reference/Settings-Apply.md:39`), so the `versionlens-redux` helper that started from `main` ran without it.
The drift check of the setup names a missing `worktree.baseRef`.
The prompts stop asking for long-lived lane worktrees, because the isolation checks block a helper from a path outside its own worktree (same page, "How Claude Code enforces isolation").
The main session merges each finished task into the feature branch and starts the next helper from it.

### D14. Concurrency caps by the limit that binds

The cap does not change the total cost of a fixed amount of work, so it does not change the weekly usage.
It sets only how fast a burst of helpers drains the 5-hour window.
So a cap must be low only where the 5-hour window binds, and on each plan it must stop a runaway fan-out, such as the 394 subagent calls in ten minutes of `external/2026-10-12_p2/export-Claude Code's subagent limits*`.

The facts, from the transcripts of the last 30 days at API list prices (`$TMPDIR/burn/*.py`, 2026-10-17):

| Run | Median per active hour | p90 per active hour |
| --- | --- | --- |
| Main session (40 runs, Opus 5.5) | $9.2 | $14.5 |
| Opus helper (86 runs) | $10.7 | $15.6 |
| Sonnet helper (261 runs) | $3.8 | $7.9 |
| Haiku helper (42 runs) | $0.5 | $0.7 |

The Max 20x account of the user (the user, 2026-10-17):

- One session of $5.69 used 5% of the 5-hour window, and one of $2.95 used 2% (`/usage` and the status line), so the window is about $120 at list prices.
- The week of 2026-10-12 reached 89% at $972 (`just usage --days 7`), so the week is about $1,090, or about 9 full windows.
- The user never reached the 5-hour limit, and often reaches the weekly limit 2 days before its reset.
  The cap in use was 2, not 7, because setup read the account as Pro (D19 in `design-surfaces.md`).

So on Max 20x the 5-hour window did not bind at 2 helpers, and the cap goes to 10 to make fewer helpers wait.
At the median rates, 10 helpers and the main session use about $47 per hour, so a burst that uses all slots for 2.5 hours is the first that reaches the window.
On Max 5x and Pro, the window is about a quarter and a twentieth of that ($30 and $6), if the plan names hold, and the main session alone drains a Pro window in about 40 minutes.
No session of the user measures those plans, so their caps stay at 4 and 2.
The API rate limits do not bind: the Start tier gives 2,000,000 input tokens per minute for Opus 5.5, Sonnet 5.5, and Haiku 5.5, and cache reads do not count (`platform.claude.com/docs/en/api/rate-limits`).
The monthly spend cap binds ($500 Start, $1,000 Build), so the API key gets its own `SUBAGENTS_API` of 4, as a stop for a runaway fan-out.

The weekly usage falls only when each helper costs less: the model of each role (D3), fewer fresh helpers, which each write about 14k tokens to the cache before their first call, and no `general-purpose` helper (31% of the usage of the last day by `/usage`).
Task 4.7 records the method and the numbers in `wiki/evidence/Usage-Evidence.md`, so that a new measure can tune them.

- Alternative: 4, 8, and 12, which a second opinion (Jev) picked at confidence 0.79 before the measure.
  Rejected, because 8 helpers on Max 5x drain its window of about $30 in under an hour.
- Alternative: no cap, so the default of 20 applies.
  Rejected, because 20 helpers at the median rates drain a Max 20x window in about 1.4 hours, and nothing stops a runaway fan-out.
- Alternative: lower caps to save weekly usage.
  Rejected, because the cap does not change the cost of the work, only its speed.

### D15. Each built-in tool is on or off by need, with a measure

The settings snippet denies `TaskStop`, `TaskCreate`, `TaskGet`, `TaskList`, `TaskUpdate`, `EnterPlanMode`, `ExitPlanMode`, `ScheduleWakeup`, and `ReportFindings` (`src/plugins/claudetto/slices/prompt/slice.ts:173`-`182`).
The turn gate tells the model to stop a task with `TaskStop` (`slices/turngate/prompts/tasks-reason.md:4`), so the two parts of claudetto disagree, and a session on 2026-10-17 could not stop its own background task.
Each built-in tool gets one row in `src/wiki/reference/Tools.md`: what it does, the start tokens of its schema, which claudetto text or hook needs it, and the decision.
A tool stays on when a claudetto text, a hook, or a common task needs it, such as `TaskStop` for a background task.
A tool goes off, by a `deny` rule, when nothing needs it and a measure shows a saving.
A test fails when a claudetto text names a tool that the snippet denies.

- Alternative: keep the deny list and change the texts.
  Rejected, because a session with no way to stop a background task stalls at the turn gate.

### D16. Each env var of Claude Code 2.1.302 is a measured choice

The `env` of `settings.json` can set each env var that Claude Code reads.
Many env vars change more than their name says, such as a cache TTL that also changes the price of a write.
`src/wiki/reference/Env.md` gets one row for each env var that the 2.1.302 bundle reads: what it does, what else it changes, the source (the docs, the bundle, or a dossier thread with its file name), and the decision of claudetto.
The settings snippet sets an env var only when its row says why, and a test pins the snippet to the rows with a decision of `set`.
The rows come from the env-vars page of the docs and from the names that the bundle reads, so that no env var is missed.
Community reports are leads, and a row that rests on one needs a docs or bundle source too.

- Alternative: set only the env vars that claudetto uses now.
  Rejected, because the user asks for the best choice from all of them.

### D17. Each text that claudetto can override is rewritten for the model that reads it

claudetto can replace or add text at these points: the descriptions of built-in tools (`tool.describe` in `slices/surface/`, now only `Agent`, `Bash`, `Read`, and `ListAgents`), the system prompt blocks (`slices/prompt/`), the output styles, the agent descriptions and bodies, the skill descriptions and bodies, the MCP tool descriptions and server instructions, the `CLAUDE.md` block of the setup, and each hook message.
Task 6.2 lists each point from the extension points of 2.1.302 and covers each one, not only the four tools.
Each text is written for the model that reads it: Opus 5.5 for the main session, the planner, the reviewer, and the debugger, Sonnet 5.5 for the implementer, the investigator, and the researcher, and Haiku 5.5 for `scout`, `fixer`, and the judge calls of the hooks.
The rules come from `.claude/skills/claude-api/shared/prompt-audit.md` (no pressure words, the goal and not the method, no scaffolds that a feature replaces, no fossils, tool descriptions that say when to use the tool) and from the behavior notes of each model in `shared/model-migration.md`.
A Haiku text can say more about the result and the limits, because Haiku follows a misleading clue in the code (`2026-10-11/export-Haiku 5.5 is cheap bad.jsonl`), but it also gives a goal and not steps.
A built-in tool description is replaced only when the new text is shorter or fixes a fault that a session shows.

- Alternative: rewrite only the texts that claudetto writes now.
  Rejected, because the user asks for each text that claudetto can override.

The decisions D18 to D23, from the inventory of 2.1.302, are in [`design-surfaces.md`](design-surfaces.md).
D32 to D36, the handoffs, are in [`design-handoff.md`](design-handoff.md).
D37 and D38, the solo build and the bar of a stable release, are in [`design-release.md`](design-release.md).
D39 to D42, the redo of each part from first principles, are in [`design-redo.md`](design-redo.md).
D43 and D44, the sandbox with no prompts and the cleanup of Claude's own files, are in [`design-sandbox.md`](design-sandbox.md).

## Risks

- Without `maxTurns`, a run in a loop costs more.
  The caller sees each run in the status line, and `TaskStop` ends it.
- Opus as the planner costs more for each plan.
  A plan is one run for each change.
- Merges of files can break the generated plugins.
  `just generate` and `just check` run after each merge task.
- The engine facts from the dossier can be wrong.
  Tasks 7.1 and 7.4 check them before any change rests on them.

## Resolved questions

The user settled question 4 on 2026-10-17, and asked to settle the rest from the web, the dossiers, and the `claude-api` reference.

1. **Haiku keeps `scout` and `fixer`.**
   The sub-agents docs say the built-in Explore agent runs on Opus, and that an agent named `Explore` with `model: haiku` overrides it (`code.claude.com/docs/en/sub-agents`).
   The `claude-api` reference names Haiku 5.5 "for high-volume, latency-sensitive work such as classification, routing, extraction, and sub-agent tasks", at $0.10 and $0.50 per MTok up to 100K tokens and $0.50 and $2.50 above (`.claude/skills/claude-api/shared/models.md:87`).
   The dossier shows code-search parity with Opus (D3).
   The same reference says the default effort of Haiku 5.5 is `medium`, so each Haiku agent sets `high` in its frontmatter.
2. **The wiki has a page bound, not a word target.**
   No source gives a right size.
   D13 sets at most 150 lines for each page and no narrative, which `just validate` can check, and a bound is easy to change later.
3. **The start target is half of the part that claudetto adds.**
   The system tools (7K) and the system prompt of Claude Code are not claudetto's to cut.
   A skill costs its name and description at the start, and `CLAUDE.md` loads at each turn (`composio.dev/blog/ways-to-cut-token-consumption-in-claude-code`, `computingforgeeks.com/reduce-claude-code-token-usage-tools/`), so the cuts go first to the `CLAUDE.md` block, then to the descriptions.
4. **No history rewrite.**
   `dotclaude` goes from the tracked files only (the user, 2026-10-17).
