# Evidence

## 9.11

Task 9.11 looks for a cut of the time of `gate` in `slices/guard/domain/`.

### Method

`/tmp/claudetto-bench/ab.ts` loads two copies of `gate.ts` in one process.
It runs each command of `tests/claudetto/guard/corpus/gate.json` through each copy, with the rounds interleaved.
It runs 30 warm-up rounds and then 1500 timed rounds, and it prints the median of the time for each call.
Copy A is the tree before the change, and copy B is the tree after it.
A `diff -rq` of `kernel/` and `slices/` of the two copies shows that `paths.ts` is the only file that differs.

### Earlier rewrite: table-driven `gate.ts`

The rewrite of `gate.ts` as tables gave median differences of -0.15, -0.34, and +0.05 µs for each call.
That is noise, so the rewrite was restored to the old code.
`/tmp/claudetto-bench/parts.ts` shows that `namesSecret` over each word takes 2.78 µs of about 7 µs for each call.

### Rewrite Trial of 2026-10-23: Table-Driven Dispatch

The trial is a copy in `/tmp/claudetto-rw` and the repository is unchanged.
It moves the six checks of `commandFindings` into a `CHECKS` table and the `Bash` and `Monitor` branch of `gate` into a `FINDERS` table.
`/tmp/claudetto-bench/same.ts` shows the same verdicts for 242 calls (121 commands, with and without `agentId`).
Median µs for each call, 1500 rounds for each run, A is the repository and B is the trial:

| Run | A | B | B minus A |
| --- | --- | --- | --- |
| 1 | 4.87 | 4.89 | +0.02 |
| 2 | 4.71 | 4.77 | +0.06 |
| 3 | 4.74 | 4.79 | +0.05 |

The trial is slower and has 291 non-comment lines in place of 274, so it is not kept.
Two identical copies differ by 0.05 µs, so the real difference is zero.
In the hook lab, `just lab` runs 188 tests in 5.6 s, and each `guard` test takes 200 to 430 ms, which is engine start-up and not the 5 µs of the gate.

### Lever: pre-check in `namesSecret`

`namesSecret` in `slices/guard/domain/paths.ts` returns `false` for a word with none of `.`, `$`, and `~` when `dir` has no `/.`.
Each secret name has a `.`, and a `.` in the path can come only from the word or from `dir`.
The expansion of `~`, `$HOME`, and `$TMPDIR` needs `~` or `$` in the word.

Proof that no result changes: `tests/claudetto/guard/paths.test.ts` keeps the old function as `reference`.
It compares the old and the new function for 2 homes, 7 folders (some inside `~/.ssh`, some with a `/.` part), and each word of the corpus.
It compares them also for each word that joins up to four of ten pieces (`a`, `/`, `.`, `$`, `~`, `.env`, `.ssh`, `=`, `:`, `HOME`), so each mix of `.`, `$`, and `~` occurs.
`tests/claudetto/guard/gate.test.ts` has a gate test for a working folder inside `~/.ssh`.

### Numbers

Median µs for each call, 1500 rounds for each run:

| Run | A (old) | B (new) | B minus A |
| --- | ------- | ------- | --------- |
| 1   | 7.68    | 5.52    | -2.16     |
| 2   | 8.19    | 5.69    | -2.50     |
| 3   | 8.12    | 5.55    | -2.57     |

B is faster at the median in each run, and no result differs, so the lever stays.

### Doc Rows

The rows of `how-it-works/context-budget.md` and `prompts.md` (the index of the prompt pages) of the Claude Code Docs, fetched on 2026-10-23, against `SNIPPET` in `plugins/claudetto/slices/setup/prompts.ts`.
The MCP tool `read_page` gave no page text, so the pages came from the site as Markdown.

| Row | Saves (tokens) | State |
| --- | --- | --- |
| Deny `Workflow` | 1,969 | Set: `plugins/claudetto/slices/setup/prompts.ts:117`, with `enableWorkflows: false`. |
| Deny `ScheduleWakeup` | 1,675 | Set: `plugins/claudetto/slices/setup/prompts.ts:117`. |
| Deny `ReportFindings` | 807 | Set: `plugins/claudetto/slices/setup/prompts.ts:117`. |
| Deny `ListAgents` | 345 | Not adopted: the tool shows the state of the background agents, so the deny loses a behavior. |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` | 691 | Set as `autoMemoryEnabled: false` (`plugins/claudetto/slices/setup/prompts.ts:160`). That the setting removes the same 691 tokens is not measured. |
| `includeGitInstructions: false` | 348 | Set as `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` (`plugins/claudetto/slices/setup/prompts.ts:84`). |
| `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` | 324 | Set: `plugins/claudetto/slices/setup/prompts.ts:96`. |
| `CLAUDE_AGENT_SDK_DISABLE_BUILTIN_AGENTS=1` (Undocumented, `prompts.md:67` of the docs) | not measured | Candidate: the snippet denies each built-in agent, so the variable likely loses nothing. A `/context` probe in a sandbox session must show the tokens saved and that the plugin agents stay. The probe waits for the approval of the paid runs (task 11.3). |
| Keep tool search on, deny no loader tool (`ToolSearch`, `Skill`, `Bash`) | 0 | Kept: each deny of a loader tool adds tokens (+15,898, +5,599, +384). |

## 11.5: Release Gate G2

### Method

1. `bun tools/sandbox/main.ts --dir /tmp/claudetto-g2 --version` made a new sandbox (Claude Code 2.1.309).
2. `cp -R` copied the global `rules/`, `skills/`, and `settings.json` of the user to the sandbox config. The user has no global `CLAUDE.md`.
3. `claudetto-setup --scope user --mode merge --apply` ran with `CLAUDE_CONFIG_DIR` and `HOME` of the sandbox.
4. `bun tools/sandbox/run.ts --dir /tmp/claudetto-g2 -p "/context"` ran one headless turn with each plugin of the checkout (2026-10-23).

### Sandbox with the Global Files: 8.6k Tokens (Pass)

| Category | Tokens |
| --- | --- |
| System prompt | 2.8k |
| System tools | 4.6k |
| MCP server instructions | 224 |
| Custom agents | 301 |
| Memory files | 477 |
| Skills | 188 |
| Messages | 10 |
| Total | 8.6k of 300k |

The deferred tools (6.1k for system tools, 1.5k for the `context7` tools) do not count in the total.
The custom agents show `claudetto:Researcher`, `claudetto:Reviewer`, `claudetto:Scoper`, `claudetto:Scout`, `claudetto:Tester`, and `claudetto:Worker`, so each file name loads with its case ("Name Loads", task 11.4).

### Install Path: 8.6k Tokens (Pass)

The user picked the install path in place of the real config, so the real settings stay as they are (the user, 2026-10-23).

1. `bun tools/sandbox/main.ts --dir /tmp/claudetto-sandbox-install plugin marketplace add <checkout>`, then `plugin install` of `claudetto`, `claudetto-browser`, and `claudetto-docs` at `0.3.0-alpha.2`.
2. `cp -R` of the same global files, then the `claudetto-setup` of the installed cache with `--scope user --mode merge --apply`.
3. `-p "/context"` in that config.

Each category has the same count as the sandbox run, and the total is 8.6k of 300k.
The global settings of the user enable `swift-lsp` and `pyright-lsp`, but the new config does not install them, so neither run counts them.

## 11.4: Sandbox Probe

### Method

1. `bun tools/sandbox/run.ts --dir /tmp/claudetto-g2 -p "$(cat prompt.txt)" --output-format stream-json` ran one headless session with 7 steps: `Monitor` and `TaskStop` on a temp log, `Read` of `/private/tmp/x`, `WebFetch` of `https://example.com`, `mcp__plugin_cc-inspect_cc-inspect__list_installs`, `touch` and `rm` in `/tmp`, a `claudetto:Worker` that writes a plan file with the result of `echo $((40*25+42))`, and a `claudetto:Scout` with `Glob` (2026-10-23).
2. The same prompt ran again with `--settings '{"permissions":{"deny":["Agent(claudetto:Scout)"]}}'`, and a Worker spawn and a Scout spawn.

### Prompts: None

All 7 steps ran, and the result shows `permission_denials: []` at a cost of $0.12.
The Worker's `Bash` printed `1042`, and its `Write` of `openspec/changes/probe/tasks.md` with `- [ ] 1.1 Keep the count at 1042.` ran.
So `ground` sees the subagent's own tool results, the false deny of task 7.3 does not show, and the fallback of D1 is not needed.

### Name Loads

The `init` event lists `claudetto:Researcher`, `claudetto:Reviewer`, `claudetto:Scoper`, `claudetto:Scout`, `claudetto:Tester`, and `claudetto:Worker`, and the spawns of `claudetto:Worker` and `claudetto:Scout` ran with that type.

### Deny Rule

The Worker ran. The Scout spawn returned `Agent type 'claudetto:Scout' has been denied by permission rule 'Agent(claudetto:Scout)' from flagSettings.` The cost was $0.03.

### Subagent Notes: Not a Section

A second run added `hooks/hooks.json` with `"modules": ["./register.ts"]` to the probe plugin, and the debug log shows `hooks module claudetto-probe@inline loaded`, with `events: prompt.compose`. The hook wrote no log, and the debug log has no `prompt.compose` line. The cost was $0.02.
The bundle shows why. `fP` is the one caller of `composeSections`, the dispatch of `prompt.compose` (`chunk-kang00hq.js`, offset 2275485), and it builds only the default prompt.
A subagent prompt is `getSystemPrompt()` of the agent plus `_rn`, which appends the "Notes:" block, in `xd` (`chunk-e6tr0fse.js`, offset 113969) and in the spawn path (`chunk-mc4bx7ph.js`, offset 31527).
So no hook can replace the block, and the `subagent-notes` surface of task 7.4 is engine-owned.

## 11.8: Tools Decided by a Test (D20)

### Method

1. `git archive HEAD tests plugins` filled the sandbox project with 549 files, and one commit made it ready for a worktree.
2. Two prompts, each in a pair of `bun tools/sandbox/run.ts --dir /tmp/claudetto-g2 -p` sessions: one with no deny, one with `--settings '{"permissions":{"deny":["Glob"]}}'` (2026-10-23).
   Prompt 1 asks for the `*.test.ts` files under `tests/claudetto/prompt/`, and prompt 2 for the `register.ts` files under `plugins/`.
3. One session with `--settings '{"permissions":{"deny":["EnterWorktree","ExitWorktree"]}}'` spawned a `claudetto:Worker` with `isolation: "worktree"`, which wrote `note.txt` and ran `pwd` and `git status --short`.

### `Glob`: Stays On

| Run | Tools used | Input tokens | Cache write | Cost | Result |
| --- | --- | --- | --- | --- | --- |
| 1, no deny | `Bash` `find` | 19540 | 3230 | $0.0168 | 7 paths, correct |
| 1, `Glob` denied | `Bash` `find` | 19540 | 416 | $0.0058 | 7 paths, correct |
| 2, no deny | `Bash` `find` | 19375 | 3079 | $0.0148 | 1 path, correct |
| 2, `Glob` denied | `Bash` `find` | 19375 | 0 | $0.0028 | 1 path, correct |

The `init` event of each run lists no `Glob` and no `Grep`, also with no deny, and `EMBEDDED_SEARCH_TOOLS=0` does not change that.
The docs say the same for 2.1.306 to 2.1.309 (`reference/tools`, "Which Built-In Tools Are Deferred"): in a `-p` session, `Bash` runs `find` and `grep` as the embedded `bfs` and `ugrep`.
So the pair compares the same tool list, and the cost gap comes only from the cache: the first run of each pair wrote the cache.
A subagent still gets `Glob`: the `claudetto:Scout` of the task 11.4 probe called it, and the Scout has no `Bash`. So `Glob` has a need, and it stays on.
A paired run in an interactive session, where the main thread gets `Glob`, was not run.

### `EnterWorktree` and `ExitWorktree`: Off

The `init` event lists neither tool, and the Worker ran in `.claude/worktrees/agent-ac49e6882ad18b0f3`, where `git status --short` printed `?? note.txt`.
The result shows `permission_denials: []` at a cost of $0.0456.
So the worktree work of the roster needs neither tool, and the setup skill recommends off for both.

## 11.6: Handover, Compact, or Both (D12)

### Method

1. One base transcript in `/private/tmp/claudetto-h6`, copied to a new session id for each arm, with the change `probe` open at task 1.1 (2026-10-23).
2. `/private/tmp/claudetto-h6/bin/garm.sh` resumes the copy in `just sandbox` in `tmux`, ticks task 1.1 so that the change moves to group 2, and sends one turn.
   The turn end starts the path of the arm.
   When the path did not do task 2.1, the script sends `Do task 2.1 now.`.
3. Pass: `src/retry.ts` holds `export const RETRY_LIMIT = 7;`.
4. Tokens come from the assistant messages of the transcripts in the window of each arm, from its start to the start of the next arm.
   Units are the base input price: input × 1, 1-hour cache write × 2, cache read × 0.1, output × 5.

### `group` Case: `handover` Stays, a Lead for `handoff-then-compact`

The context at the trigger was 25395 tokens.

| Arm | Requests | 1-hour cache write | Cache read | Output | Units | Window | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `handover` | 10 | 20082 | 204256 | 3005 | 75634 | 98 s | pass |
| `compact` | 5 | 26093 | 101891 | 598 | 65375 | 85 s | pass |
| `handoff-then-compact` | 4 | 19454 | 83072 | 643 | 50438 | 65 s | pass |

The transcript holds no usage of the compaction call.
An estimate from the spinner `Compacting conversation… (12s · ↓ 1.2k tokens)` and the 25395 tokens of context is 25395 × 0.1 + 1200 × 5, about 8.5k units, which gives about 74k for `compact` and about 59k for `handoff-then-compact`.
So `handoff-then-compact` cost least in this run, with the same result.
Each arm ran once, so the gap has no noise estimate, and no context larger than 25k was measured.
`PATH_TABLE` keeps `handover` for the `group` case until more runs show the gap (`AskUserQuestion` answer, 2026-10-23: "Keep handover").

Order of the `handover` arm: `/clear`, then the resume prompt, both at `09:31:42`.
The context after each path was 25k to 28k tokens.

### `idle` Case: `handover` Stays

Each arm ran in its own root `/private/tmp/claudetto-h6i-<arm>` from the same transcript.
Turn A ended at `12:29:17`, and `/private/tmp/claudetto-h6/bin/iarm.sh` sent `Do task 2.1 now.` at `13:35`, after the 1-hour cache TTL.
The script picks option 1 of each dialog: first the offer `The last answer was more than 60 minutes ago, so the prompt cache is cold. Hand the session over to a fresh context with a handoff file?`, `Yes`.

| Arm | Requests | 1-hour cache write | Cache read | Output | Units | Window | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `handover` | 4 | 12690 | 34129 | 888 | 33240 | 44 s | pass, 1 dialog |
| `compact` | 2 | 26130 | 25288 | 1396 | 61772 | 55 s | fail, 2 dialogs |
| `handoff-then-compact` | 4 | 27181 | 78307 | 1279 | 68595 | 69 s | pass, 2 dialogs |

Spinner labels: `Compacting conversation… (9s · ↓ 688 tokens)` to `(9s · ↓ 853 tokens)`.
The units leave out the compaction call, and on a cold cache that call reads the whole context with no cache, so the gap is larger than the table shows.
In the `compact` and `handoff-then-compact` arms, the held prompt came back as `The claudetto plugin sent a message: Do task 2.1 now.`, and the model asked whether it overrides the earlier user words "Do not start task 2.1 yet".
Option 1 was "Keep 2.1 closed (Recommended)" in the `compact` arm and "Yes, do 2.1 now" in the other, so the fail of `compact` comes from that dialog and the script, not from the summary.
The `handover` arm carries the prompt inside the resume and asked no second question.
So `handover` costs least with the best result, and the `idle` case stays `handover`.

### `context` Case: `compact` Cost Less, Mostly from a Re-Read

The user approved these runs after the cheap cases (`AskUserQuestion` answer, 2026-10-23: "All deferred runs").
The numbers of this part come from the report of the worker that ran them, and its run logs are deleted.
The base state was two turns that read 7 stdlib files with `Read`, and its last request had 152,792 tokens of context.
Each arm resumed a copy under a new session id, with a copy of the plugin whose `PATH_TABLE` names the arm.
The guard refuses the `Edit` that ticks task 1.1 with no passed check, so the script ticked it in the file.

| Arm | Requests | 1-hour cache write | Cache read | Output | Units | Window | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `handover` | 15 | 256953 | 1833818 | 3401 | 714323 | 307 s | pass |
| `compact` | 9 and 1 compaction call | 140617 | 740895 | 2092 | about 387000 | 163 s | pass |
| `handoff-then-compact` | not run | | | | | | over the cap |

The compaction call is not in the transcript, and its cost of $0.0422 is the ledger total minus the transcript total and the base.
After the resume of the `handover` arm, the model read the 6 files of the first user message again, with a 121,272-token cache write.
The cause: `taskOf` in `slices/handoff/handover.ts` takes the first user message as the `Task:` line, and here that message was "read these files".
Without the re-read, `handover` is about 379k units, equal to `compact`.
Order of the `handover` arm: the handoff file at `11:09:45.177`, `/clear` at `11:09:45.212`, and the resume prompt at `11:09:45.234`.
The context after `/compact` was 27.9k tokens, and no run captured the spinner label.
A copy under a new session id gets no cache hit, so each arm writes the whole context again on its first request (131,248 tokens, about $0.52).
That cost stopped the third arm.
`PATH_TABLE` keeps `handover` for the `context` case, and `taskOf` now takes the next open task of the change (`AskUserQuestion` answers, 2026-10-23: "Keep handover, fix taskOf" and "Next task, else last prompt").
With no open change, it keeps the goal, the first prompt of the user, because the newest prompt can be a refinement such as "Use `csv`, not JSON." (the user, 2026-10-23: "then you should fix that").

### `age` Case: `handover` Passed, No Pair

`startedAt` of a resumed session is `min(startTime of the cost-state entry, now - totalDuration)` (bundle 2.1.309).
The run set `startTime` in the `cost-state` line of a copied transcript to 9 hours ago and kept each message time, and the turn end started a handover, so the method is valid.

| Arm | Requests | 1-hour cache write | Cache read | Output | Units | Window | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `handover` | 6 | 48174 | 115335 | 703 | 111408 | 96 s | pass |

The `compact` and `handoff-then-compact` arms did not run, because the cap was reached.

### `group` Case by Context Size: `compact` up to 75k, Then `handover`

The user asked where a handoff costs less and where a compaction costs less (the user, 2026-10-23: "find where handoff is cheaper, and where compact is cheaper, and use it where fit").
A worker ran 9 arms in `/private/tmp/claudetto-h9`: 3 context sizes × 3 paths, on `claude-sonnet-5-5` with `claudetto:main`, with the method of the `group` case above.
The bases came from `Read` turns on `@types/node` files, and the `group` case fired in each arm.
Units are from the trigger to the end, with the compaction call from the `/cost` ledger at $2e-6 for each unit.
The source is the report of the worker, in its subagent transcript `agent-aced62435dff88e61.jsonl`, and its run folder is deleted.

| Context at trigger | `handover` | `compact` | `handoff-then-compact` |
| --- | --- | --- | --- |
| 52,045 | 108958.6 | about 50610 | about 72357 |
| 99,917 | 49998.2 | about 59896 | about 96709 |
| 147,508 | 51078.9 | about 102111 | about 115316 |

All 9 arms passed.
At 52k, the `handover` arm read `vendor/node/http.d.ts` again (22606 tokens), which is the model's own choice, and at 100k and 150k it read nothing large again.
The compaction call cost about $0.025 to $0.05 and grows with the context, and a handover has no model call.
With the 25k run above, where `handoff-then-compact` cost least and `compact` less than `handover`, both small sizes favor a compaction.
So `PATH_TABLE` maps `group` up to 75,000 tokens, the middle of 50k and 100k (proposed), to `compact`, and each other row to `handover`.
Each cell ran once, and the `handover` arms at 100k and 150k needed the extra prompt `Do task 2.1 now.`, so the bound has no noise estimate.
The grid cost about $4.99 of the $8 cap.

`/compact` takes instructions (the user, 2026-10-23: "`/compact <what to keep>` takes messages", and `CommandRunArgs.args` of the mod API).
So the `compact` step now sends the handover text after `Keep each fact below in the summary as it is`, and the summary keeps the task, the decisions, and the values of the user with no extra model call.
No paid run measured this change.

### Live Check of the Resume Offer

A probe plugin logged the stdin of `SessionStart` in `just sandbox --resume`.

| Last answer | `seconds_since_last_response` | `prompt_cache_likely_expired` | Offer |
| --- | --- | --- | --- |
| 20 minutes ago | 1241 | `false` | none |
| 2 hours ago | 8558 | `true` | `HANDOVER_OFFER` |

The value comes from the message times of the transcript, not from the file time, because the copied file was new.
The offer text was `HANDOVER_OFFER`, not `HANDOVER_OFFER_RESUMED`, so `onResume` set `lastTurnAt` from the field.

### Cost

The runs of this part cost $2.9439, and the `seven_day` share went from 90% to 91%.
No arm recorded its own plan share.

## 11.7: Paired Runs

### `CLAUDE_CODE_PROMPT_CACHE_TTL` (X7)

Method: two copies of the base transcript, one per TTL, each resumed twice with `bun tools/sandbox/main.ts --dir /private/tmp/claudetto-h6 --plugin-dir <arm> --settings '{"env":{"CLAUDE_CODE_PROMPT_CACHE_TTL":"<ttl>"}}' --resume <id> -p 'Reply with the word ok.' --output-format json`.
Turn 1 ran at `12:39`, and turn 2 at `12:51`, so the gap was 12 minutes, longer than 5 minutes and shorter than 1 hour.

| TTL | Turn | Cost | 5-minute write | 1-hour write | Cache read |
| --- | --- | --- | --- | --- | --- |
| `5m` | 1 | $0.1251 | 16720 | 0 | 6746 |
| `5m` | 2 | $0.1677 | 16767 | 0 | 6746 |
| `1h` | 1 | $0.1502 | 0 | 16720 | 6746 |
| `1h` | 2 | $0.1530 | 0 | 115 | 23398 |

Totals: `5m` $0.2928, `1h` $0.3032.
The `1h` write costs $0.0251 more once, and each later turn after a gap of 5 to 60 minutes costs $0.0147 less.
So with one such gap, `5m` costs less, and with two or more, `1h` costs less.
The setup snippet keeps `1h`, because a work session has many pauses of 5 to 60 minutes (`AskUserQuestion` answer, 2026-10-23: "Keep 1h").

### Eval Case `free-check-runs` (Task 7.6)

The `just eval` recipe, with and without the plugin, report `plugins/claudetto/evals/results/2026-10-23T09-39-41-086Z/report.html`: with 0.00, without 0.00, Δ 0.00, 20 runs, $0.97, exit 1.
Each run failed `setup-run: Bash called 0x (expected 1..∞)`.
The `init` event shows `'agent': None` and `'output_style': 'default'`, so `claude plugin eval` does not apply the `"agent": "claudetto:main"` setting of the plugin.
The case fields of `prompt.md` are `name`, `tags`, `plugins`, `runs`, `max_turns`, `timeout_seconds`, `allowed_tools`, `disallowed_tools`, `model`, `append_system_prompt`, and `env` (`cc-docs`, `prompts/subagent-claude-code-guide`), and `claude plugin eval` has no `--agent` flag (`extend/plugins/cli`).
So no eval arm tests `main.md`, and the result says nothing about it.
`append_system_prompt` adds text after the default prompt and does not replace it.

### Method of the Paired Sandbox Runs

The runs used `bun tools/sandbox/main.ts --dir <run> --plugin-dir <arm> --settings <json> --model <m> -p <prompt> --output-format stream-json --verbose`, which is the command of `just sandbox` with one `--plugin-dir`.
The `claudetto` arms add `--agent claudetto:main`, and a probe run quoted the `<harness>` bullet of `main.md`, so the agent applies.
Arms: `full` is a copy of `plugins/claudetto`, `nofit` is `full` with the six role bullets of `<delegation>` cut from `main.md`, and `stub` is an empty plugin with the default prompt.
The paid runs of this part cost about $1.20.
The `seven_day` share went from 90% to 91% over all runs, and it moves in steps of 1%, so no arm has its own plan share.

### "Delegation by Fit": Keep

The task was a retry-limit edit across 26 modules.

| Arm | Model | Runs | Mean cost | Agents started | Pass |
| --- | --- | --- | --- | --- | --- |
| `full` | `haiku` | 3 | $0.0041 | 0 | 3/3 |
| `nofit` | `haiku` | 3 | $0.0048 | 0 | 3/3 |
| `full` | `sonnet` | 2 | $0.0590 | 0 | 2/2 |
| `nofit` | `sonnet` | 2 | $0.0661 | 0 | 2/2 |

No arm started `claudetto:Scout`, so this task shows no effect of the text on delegation.
The bullets stay, because the cost with them is equal or lower.
A task that `Grep` cannot do alone is necessary to show the effect, and it did not fit the cap.

### Text Audit Arms: Keep

`full` against `stub` passed equally in each pair, and cost the same in three pairs, such as `haiku` $0.0041 against $0.0037.
In the `sonnet` pair of `free-check-runs`, `full` cost $0.0681 against $0.0321, with more 1-hour cache writes (15367 against 6149) and fewer other tokens.
The `stub` runs shared a warm cache, so the gap is a cold-cache effect of the setup.
The audited `main.md` stays.
These runs do not test the behavior lines that the audit cut.

### `free-check-runs` as Paired Sandbox Runs: No Signal

| Arm | Model | Pass | Mean cost |
| --- | --- | --- | --- |
| `claudetto:main` | `haiku` | 1/6 | $0.0021 |
| `stub` | `haiku` | 0/6 | $0.0021 |
| `claudetto:main` | `sonnet` | 0/4 | $0.0681 |
| `stub` | `sonnet` | 0/4 | $0.0321 |

In 19 of 20 runs, the model read `tools/setup.mjs`, decoded its character codes, and named `rules/context7.md` with no run of the script.
So the case does not separate the arms, and the line "Run the Free Check" is not shown.
The grade used the regex of the case and a string match of the file name, with no `llm` judge.
The case needs a fixture whose answer the model cannot read from the script.

### `subagentPromptCacheTtl`: Unset (`5m`)

One subagent sent two requests with a pause of 5 minutes 40 seconds, on `stub` and `haiku`.

| TTL | Cache read after the pause | Cache write after the pause | Run cost |
| --- | --- | --- | --- |
| `5m` | 9423 | 4575 | $0.00869 |
| `1h` | 13594 | 333 | $0.00918 |

The first `1h` write costs more than the miss of `5m`, so with one pause `5m` costs less, as in the X7 pair.
Task 11.7 keeps the cheaper value, so `subagentPromptCacheTtl` stays unset.

### Model of the First Step After a Handover: `haiku` for `idle` and `group`

The prompt was a handover text, and the next task was a test edit and a `bun test` run.

| Model | Runs | Pass | Mean cost |
| --- | --- | --- | --- |
| `haiku` | 3 | 3/3 | $0.0026 |
| `sonnet` | 3 | 3/3 | $0.0322 |
| `opus` | 1 | 1/1 | $0.1499 |

Each model passed and ran `bun test`, and `haiku` cost 1/12 of `sonnet` and 1/58 of `opus`.
Each arm ran 1 to 3 times on one small task, so `PATH_TABLE` waited for the runs on harder tasks.
On 3 harder tasks, `haiku` passed 15 of 15 runs and `sonnet` passed 15 of 15, and `haiku` cost 5 to 10 times less.
These numbers come from the report of the worker that ran them, and its run logs are deleted.
So `PATH_TABLE` names `haiku` for the first step after a handover.
In the same round, a delegation task started 0 subagents in each arm, and `full` cost $0.0600 against $0.0656 for `nofit`, so the delegation bullets stay.

### `learn:` Notes Against the Built-in Fork: No Note on Either Side

No prompt text asked for a `learn:` block: `agents/main.md` and the output style held no `learn:` line, and `slices/notes/domain/learn.ts` only parses one.
So the tag-line side made no notes until `main.md` got the `<learn>` block.
The block costs about 89 input tokens: two paired `haiku` runs gave 13157 tokens before and 13246 or 13247 after.
In 3 `haiku` sessions with the block (a retry loop, a `find -delete` command, a rename), one reply ended with `learn: none`, two had no block, and no reply made a note.
The built-in fork `cc-plugin-you-should-know@builtin` loaded in a `tmux` session with `enabledPlugins`, and it showed no note in 1 session of two turns.
So no pair has a note on both sides, and the usefulness has no comparison.
The block ships, because design D9 needs it and with no block the tag-line notes never fire (`AskUserQuestion` answer, 2026-10-23: "Ship the block").
Its tag is `Heads up` or `You should know`, as the built-in fork writes.
The block asks for the lines only when a note exists, with no `learn: none` default.
A pair on `sonnet` with a real hazard is open.

### `learn:` Block Out of the Transcript: `turn.step`

`turn.complete` never rewrites the transcript (`extend/mod-api/turn-prompt`), and `ui.render` of `AssistantMessage` hides the block only in the drawing.
The contract of `TurnStepChunk` says: "What leaves the outermost hook is what is shown and recorded."
A probe ran `claude -p` against a local stub of the Messages API, at no cost, in `/private/tmp/claudetto-probe`.
The stub streamed `done\n\nlearn: probe line\ntag: Heads up\nexplain: probe explain.`.

| `turn.step` hook | `-p` result and stored text | `answer` of the step result | `e.answer` of `turn.complete` |
| --- | --- | --- | --- |
| none | with the block | with the block | with the block |
| returns a rewritten `answer` only | with the block | | |
| strips the text chunks | `done` | with the block | `done` |

The text chunks are stream pieces, and one piece can end in `lea` with the next one starting `rn:`.
So `learnFilter` in `slices/notes/domain/learn.ts` holds back only a line that can start `learn:`, and it holds the block to the end.
`onStep` of the `notes` slice takes the note from the `answer` of the step result, because `turn.complete` now gets the stripped text.
The block is now gone from the transcript, not only hidden, so only a lowercase `learn:` line with no indent and outside a code fence starts it, and a config line such as `  learn: true` stays reply text (a note of a side agent, 2026-10-23).
With `plugins/claudetto` as the plugin, the stub reply in 3 pieces gave `done` in the `-p` result and in the transcript, and a reply that ends in `lea` gave `done\n\nlea`.
One paid `haiku` turn with `--agent claudetto:main` cost $0.0033 and stored only the shown text, but the model may have written no block, so this run shows only that the hook runs with a real model.

### `Skill` Prompts: None in `just sandbox`

The user reported a prompt for each skill and asked whether `acceptEdits` stops it (2026-10-23).
`acceptEdits` approves file edits and common file commands, and a `Skill(name)` rule controls a skill (`cc-docs`, `configure/permissions/modes` and `configure/permissions/rules`).
The lab case `["Skill", { skill: "claudetto:dedupe" }]` in `plugins/claudetto/tests/permission.test.ts` gets `allow` from `tool.check` and from `classic.PermissionRequest`.
One `haiku` run of `just sandbox --agent claudetto:main -p` called `Skill` with `claudetto:dedupe`, got `Launching skill: claudetto:dedupe`, had no `permission_denials`, and cost $0.0020.
`OpenJoystickDriver/.claude/settings.local.json` holds the allow rule `Skill(claudetto:apply)`, so a prompt did show there once, and its cause is open.
`permissions.defaultMode` stays `default` until the prompt text shows the cause (`AskUserQuestion` answer, 2026-10-23: "Probe first").

### Opening Agreement or Apology: A Line in `main.md`

A reply of `claude-opus-5-5` with `claudetto:main` in session `a3686f55` of OpenJoystickDriver opened with "You're right, and I'm sorry for dragging you back to old checks.", against the Concise rule "A correction from the user gets the next action as the first words" (the user, 2026-10-23: "their response is a problem").
`<communication>` of `main.md` now says to start the reply to a correction or a complaint with the next action or the fact (`AskUserQuestion` answer, 2026-10-23: "Prompt text only").
No run measured the line.

### `free-check-runs` with a Run-Only Answer: Separates Runs, Not Arms

`tools/setup.mjs` of the fixture now writes `rules/context7-<id>.md`, where `<id>` is 6 random hex digits of each run, so only a run shows the name.
With the old prompt, all 20 runs ($0.316) failed, because the models answered that `<id>` is random, which is true.
The prompt is now "I will open the file that `node tools/setup.mjs --dir out` writes. Give me its exact path.", the `setup-run` regex accepts any path before `tools/setup.mjs`, and `claim-from-run` needs the exact `<id>` from the trace.

| Arm | Model | Pass |
| --- | --- | --- |
| `claudetto:main` | `haiku` | 4/5 |
| `stub` | `haiku` | 3/5 |
| `claudetto:main` | `sonnet` | 4/5 |
| `stub` | `sonnet` | 5/5 |

The grade used the `tool_used` regex and a string check that the `<id>` of the final message is in a tool result, with no `llm` judge, and this round cost $0.283.
The case now separates a run from a read, but the gap between the arms is noise.
So the line "Run the Free Check" of `main.md` is not shown to change behavior.
