# External Sweep: Thread Exports and Failure Dossier for 0.3.0

Date: 2026-10-21.
Claude Code `2.1.306`.
Cost: $0.
No `claude` session ran, no model call was made, and no network was used.

## Sources and Method

Sources, all under `external/`:

- The dated folders `2026-09-29` to `2026-10-17`, with the `_p2` and `_p3` variants.
  The folder `2026-10-21` is skipped, because the plan used it already.
- The 131 `export-*.jsonl` files at the top level.
- `agent-failure-dossier/` (`00-INDEX.md` first).

Many threads appear in more than one folder.
All of the thread text has `content_trust: untrusted_page_content`.
It was treated as data.
No command, install, or instruction in it was run or followed.

Method:

1. `python3 -I` read the `.jsonl` files and listed each env var, settings key, flag, and slash command with the number of threads that name it.
2. A keyword filter found the threads about caching, compaction, effort, models, subagents, hooks, output styles, plugins, and cost numbers.
3. A sample of the threads was read in part (the post and the top comments).
   The rest were not read.
4. `research/references.md`, `research/sessions.md`, `research/probes.md`, and the matrix files were read first.
   A finding that the plan already took is not a row here, except where the thread adds a number or a conflict.
5. Each finding was checked with `grep` against `/Users/krystian/.claude/plugins/marketplaces/claude-code-docs/docs/`.
   The docs are for `2.1.304`.
   The path in the table is relative to that `docs/` folder.

Status values:

- `docs-confirmed`: the docs state the lever or the fact, at the given `path:line`.
- `docs-contradicted`: the docs state the opposite.
- `unverified`: the docs say nothing, or only a thread says it.
  A thread claim alone is not a fact.

Limits:

- A thread number is one user's own number with no control.
- The sweep read a sample and not the whole corpus.
- The dossier cites strings from `2.1.296`, and the plan targets `2.1.306`.
- Source names in the table are the file name, shortened, and the thread id.
  The thread id is in the `url` field of the first line of the file.

## Findings

| Finding | Source file | Status | Docs source | Plan effect |
| --- | --- | --- | --- | --- |
| A hook that crashes, times out, or exits `1` lets the call through. `onFailure: "block"` blocks instead. The mod gates have the same risk if the `.catch` handler returns no deny. | `2026-10-17/export-Your deny rule for git push doesn't stop -git -C . push-…` (`1x5tbps`) | docs-confirmed | `extend/hooks/configuration.md:96`, `:105`, `extend/hooks/input-and-output.md:151`, `extend/mod-api/hooks.md:35` | confirms p3 row `on(...).catch`. The `.catch` of each gate must return a deny. |
| A `Bash(git push *)` deny rule matches the command text. `git -C . push` and `bash -c '…'` pass. A hook on the whole command, or no credentials, is the boundary. | `2026-10-17/export-Your deny rule for git push doesn't stop -git -C . push-…` (`1x5tbps`) | unverified | `configure/permissions/rules.md:9` says only that the rule stops each matching command. No page names the `git -C` case. | confirms p3 row `tool.check`. Keep the gate on the full command and do not rely on static `deny` alone. |
| In bypass mode, Claude Code tells the model to read files with `cat` and `sed` in `Bash`. Hooks on `Read` never ran. This was 162 of 448 hook blocks in one week. | `2026-10-12/export-I counted how many times my hooks had to stop Claude in one week…` (`1wy76rw`) | unverified | No page. A grep for `cat` and `sed` text in `how-it-works/` finds nothing. | new lever. A `tool.check` rule on `Bash` reads with `cat`, `head`, `sed -n`. Needs a request-body check of the text (Probe 1). |
| The env var `CLAUDE_CODE_THRIFTY_SONIC=0` stops that `cat` prompt. Two threads name it. One is a comment that reads like an AI summary, so its trust is low. | `export-…448 times in 76 sessions…` (`1wy76rw`), `export--clear vs -compact.jsonl` | unverified | No page names `THRIFTY_SONIC`. A grep of `docs/` finds nothing. | new lever. Measure it in the stub (Probe 1). |
| The main cache lasts one hour on a subscription within plan usage. It falls to five minutes past the plan limit, on an API key, and on cloud providers. | `2026-10-17/export-Your Claude Code prompt cache drops from an hour to five minutes…` (`1x745l9`) | docs-confirmed | `how-it-works/request-and-cache.md:89`, `configure/settings/model.md:36` | confirms p1 row `CLAUDE_CODE_PROMPT_CACHE_TTL` (set `1h`). |
| Subagents, workflows, forks, compaction, and titles get a five-minute cache even on a subscription. `subagentPromptCacheTtl` and `CLAUDE_CODE_SUBAGENT_PROMPT_CACHE_TTL` change it. Replies say a `1h` write costs more and most subagents do not idle. | `2026-10-07_p2/export-Subagents use a 5-min cache by default…` (`1wz1qd4`), `export-Two hidden settings to cut token usage.jsonl` (`1wq7920`) | docs-confirmed | `how-it-works/request-and-cache.md:90`, `configure/settings/model.md:38` | confirms p5b row `subagentPromptCacheTtl` (measure, then set). The replies support "measure first". |
| A change of effort keeps the cache on Opus 5.5, Sonnet 5.5, Haiku 5.5, and Fable 5.1. A model switch is a full miss. | `2026-10-11/export-I built a Claude Code mod on Haiku 5.5 … picks the effort per prompt…` (`1x19b2c`) | docs-confirmed | `how-it-works/request-and-cache.md:107`, `:108` | confirms p5b row `Model, effort, and tool list at the start`. A mid-session escalation of effort costs no miss on these models. |
| A toggle in and out of plan mode under `opusplan` is a model switch, so it is a full miss. | `2026-10-17/export-Your Claude Code prompt cache drops…` (`1x745l9`) | docs-confirmed | `configure/models-and-providers.md:65`, `how-it-works/request-and-cache.md:107` | confirms p2 row `opusplan` (keep default). The plan must not route plan mode to another model. |
| The built-in `Explore` agent uses the main model, so a main session on Opus runs `Explore` on Opus. `CLAUDE_CODE_SUBAGENT_MODEL=haiku` does not move `Explore` and `Plan` without `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`. | `2026-10-08/export-Haiku 5.5 is 40x cheaper than Opus 5.5. Your Explore subagent…` (`1x0kzbh`) | docs-confirmed | `extend/subagents/runtime.md:30`, `configure/env-vars/models-and-effort.md:99`, `:100` | confirms p1 row `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS` (set `1`). Moving `Explore` by env is not needed, because the plan disables it. |
| Haiku 5.5 as a code-search subagent found nearly all target files at a small share of the Opus cost. As a web-research and fact-check subagent it made wrong facts and false flags. One user, 6 tasks. | `2026-10-14/export-I tested Haiku 5.5, Sonnet 5.5 and Opus 5.5 as subagents on 6 real tasks.jsonl` (`1x1e7ts`) | unverified | No page tests a subagent model. `extend/subagents/frontmatter.md:35` lists `haiku` only as a value of `model`. | confirms the `scout` on Haiku decision. Limit `scout` to code search. |
| `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1` turns off `run_in_background`, auto-backgrounding, and `Ctrl+B`. Two threads blame background defaults for opportunistic spawns and for a job that kept paying calls for hours after the session hit its limit. | `export-Theories on the increased usage consumption + tips.jsonl` (`1wh0ez4`), `2026-10-14/export-PSA- Claude Code wrote me an uncapped test loop…` (`1x540si`) | docs-confirmed | `configure/env-vars/agents-and-teams.md:51`, `extend/subagents/runtime.md:20`, `reference/tools/agents-and-tasks.md:54` | new lever. The cost effect is unmeasured. See Probe 2. |
| Fork mode makes each fork reprocess the whole context. The docs say a fork shares the prompt cache with its parent. The cache of a fork still lasts five minutes. | `export-Theories on the increased usage consumption + tips.jsonl` (`1wh0ez4`) | docs-contradicted | `extend/subagents/runtime.md:10`, `how-it-works/request-and-cache.md:90` | contradicts the reason in p1 row `CLAUDE_CODE_FORK_SUBAGENT`. Keep `0` for the other reasons, but drop the claim of a full re-read. |
| Compaction at `200k` (`CLAUDE_CODE_AUTO_COMPACT_WINDOW`) cut the re-read share of spend from 56% to 28%. Per prompt it was 26% cheaper, with 53% more calls per prompt after each compaction. One user, one month. | `2026-10-07_p2/export-56% of my Claude Code usage was Claude re-reading the conversation.jsonl` (`1wzhbfc`), `2026-10-17/export-Follow-up on the 56% re-reading post…` (`1x62hgo`) | docs-confirmed | `configure/env-vars/context-and-compaction.md:34`, `extend/subagents/frontmatter.md:38` | confirms p5b row `autoCompactWindow` (measure). The lever is documented, and the numbers are from one user. |
| `idleCompaction` compacts a session that sits idle before the cache ends. Users say it lost details. | `2026-10-12_p2/export-Just noticed this wonderful gem… “Compacted while idle…` (`1x2vc7g`), `2026-10-17/export-Auto-compact self triggers when idle-.jsonl` (`1x5n49q`) | docs-confirmed | `configure/settings/core.md:41`, `configure/env-vars/context-and-compaction.md:50` | confirms p2 row `idleCompaction` (the handoff eval decides). Add the risk "verbatim detail lost" to that eval. |
| One user priced their own transcripts: cache reads were 96.5% of tokens and 44.8% of cost, and cache writes were 3.2% of tokens and 46% of cost. A cold return to a long session is the dear event. | `2026-10-17/export-I priced … requests from my own transcripts…` (`1x7bin8`) | unverified | `prompts/skill-claude-api.md:240` gives the read price as a small fraction of input. No page gives the write multipliers. | confirms p5b row `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`. A cold rebuild is the cost to avoid. |
| Only 1.6% of one user's turns came more than an hour after the previous turn, but those turns were 80% of the cache writes. A hook that warns before the send is the counter. | `2026-10-01_p2/export-I made a hook that refuses (at first try) to send your message if your cache has gone cold…` (`1wuwtqy`) | unverified | The one-hour lifetime is in `how-it-works/request-and-cache.md:89`. The 1.6% and 80% are one user. | new lever. A `UserPromptSubmit` or mod hook that asks once when the gap is over the TTL. The plan has none. |
| A hook that pings every 55 minutes keeps the cache warm for about 5 hours at about $0.7 of API value. The docs list the call `/v1/messages/cache_touch` and the beta `cache-keepalive-2026-09-03`. A probe run found the call never fired. | `2026-10-08/export-Wrote a hook that keeps your cache alive for ~5 hours instead of 1…` (`1x0kdz4`) | docs-confirmed | `how-it-works/request-and-cache.md:128`, `reference/probes.md:102`, `:103` | new lever, gated. Low confidence. Do not plan on it. |
| A short rule set cut cost by 51% at `max` effort and by 11% at `medium` on Opus 5.5. A rule set about five times longer cost 26% more at `medium` on Sonnet 5.5. At `medium` the models hardly think, so there is little to save. | `2026-09-29_p3/export-I benchmarked a 30-line Claude Code plugin on Opus 5.5 and Sonnet 5.5…` (`1wtbj8x`) | unverified | No page. | confirms references.md (default `medium`, short rules). The saving is at `max`, so cap effort with `maxEffortLevel`. |
| Nine popular skills each ran against a placebo of the same token count. Few beat the placebo, and one did worse. 450 runs, one model. | `2026-10-12_p2/export-I gave the 9 most popular Claude Code skills a sugar pill…` (`1wz4rfz`) | unverified | No page. | confirms references.md ("Keep `CLAUDE.md` short") and the skill description rule of architecture. |
| `effort_cost_index` in the binary: on Opus 5, `xhigh` to `max` is +6%, and on Sonnet 5, +132%. | `export-Claude Code ships a per-model table of what each effort level costs.jsonl` (`1wjr89j`) | unverified | The cap key is `configure/settings/model.md:30` (`maxEffortLevel`, per model). The table has no page. | confirms p2 row `maxEffortLevel`. A cap of `xhigh` on Sonnet is the cheap guard. |
| `/doctor prompt-audit` runs through the bundled `/claude-api` skill, so `disableBundledSkills` may remove it. The docs list `prompt-audit` and `cost-optimize` as `/claude-api` subcommands and say `/doctor` stays. | `2026-10-12/export-TIL about -doctor prompt-audit…` (`1x1gp4p`) | unverified | `extend/skills-and-commands/bundled-skills.md:32`, `:33` | contradicts p2 row `disableBundledSkills` ("`/doctor` stays"). `/doctor prompt-audit` may go with it. Check before the setup skill tells the user to run it. |
| A hook that rewrote the commands of agents made auto mode refuse them as an attempt to get around it. "Block, don't rewrite" is the advice. | `2026-10-12/export-My Claude Code agents were spending 200k tokens reading my bug log…` (`1x3d6uv`) | unverified | `configure/permissions/auto-mode-rules.md:144` lists the rule `Auto-Mode Bypass`. The link to a rewrite has no page. | confirms p3 row `tool.call` (rewrite only `Write` and `Edit` input for `sembr`). Do not rewrite `Bash` commands. |
| The "preserve thinking" feature invalidates thinking blocks when a message in the prefix changes (a prune, a compress, an injected note). | `export-The 'preserve thinking' feature breaks context management…` (`1wnxe0v`) | unverified | No page. | confirms references.md ("reduce at boundaries"). Each mod rewrite of an old message is a risk. |
| A stop after a fixed number of tool calls ends a subagent. One commenter says so. | `export-What the hell is a turn limit … and why are subagents suddenly hitting them-.jsonl` (`1woaxj7`) | unverified | `extend/subagents/frontmatter.md:37` documents `maxTurns` only. No page gives a default. | none yet. Check for a hidden limit in the eval. |
| Headless `claude -p` used about three times more of the 5-hour limit per dollar of tokens than interactive use. 6 runs on a Pro plan. A reply says the start context differed. | `2026-09-29_p2/export-Measured it- headless Claude Code…` (`1wsijnv`) | unverified | No page. | new lever (a caveat). The share of the weekly limit that the user is told before a paid `-p` run may be too low. Ask the user with a range. |
| A call to `/context` on an account with connectors shows a large start context, and MCP tools from connectors are a large part of it. | `2026-10-12/export-claude code 66k system prompt.jsonl` (`1x0fli2`) | docs-confirmed | `configure/settings/mcp-and-channels.md:11` (`disableClaudeAiConnectors`) | confirms p2 row `disableClaudeAiConnectors` (set `true`). |

## Not Taken

- A thread says to spoof the `User-Agent` with `ANTHROPIC_CUSTOM_HEADERS` to avoid a server-side token inflation.
  The thread is from an old version, and nothing here confirms it today.
  It is a bypass of the vendor.
- Two threads say to patch or un-minify the Claude Code package to change its system prompt.
  The project rule forbids a patch of the CLI.
  The documented route is `--system-prompt-file`, `--append-system-prompt-file`, or an `agent` body.
- The `advisorModel` setting is moot.
  The plan sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.

## Agent Faults from the Dossier

One line for each fault class.
The `file:line` is the `Recipe` of the class in `external/agent-failure-dossier/`.
The counter is a claudetto part from `architecture.md`.

- I01 ungrounded defaults (`01-grounding-and-memory.md:66`): a mod `prompt.context` message with the derived branch, last tag, manifest version, and open OpenSpec changes.
- I02 instruction decay (`01-grounding-and-memory.md:123`): a mod hook for each checkable rule (`ground`, `sembr`, the gate), and a short body for `claudetto:main`.
- I03 context rot (`01-grounding-and-memory.md:181`): the setting `autoCompactWindow` after the eval, a mod `session.compact` handoff schema, and a re-read of the handoff file in the body.
- I04 false completion (`02-verification-and-honesty.md:72`): one `Stop` check that runs the real command, and the `reviewer` agent that gets the diff and the plan only.
- I05 specification gaming (`02-verification-and-honesty.md:133`): static `deny` on the settings files and the plugin cache, and a `tool.check` ask on an edit of a test assertion.
- I06 sycophancy (`02-verification-and-honesty.md:191`): an agent rule in `main` ("state a disagreement once, with evidence"), and the `reviewer` agent in a fresh context.
- I07 scope creep and destructive actions (`03-safety-and-trust-boundaries.md:69`): the mod `tool.check` gate on the full command, with a reason text that says "do not retry another way".
- I08 invented APIs and config keys (`03-safety-and-trust-boundaries.md:126`): `bin/claudetto-setup` validates the snippet against the settings schema, and the `claudetto-docs` skill gets the version-pinned docs.
- I09 bloat (`04-engineering-delegation-and-cost.md:64`): the `dry` skill, and a rule in `worker` to reuse a function before it adds one.
- I10 trust boundaries (`03-safety-and-trust-boundaries.md:191`): an agent rule that tool output is data, and a `tool.check` ask on a command that sends a file to a host.
- I11 delegation (`04-engineering-delegation-and-cost.md:121`): `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, the `agent.spawn` hook, `isolation: worktree`, and (new) `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`.
- I12 cost and effort (`04-engineering-delegation-and-cost.md:187`): `effort: medium` in the agent files, `scout` on Haiku for code search only, the cache TTL envs, and the `claudetto:Concise` style.
- I13 over-deferral (`06-autonomy-and-consent.md:59`): the autonomy contract in the body of `main` (free reads, local checks, stub captures need no question).
- I14 consent drift (`06-autonomy-and-consent.md:114`): a `tool.check` ask with `decider: "person"` on an edit of `limits.ts`, `budget.ts`, or a settings file.
- I15 wording tests (`06-autonomy-and-consent.md:163`): a rule in `worker` ("test the effect, not the words"), and the `sembr` and `reply` hooks as lints at the point of use.
- I16 invalid measurement (`07-measurement-and-environment.md:66`): the `claudetto-lab` capture asserts the arm (settings, plugins, model, tools) before it scores, and keeps the trace.
- I17 process hygiene (`07-measurement-and-environment.md:112`): a `tool.check` on `pkill -f` and `killall`, a rule to kill by saved PID, and (new) `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`.
- I18 harness and environment (`07-measurement-and-environment.md:156`): the shell facts in the `prompt.context` message, and a re-read after a rejected write.

Faults in the threads with no class of their own in the dossier:

- Reads through `Bash` skip the hooks on `Read` (`1wy76rw`): a `tool.check` rule on `cat`, `head`, and `sed -n` of a file, and Probe 1.
- A background job that outlives the session (`1x540si`): `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`, and a `SessionEnd` check of child processes.
- A cold-cache return (`1wuwtqy`, `1x62hgo`): a warning hook before the send (see the table).

## Stub-Probe Candidates

Each probe uses the method of `probes.md`.
Run `claude -p "say hi"` under `env -i` with a new empty `CLAUDE_CONFIG_DIR`, a dummy key, and `claudetto-capture` against a closed port.
Compare the first request body to the `base` body.
The sizes are characters, not tokens.

1. `CLAUDE_CODE_THRIFTY_SONIC=0` against unset, under `--permission-mode bypassPermissions`, then `auto`, then the default.
   Diff `system` and `messages` for text about `cat`, `sed`, and `Read`.
   If the text goes, the var is real and the delta is a saving.
   If nothing changes, mark the var as unreal for `2.1.306`.
2. `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS=1`.
   Diff the schemas of `Agent` and `Bash` (the `run_in_background` field) and any background text in `system`.
3. `disableBundledSkills: true`.
   Diff the skill and command listing in `messages`.
   Check whether `/doctor` and `/claude-api` appear, and how many characters each adds.
4. The cache lifetime fields.
   Set `CLAUDE_CODE_PROMPT_CACHE_TTL=1h`, then `ENABLE_PROMPT_CACHING_1H=1`, then `FORCE_PROMPT_CACHING_5M=1`.
   Read the `ttl` of each `cache_control` block in the body.
   This checks the precedence in `request-and-cache.md` and the claim in `1x745l9` that an API key writes five minutes.
5. `maxEffortLevel: "medium"` with `--effort max`.
   Read `output_config.effort` in the body.
   The docs say the cap clamps it (`configure/settings/model.md:30`).
6. The built-in `outputStyle: "Concise"` against a file style of the same size.
   Compare the `system` text and the reminder in `messages`.
   A thread (`1vtktks`) says the built-in style adds a reminder on every turn.
   One request shows the size of one reminder only.
7. `CLAUDE_CODE_AUTO_COMPACT_WINDOW` and `idleCompaction` do not show in the first body.
   Skip them in the stub, and measure them in the handoff eval.
