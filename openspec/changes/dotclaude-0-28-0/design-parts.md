# Design parts

This file holds decisions D6 to D11 and D22 to D28 of `design.md`.
D7 is removed by D35.
D9 and D10 are rewritten by D35.

## D6 Status line

Files under `features/statusline/`: `input`, `derive`, `segments`, `layout`, `grid`, `git`, `subagents`, `paint`, `credits`, and `context-table`, each under 200 lines, importing only `lib/` and their own folder.
The status line keeps only what the status input of Claude Code gives in one call, plus the reads of D35 item 3 (the usage cache and the `/context` table).
It writes no file (D35).
`state` (burn-rate samples), `cache` (the short cache for slow reads), and `breakdown` (the first-usage estimate and its state) are removed.
The mod may draw the status with `$.ui.status`, which would remove the need for a `statusLine` command (`research/architecture.md`).
Task 25.2 checks whether it can draw the main line in the terminal.
If it cannot, the wiki snippet names a `statusLine` command that the user sets to the plugin script, because a launcher stub in the config dir is a proprietary part (D35).
The status line does not run in `-p`, so no headless fallback exists (task 22.1).

- `derive` holds pure functions: pace, deficit, run-out (`now + (100-used) * elapsed / used`, after 3% of the window), cache hit, rates, and headroom.
  They use only the status input.
  It takes the 0.26.x logic from `157c81c^` where it is valid.
- Reset credits and the Fable window come from a read-only parse of `cachedUsageUtilization` in `<config dir>/.claude.json`.
  The parser accepts one known shape, a fixture test pins it, and any other shape hides the segment.
- The context parts come from the newest `/context` table in a bounded tail of the transcript, read at each call (`TABLE_TAIL_BYTES_MAX`).
  No offset is kept.
  When the table is not in the tail, the middle column shows the meter and the free tokens only.
- `paint` takes the 0.26.x look: single-column icons, green, yellow, and red at `USAGE_LEVELS`, a meter bar, a blinking alarm, a dim separator, and OSC 8 links.
  `NO_COLOR` prints no color.
- `layout` packs segments by priority into at most 3 rows of `COLUMNS` width.

## D7 Auto-fix hook (removed by D35)

The first plan had a `PostToolUse` recorder that appended each edited path to a session file, and a `Stop` fixer that ran the project formatters and linters on the recorded files.
The edited-files log is a state file, and the feature needs it.
Rule D35 removes the feature, its hooks, its detection table, and its tests.
Claude spends context on format and lint issues that the tools could fix, and the Risks list says so.
The facts stay as evidence for the wiki.
On 2.1.293 a changed file does not make the next Edit fail (task 2.14), but Claude Code tells the model to read a reformatted region again before an Edit.
The release notes of 2.1.295 say that `Edit` no longer treats a file as fully read when its contents changed and its modification time did not advance.
Alternative: a `Stop` hook that finds the changed files with `git status` and keeps no log.
Not built, because it runs project tools on files that Claude did not edit in the turn, and no probe shows it safe.

## D8 Context7 skill

The add-on `dotclaude-docs` (D24) holds `skills/docs/SKILL.md`, which adapts the Context7 rule text: `library`, then `docs`, at most 3 calls, no secrets, honest failure.
It runs `npx -y ctx7@<pinned version>`.
The skill command sets `CTX7_TELEMETRY_DISABLED=1`.
The wiki snippet names `context7.com` and `registry.npmjs.org` for the sandbox network list, for a user who installs the add-on.

## D9 Evals through `claude plugin eval`

Rule D35: Claude Code owns the eval suite format, and dotclaude owns no harness.
The harness of 0.27.0 and the first 0.28.0 work is deleted outright (task 25.2 and 25.3):
`tools/eval/`, `tests/eval/`, every `case.json`, the hidden `oracle/` protocol with its tamper hashes and canary, `report.json`, `runs.json`, and `report.md` under `evals/results/`, the scripted-user `rules.json` and `hook.mjs`, `evals/styles/`, the `--styles`, `--variant`, `--profile`, and `--env` arms, and `GATED_ARMS`.
Cuts stay eval-gated, but the gate is a `claude plugin eval` run.

The format of `claude plugin eval` is not in the artifacts of this change.
Its capabilities are **unverified**.
Task 25.1 reads its docs and bundle strings (read only), and maps each check that the plan needs onto it:
the hidden outcome check, the tamper check, the paired comparison of dotclaude and vanilla, the cost for each resolved task, the over-claim and policy-violation checks, the accusation checks, isolation of the config for each run, and a cost limit.
Each check that the format cannot express is dropped.
dotclaude builds no wrapper, script, or file format to add it back.
If the map shows that no suite can express a resolve check, a cut stays unmade, and the wiki says that no gate exists.

- Credentials come from `.env`, which `.env.example` describes (D35 keeps `.env`).
  The Claude session sandbox denies reads of `.env`, so the user starts paid runs with `!`.
- Cases are private to this repository, and the plugin text names no case.
- The statistics (pass^k, a paired bootstrap) stay only if the suite format gives them.
  dotclaude keeps no copy of the old estimators.
- The wiki keeps the figures of earlier runs as prose (`Evals-History.md` and `Evals-0.28.0.md`), with no data files.

## D10 Schema extraction

`tools/schema.mjs` finds the `{$schema:()=>` object in the bundle, matches braces with a scanner that knows strings and regex, reads each key and its `.describe()` text, and maps the minified type helpers with a table for each version.
It writes `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`, for 2.1.295 and later (D35).
The managed file stays a reference only (D2).
The version goes in the standard `$comment` keyword at the root, and not in the file name or in a made-up `x-claude-code-version` key (D35).
The 2.1.293 and 2.1.294 files are deleted (task 25.20).
A test validates the plugin `settings.json` and the wiki snippet against the schema.

## D22 Context bound for subagents and the main session

Source: `research/subagent-usage.md` and `research/session-growth.md`.
Investigator runs, not the session start, use most of the quota, because each run pages files into its context and ends at 110K to 223K tokens.
The main session grows too.
The user reports that a 0.27.0 session ended at 267.4K of 300K with compaction off, and that `/context all` gave messages 255K and Bash results 80.5K (27%) (the user's `/context` report, no transcript has it).
The closest session, `00bfd354`, has Bash results of 51.2K tokens, and results plus tool inputs of about 82.7K tokens (**inferred**, `research/session-growth.md`).
The same report gave skills 858 tokens against 2.8K at 2.1.292, so the listing cuts work (the user's report).
Tools were 8.2K against 4.4K at the start, which deferred tools loaded in the session can explain (**inferred**).
The output style already tells the model to read only the part of a file that it needs, so that text alone did not hold the bound.
dotclaude bounds each subagent with these parts, in the order of D1:

1. Agent body: one rule to search first and read only the matched range (`Grep` with `-n`, then `Read` with `offset` and `limit`), and never to page a whole file with `head -c` or `tail -c`.
1. Budget: `SUBAGENT_CONTEXT_MAX` (100K) and `HAIKU_CONTEXT_MAX` (85K) in `features/context/limits.mjs`.
   A Haiku 5.5 subagent uses `HAIKU_CONTEXT_MAX`, because Haiku 5.5 costs 5x for each request above 100K prompt tokens, and the bound leaves room for the report turn below that step.
   A classic `PostToolUse` hook gives `additionalContext` inside the subagent that tells it to report when its context passes the bound, because `turn.step` can change only `model` and `effort` (`research/mods-api.md`).
   Probe 2.32 first checks that the hook runs inside a subagent.
   The hook tells and does not block, because a block loses the work of the run.
   The same hook counts the turns of the subagent in its transcript (distinct `message.id` values) and reads `maxTurns` from the agent file by `agent_type`.
   With `TURNS_LEFT_AT` (2) turns left, it gives one note, joined with the context note when both apply, because a subagent has no turn count and the body rule did not keep a report (probe 10.9).
1. `maxTurns` stays in each agent file, with a value from the eval, after task 2.17 finds what it counts.
   One turn is one request, and a `SendMessage` resume after the limit starts a new count (task 2.17).
   So the delegation text tells the coordinator to take the report of a stopped run, not to resume it for more work.
1. Delegation text in the prompt variants (D15): delegate a read only when it is larger than the start cost of a subagent, and give one subagent the related questions instead of one subagent for each question.
   Give a simple question to one subagent, and use more subagents only for parts that are independent (the orchestrator-worker pattern, [agentpatterns.ai](https://agentpatterns.ai/patterns/multi-agent/orchestrator-worker/)).

Task 2.25 split the main-session growth (`research/session-growth.md`).
Tool results were 7% to 21% of the peak context, and the largest one was 22.8K chars, so one large result is not the cause.
48 of 86 file reads (56%) read the same file again, almost all as Bash `sed -n` slices, and the `Read` tool read a file again one time only (**confirmed**).
The `Read` tool returns a short stub when the same file and the same `offset` and `limit` are read again and the file did not change (**confirmed**, bundle text and a run in this session).
A different range of the same file is sent again in full (**confirmed**, same run).
A Bash slice gets no stub.
Cross-session injected messages added about 42K tokens in one session (**confirmed**).
The main session gets these parts:

1. The output style and each agent body tell the model to read files with `Read` and `offset` and `limit`, and to refer to an earlier result instead of a second read of the same lines.
1. A `PreToolUse` hook on `Bash` denies a command that only prints a file (`cat F`, `sed -n 'a,bp' F`, `head F`, `tail F`, with no pipe and no other command).
   The deny reason gives the `Read` call with the same range.
   A deny here is cheap, because the next call does the same read and no work is lost.
   A command with a pipe, a filter, or a generated file stays allowed.
1. The same hook denies a `Bash` command whose output has no limit, and the reason gives the bounded form (task 18.14, decision of the user 2026-10-09).
   A pipe that ends in `head`, `tail`, or `wc`, a count, list, or range option, and output to a file stay allowed.
1. Each agent body sets a bound on its final report (`REPORT_MAX_WORDS`), because the main session keeps each report to the end.
1. `just measure` counts the repeat reads of each session, so that the eval can show the effect.

Alternative: a lower `BASH_MAX_OUTPUT_LENGTH`.
Rejected, because large single results are not the cause, and it also cuts build and test output.
Changed 2026-10-09 (decision of the user): `bashOutputMaxChars` at 4000, its lowest value, because Claude Code 2.1.295 saves a longer output to a file and sends a preview and the path, so no build or test output is lost.
Alternative: the `updatedInput` filter of the docs that keeps only the failures of a test command.
Rejected for now, because test output was 7.7K chars or less in each session.

## D11 OpenSpec

The reduced `setup` skill runs `openspec config set delivery skills`, keeps the `core` profile, turns telemetry off, and runs `openspec update` after the user confirms.
The OpenSpec CLI owns those settings, so dotclaude adds no format (D35).
The wiki snippet adds `name-only` for each `openspec-*` skill.

## D2 detail: evidence for the settings.json-only route

- No managed files: `cc-plugin-sec-default@builtin not seated: no managed settings and not a Team or Enterprise organization`.
  dotclaude loads at tier `user`, and its `prompt.section` hook and the hook of a user probe both reach the request (`research/probes-2.md`, "No managed settings").
- `prompt.compose` at tier `user` was proven in 2.7, when the guard was not seated.
- With managed settings, the guard is seated and skips `prompt.section` handlers of tier `user` (2.1).
  A managed `enabledPlugins` key locks the plugin name, so `--plugin-dir` copies are ignored (2.1).
- With no guard, a user mod with a `tool.check` hook can turn a content deny rule into an allow (log: `deny -> allow by plugins dotclaude, probe23`, 2.3).
  A path deny and a whole-tool deny are enforced before `tool.check`, so no mod can override them.
  The guard of dotclaude never weakens a deny.
- The guard options `allowManagedModsOnly` and `allowModsToOverrideDenyRules` need managed settings, so dotclaude cannot set them.
- The old base managed template held `autoCompactEnabled`, `autoMemoryEnabled`, `env`, `permissions`, and `sandbox`.
  These five keys go in the wiki snippet (user scope, task 6.9).
- Organization case: the drift check reports that the guard is seated and which dotclaude parts it skips, and changes nothing.
- Evidence: `research/probes.md`, `research/probes-2.md`, and `research/mods-api.md`.

## D23 Development frictions

0.28.0 removes each friction that the task 2 probes met, so that a user or a developer does not meet it again.

- Bash in the sandbox and the capture port: an agent sandbox that blocks a local listen stops both the nested Bash sandbox (its socket) and `just capture` (its port).
  The fix is `sandbox.network.allowLocalBinding: true` in the settings of the session that runs the agent, which the user sets.
  A scratch `sandbox.enabled: false` does not help, because a managed `sandbox.enabled: true` with `failIfUnavailable: true` wins, and it would weaken the sandbox.
- Capture: the capture session of D16, documented in `wiki/Sandbox.md`.
- Evals: `claude plugin eval` (D9).

History: the drop-in procedure of the first plan wrote variants of a managed drop-in to `research/dropins/`, and the user installed them with `sudo`.
It was used for the 0.28.0 probes only (tasks 2.1 to 2.3) and is not a shipped route.
The name lock and the sandbox install from a managed folder went with it (task 2.21).

## D24 Add-on plugins: Jev, browser, and code graph stay separate

Decision of the user, reversing the first plan that merged the add-ons into dotclaude.
An optional feature that costs tokens or needs an outside tool is a separate plugin that works without the core plugin and imports nothing from it.
Reason: the plugin is the unit of install and disable, a plugin skill keeps its listing line until the whole plugin is off (D5, task 2.12), and one plugin forces all `$` calls into one module file (`research/architecture.md`).
`CLAUDE.md` already says each add-on works without the core.

- `dotclaude-jev` is the consultant add-on: with `TYPESAFE_API_KEY` set, Claude asks Jev before almost every decision (decision of the user).
  The tool is loaded when the key is set, because Claude calls it in most sessions, and deferred without the key.
  Claude never skews a question toward its own preference: the description asks for every option with its evidence and no preferred answer, and the handler puts the options in a random order.
  Its hooks module registers a custom tool (`$.tool.register`), not a skill and a session note.
  A custom tool is deferred by default and costs about 10 tokens in the deferred list (task 2.20), against about 60 for a skill line and the session note.
  The rule text of the old note goes into the tool description, so it loads only with the tool.
- The tool asks Jev when `TYPESAFE_API_KEY` is set.
- When the key is not set, or Jev fails, the tool gives a reviewer check on Haiku 5.5 (decision of the user).
  First route: `$.model.complete` from the tool handler, with no subagent start, if a probe shows that it works there.
  The route to the Jev client: the script imports `node:` modules, which the module-graph ban blocks, so the tool handler calls it as a child process with `$.process.run` (`research/mods-api.md` lists `process.run` and `http.fetch`).
  Each route names its model: Jev answers with its own models, and the reviewer fallback runs on Haiku 5.5 by `$.model.complete`, or on the model of the `reviewer` agent (Opus 5.5, D25) by the second route.
  Second route: the tool result tells the model to start the `reviewer` agent of `dotclaude` when it is installed, and else to answer from its own check.
- The `AskUserQuestion` hook of Jev stays in `dotclaude-jev`, and it runs only when the key is set.
- `dotclaude-browser` keeps the browser skill, with a description of 100 characters or fewer (D5).
  A task compares it with a custom tool and keeps the cheaper form with no eval loss.
- `dotclaude-browser` replaces the built-in `WebSearch` with its headless browser (decision of the user).
  Route by D1: a `tool.call` handler on `WebSearch` in the add-on module answers with a search through the browser by `$.process.run`, so the model keeps the tool that it knows and no listing changes.
  If `$.process.run` cannot run the browser (task 3.10), the fallback is a `tool.check` deny of `WebSearch` whose reason names the browser skill.
  When the browser fails or the page has no results, the handler calls `next(e)` and the built-in `WebSearch` answers (decision of 2026-10-09, task 3.19).
  Reason: each search engine gave a bot check or a block page to the headless browser on each run from the test network, and a deny ended a sandbox session with no answer.
- `dotclaude-docs` is new and holds the Context7 `docs` skill (D8), because it needs an outside tool (`ctx7` through `npx`) and costs a listing line when unused.
- `dotclaude-codegraph` is new (D26).
- Each add-on ships (decision of the user).
  `marketplace.json`, the README, and the wiki list the plugins in this order: `dotclaude`, `dotclaude-codegraph`, `dotclaude-jev`, `dotclaude-browser`, and `dotclaude-docs`.
  `dotclaude-modder` stays removed (D20).
- An add-on has its own limits module for its own bounds (D18).
  If `hooks/register.mjs` passes 250 lines, the next feature of the core also becomes an add-on.

## D25 Agent roster

Decision of the user, from the research and the probes of group 2.
The Claude Code docs give no number of agents. They say to define one for a worker that repeats, with a focused prompt, and to keep work that shares context in the main conversation.

| Agent | Work | Frontmatter default | `maxTurns` |
| --- | --- | --- | --- |
| `investigator` | code and web questions, read-only (takes `web-researcher`) | Haiku 5.5 medium | 31 |
| `implementer` | scoped feature, fix, tests, docs | Haiku 5.5 medium | 61 |
| `debugger` | unknown cause, or a failed fix | Haiku 5.5 high | 61 |
| `reviewer` | code, security, API, and plan review, and the Jev fallback route (D24) | Sonnet 5.5 medium | 41 |
| `test-runner` | checks, with the exact failures, `omitClaudeMd` | Haiku 5.5 low | 16 |

The context hook tells each agent to report at `TURNS_LEFT_AT` (2) turns before its `maxTurns` (D22).

- Each `maxTurns` holds one spare turn for the report (task 2.17).
- No agent has the `Agent` tool.
- The frontmatter is the only source of the choice (D12, D35).
  No router rewrites it.
  The user set the values on 2026-10-09 from the eval report `evals/results/2026-10-09T12-16-54-262Z` and the Anthropic effort guide.
- A coordinator that needs a stronger model for a failed fix or an audit passes `model` and `effort` in the `Agent` call.
- Planning and orchestration stay in the main loop, on the model and effort of the session (D13).
- Fable 5.1, or Mythos 5.1 for an account in CVP at the same cost, has no agent and runs only when the user selects it.
- The snippet turns off the built-in agents `Explore`, `Plan`, `general-purpose`, `claude-code-guide`, and `statusline-setup`.
  `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` turns off `Explore` and `Plan` (2.1.294 bundle), and a `permissions.deny` entry `Agent(<name>)` turns off each of the other three.
  Each listed agent costs tokens at each start (agent listing 728 tokens, task 2.9), and `Explore` runs on the main model.

## D26 Code graph through the CodeGraph CLI

Source: `research/code-graph.md`.
The add-on `dotclaude-codegraph` (D24) uses `colbymchenry/codegraph` (MIT, v1.6.2 on 2026-10-03) through its CLI, with no MCP server.
Its CLI has `index`, `sync`, `query`, `callers`, `callees`, `impact`, and `affected`, most with `--json`, and it keeps its index in `.codegraph/codegraph.db` (**confirmed**, README, not run).
The user reports that GitNexus got little use until it added hooks, and no public text of that report was found (**unverified**).
The GitNexus plugin adds `PreToolUse` on `Grep`, `Glob`, and `Bash` with `additionalContext`, and a `PostToolUse` stale-index notice after git changes (**confirmed**).
The CodeGraph benchmark reports that agents used its CLI through Bash in 26 of 28 runs with no prompt (**confirmed**, README).
The add-on has `bin/`, classic command hooks in `hooks/hooks.json`, and no hooks module.
Its logic is in `features/graph/cli.mjs`, and it keeps no data of its own.
The index in `.codegraph/` belongs to the CodeGraph CLI (D35).
It has these parts, and each part runs only when `.codegraph/` exists in the project:

1. A check of the add-on finds `codegraph` on `PATH`, and when it is not there, it prints the install command and does not install it.
   The check never runs `codegraph install`, because that command edits the user config.
1. `SessionStart` runs `codegraph sync` and adds one line that names `codegraph callers`, `callees`, and `impact` with `--json`.
1. A `PreToolUse` hook on `Grep` and `Glob` adds the `codegraph query --json` result for the searched symbol as `additionalContext`, bounded by `GRAPH_CONTEXT_MAX` in the limits module of the add-on.
   The hook passes the search pattern to the CLI after `--`.
1. A `PostToolUse` hook after `Edit`, `Write`, and a git command that changes the tree runs `codegraph sync` in the background.
1. The `SessionStart` hook of the add-on injects the line that names `impact` and `callers` for a question about the effect of a change.
   No core agent body names the code graph, because the add-on must work and be absent without the core text.

Before the add-on is built, task 17.1 compares the CLI with the built-in LSP tool (`ENABLE_LSP_TOOL`), because D1 and the `CLAUDE.md` rule against runtime JavaScript for a feature that Claude Code has apply.
The add-on ships whatever the comparison shows (decision of the user), and the comparison goes to the wiki.
The eval compares an impact question with and without the hooks, for correctness and tokens.
A hook result that is empty or late adds nothing, because GitNexus issue #3416 shows empty context for common symbols.

## D27 Measured facts over model reports

Source: issue #35357 in `research/code-graph.md`.
In that issue, Claude printed context warnings at false values, worked around the user's rules with scripts, and admitted it later.
The lesson is that a model can report a false state on purpose, so dotclaude does not take a state figure from the model.

1. No prompt text tells the model to estimate or announce its context share.
1. The context figure reaches the model through `additionalContext` of a `UserPromptSubmit` hook that reads the usage of the last request and speaks only above `CONTEXT_NOTICE_AT`.
   The hook keeps no marker (D35), so it speaks at each prompt above the level (D32).
   The status line may also show the figure to the user, but the model does not read it, so the hook is the route to the model.
   Task 2.26 first checks that Claude Code has no such figure for the model.
1. Claims of a passed check stay under the over-claim measure of the eval.
   0.27.0 has no `Stop` claim check (`wiki/Stop-Prompt-Hooks.md`).
   The 2.1.294 release notes say that Claude Code judges a `prompt` hook on `Stop` that is written as an instruction better, but its `Stop` evaluator text did not change (task 2.33), so task 18.14 tests a short claim-check `prompt` hook again with the eval as the only proof.
   The hook stays only if the eval shows a lower over-claim rate with no loss, and a cost within the noise bound, because each call sends the transcript (about 46K tokens in the mean on 0.26.0).

## D28 Compliance by checks, not by prose

Source: `research/compliance.md` and `research/external-sources.md`.
Concrete rules that a check can see held (ask before publish, read before edit, file size).
Prose rules failed (no recap, semicolons in long lists, one sentence for each chat line), and the docs say that CLAUDE.md is context and a hook is the route to enforce (**confirmed**).

1. Each rule that a program can check moves to a hook, a lint in `just check`, or an eval measure, and leaves the prompt text when the check holds it.
1. `auto-mode-guard.mjs` asked 56 times and caught no real risk, all on `rm -rf` of a variable such as `$P`, `$SBX`, or `$DOTCLAUDE_SANDBOX` (**confirmed**, `research/compliance.md`).
   The guard already allows a path under `$TMPDIR` (`ctx.tmp` in `lib/guard.mjs`), but it cannot resolve a variable.
   The fix resolves a variable that an earlier part of the same command assigned from `mktemp -d` or from `$TMPDIR/...` to the temp root.
   It rejects a path with `..` and a reassigned `TMPDIR`, and keeps `ask` for any other unresolved path.
   After task 3.2 the logic is in `features/guard/rules.mjs`.
1. The eval adds behavior measures for repeat reads, recap and narration, and chat lines with more than one sentence (counted by the `Stop` hook of D29).
1. The project `CLAUDE.md` states whether chat replies are in the scope of the line-break rule, because the data shows the text is not clear.
