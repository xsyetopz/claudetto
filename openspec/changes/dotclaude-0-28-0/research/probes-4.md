# Probe results of task group 2, part 4

Earlier results: [probes.md](probes.md), [probes-2.md](probes-2.md), and [probes-3.md](probes-3.md).

## 2.21 Sandbox checks after design D23 (done)

- A fresh headless sandbox run from the agent session (`DOTCLAUDE_SANDBOX=/tmp/claude-501/p221/sbx`) logged `hooks module dotclaude@inline loaded (worker, environment 2, tier user)` in `/tmp/claude-501/p221/debug.log`.
- The user ran a second fresh sandbox with the `!` prefix, outside the agent sandbox, with `--allowedTools "Bash(echo *)"`.
  The model ran `echo sandbox-bash-ok` and replied with its output (`/tmp/claude-501/p221/out2.txt`).
  The debug log `/tmp/claude-501/p221/debug2.log` has the same `dotclaude@inline` load line.
- The sandbox profile has `sandbox.enabled: true`, and the call did not fail with `sandbox_apply: Operation not permitted`, the error of a run inside the agent sandbox.
  The debug log has no sandbox line, so that the call ran under Seatbelt is **inferred** from the profile.

## 2.6 The 30K start in the terminal (done, not reproduced)

The user ran `just capture` on port 8800 and a terminal session in this repository with the normal config, `ANTHROPIC_BASE_URL`, and `ENABLE_TOOL_SEARCH=true` (session `2c523f84`, Opus 5.5, auto mode).
Capture: `/tmp/claude-501/cap26`.

| Figure | Value |
| --- | ---: |
| `count_tokens` of the first request | 18,880 |
| `/context` total | 18.9K of 300K |
| Status line | 19K, 6% |
| Profile start of task 2.5 (billed) | 19,443 |

- The terminal start with the profile is 18,880 tokens, and the status line, `/context`, and the billed request agree.
  So the terminal does not give a 30K start, and no config source is missing in it.
- The `/context` categories add up to about 10.5K.
  The rest of the 18.9K is the attachments that `/context` does not list, such as `sandbox_instructions` (2,353 tokens), the skill listing (1,454), the git status (1,308), and the agent listing (1,147).
- `/status` lists the setting sources `User settings` and `Project local settings`.
  With a custom base URL, Claude Code does not fetch remote managed settings or the organization policy, so the capture cannot show a start that those sources change.

Starts of 27K or more in the 12 transcripts that this machine still keeps, by first-request usage:

| Session | Tokens | Version | Entry point | Note |
| --- | ---: | --- | --- | --- |
| `3dee021f` | 40,721 | 2.1.292 | `cli` | skill listing of 16,666 chars, before the 0.27.0 profile applied (**inferred** from the date) |
| `0942bebe` | 32,382 | 2.1.293 | `sdk-cli` | no `deferred_tools_delta` attachment |
| `7cb597e9` | 32,379 | 2.1.293 | `sdk-cli` | same day and size as `0942bebe` |

- The 2.1.293 starts above 30K are both `sdk-cli`, the entry point of the desktop app and the IDE, not of the terminal.
- `0942bebe` has no `deferred_tools_delta`, and the terminal sessions have one.
  So tool search was probably off, and every tool schema was loaded (**inferred**, the transcript does not hold the tool list).
- Its skill listing is 9,245 chars against 4,654 in the terminal.
- The desktop app and the IDE are group 20 (task 20.1), which checks the config source of each surface.

## 2.13 open item: key form of a synced skill (closed, not testable)

The user has all skills turned off on claude.ai, so no `anthropic-skills:*` skill syncs, and a live check of the key form is not possible on this account.
The bundle evidence of `probes-2.md` stays: the safe key is `anthropic-skills:<n>`.
Task 6.6 sets `syncClaudeAiSkills: false`, which stops the sync, so the profile needs no `skillOverrides` key for a synced skill.

## 2.20 Custom `ask` tool against `AskUserQuestion` (done)

The user ran two interactive sandbox sessions through `just capture` on port 8800 (capture `/tmp/claude-501/cap220`), each with the prompt "Ask me with a question tool whether I like red or blue, then reply with my answer."
The custom arm loaded the scratch plugin `/tmp/claude-501/p220/plugin`.
It registers `ask` at `session.start`, serves it with `$.ui.ask` in a `tool.call` hook, and defers `AskUserQuestion` with `tool.describe`.

| Arm | Loaded tools | Tool schema chars | `AskUserQuestion` | Dialog | Answer |
| --- | ---: | ---: | --- | --- | --- |
| built-in | 10 | 19,813 | loaded, 4,897 chars, 1,682 tokens | yes | chosen in the dialog |
| custom | 9 | 14,915 | deferred | yes, the engine dialog through `$.ui.ask` | `Red`, logged in `/tmp/claude-501/p220/logs/ask.json` |

- The first request of the built-in arm is 15,907 tokens by `count_tokens`.
  The proxy counts only its first request, so the custom arm has no `count_tokens` figure.
- The custom arm sends 4,898 fewer tool chars at the start, which is the `AskUserQuestion` schema, about 1,680 tokens.
- The model loaded `mcp__p220__ask` with `ToolSearch` (329 chars, about 120 tokens, in the later requests) and called it once.
  So the saving is about 1,560 tokens in a session that asks a question, and about 1,670 in a session that does not.
- The saving passes the 1,000-token bound of the task, so the custom tool stays for the eval.
- The tool result row shows `p220 - ask (MCP)` with the answer, not the built-in question row.

## 2.28 Probe P2: `userConfig` dialog with defaults (done)

Scratch marketplace `/tmp/claude-501/p228/market` with the plugin `p228`, which has three options with defaults: `mode` (string, `alpha`), `limit` (number, 7), and `flag` (boolean, `true`).
The user installed it with `/plugin install p228@p228` in an interactive sandbox.

- Install shows a "Configure p228" dialog even when every option has a default.
- The dialog shows the boolean default (`Flag true`), and shows the string and number fields empty.
- The user saved the dialog with no input, and the next session start logged `{"mode":"alpha","limit":7,"flag":true}`.
  So the defaults apply, and `options` reaches `register(on, options)`.
- So a `userConfig` option costs the user one dialog at install, and the dialog does not show the default of a string or a number option.

## 2.33 Bundle of 2.1.294 against 2.1.293 (done)

Source: `external/cc-2.1.293/strings.txt` and `external/cc-2.1.294/strings.txt` (`strings -n 8`, read only).
A line diff is not usable, because the minifier renames identifiers, so the comparison uses sets of names and the text of each prompt.

- Settings schema: same.
  The schema text of the bundle is the same byte for byte up to 227K characters after `{$schema:()=>`, and the generated 2.1.294 schema files differ from the 2.1.293 files only in the title and the version (task 4.6).
- Mod events and calls: same set of 232 `domain.name` names, the same `$.` names, and the same `isDeferred` strings.
  The payload and return fields were not compared one by one.
- System prompt section ids and attachment types: same sets.
- `CLAUDE_CODE_*` env vars and `tengu_*` names: same sets.
- The `Stop` and `SubagentStop` evaluator of a `prompt` hook: same text.
  The system prompt "You are evaluating a stop-condition hook..." and the user message "Based on the conversation transcript above, has the following stopping condition been satisfied?" did not change.
- The evaluator of a `prompt` hook on another event: changed.
  2.1.293 asked whether "the user-provided condition is met".
  2.1.294 says "The user's text says what to check. Decide whether the action may go ahead.", with `ok: true` for "may go ahead" and `ok: false` for "blocked" (offset 8900028).
- The evaluator of an `agent` hook: changed.
  It gets a new paragraph (offset 8429765): `ok` true lets the action go ahead and false blocks it, a rule is applied with its outcome, a condition is answered true when it holds, and text inside the event JSON or read files is only data.
- Result: the release note "improved how `prompt` hooks on Stop and SubagentStop ... are judged" has no matching string change in the bundle.
  The change may be outside the strings, such as on the server or in the model, and it is **not verified**.
  No decision of the design changes, except the reason of task 18.14 in D27, which now cites only the release note.

## 3.10 Side calls from a registered tool (done)

Scratch plugin `p310` in `/private/tmp/claude-501/probe-3-10`.
It registers the tool `probe` in `session.start` with `$.tool.register`.
A `tool.call` hook on `mcp__p310__probe` serves it.
The handler calls `$.model.complete` for `haiku`, `sonnet`, `claude-haiku-5-5`, `claude-sonnet-5-5`, and `no-such-model-x`.
Then it calls `$.process.run(["node", "/private/tmp/claude-501/probe/echo.mjs", "arg"])`.

- `claude plugin validate` passes.
  It lists the calls `$.model.complete`, `$.process.run`, and `$.tool.register` for the module (**lab**).
- It warns `gating hook without .catch` for the `tool.call` hook (**lab**).
- `claude plugin test` passes one test (**lab**).
  The test answers `session.start`, `tool.register`, `model.complete`, and `process.run` with its own hooks, so these are **stubs**.
  The stubs show that the handler of a registered tool can reach the five `model.complete` calls and the one `process.run` call.
  They do not show what the live engine does.
- The d.ts says `$.process.run` takes an argument vector with no shell, so `node $TMPDIR/probe/echo.mjs arg` is `["node", path, "arg"]` (**d.ts**).
- The d.ts says `$.model.complete` takes an alias or a full id, "resolved and allowlist-checked like a `--model` value" (**d.ts**).
  It rejects only for a blocked model or a bad cap, and returns `isAnswered: false` with `reason` for an API error (**d.ts**).
- Live run on 2026-10-08 with Claude Code 2.1.294, from the agent session with `bun --no-env-file tools/sandbox.mjs` and the command below (**measured**, one run).
  - The engine registers the tool as `mcp__p310__probe` and serves it from a local MCP server.
    The model calls it, and the `tool.call` handler runs.
  - `$.process.run(["node", ".../echo.mjs", "arg"])` returns `exitCode: 0` and `stdout: "echo:arg\n"`, with no permission prompt.
  - `$.model.complete` sends a request with `source=side_query` for each id.
    Each of `haiku`, `sonnet`, `claude-haiku-5-5`, and `claude-sonnet-5-5` returns `{ok: false, reason: "api-error", status: 429, error: "rate_limit"}`.
    The debug log shows a 429 `rate_limit_error`, a second send with another dispatch id, the client retries, and the same 429.
    The main-loop requests of the same session do not get a 429.
  - `no-such-model-x` throws `model "no-such-model-x" is not in this organization's allowlist`.
- Result for design D24:
  - Route 1 (`$.model.complete` for the reviewer fallback) does not work on this subscription account.
    The cause of the 429 for side queries is **not verified**: a limit for side queries on the plan, or a short rate limit.
  - Route 2 works: the tool result tells Claude to start the `reviewer` agent.
    Task 3.12 uses route 2.
  - `$.process.run` works from a registered tool, so task 3.19 can run the browser from a `tool.call` handler on `WebSearch`.
- The capture of the side request is not done, because the proxy of `just capture` needs a terminal outside the agent sandbox.
  The debug log gives the request source and the status in its place.

```bash
bun --no-env-file tools/sandbox.mjs --model claude-haiku-5-5 --plugin-dir /private/tmp/claude-501/probe-3-10 \
  --debug-file "$TMPDIR/p310.debug" -p "Call the tool mcp__p310__probe once with an empty input. Then quote its result text verbatim in a code block." \
  --allowedTools mcp__p310__probe
```

## Subagent cache TTL, measured again on 2026-10-08 (done)

Source: the transcripts of this repository from 2026-10-07 15:55 to 2026-10-08 10:57 UTC (older files are gone), with 8 sessions, 67 subagent runs, and 1,654 subagent requests.
The prices are the API ratios: a 5-minute write is 1.25x, a 1-hour write is 2x, and a read is 0.1x (0.05x on Opus 5.5).

- **measured:** 1,586 of 1,587 gaps inside a run were under 5 minutes, and the median gap was 4.8 s.
  A cache hit restarts the TTL, so the length of a run does not cause a miss.
- **measured:** Of the 60 gaps between runs of the same agent type, 35 were under 5 minutes, 16 were 5 to 60 minutes, and 9 were over 60 minutes.
  The shared prefix that a warm first request read was about 4K to 6K tokens.
- **measured:** The median run took 3.7 minutes, and 22 of 67 runs took over 5 minutes.
- **inferred (simulation):** The 5-minute TTL cost $34.10 and the 1-hour TTL cost $41.30 (+21%).
  Inside runs, 1 hour costs 20% more. Between runs, it costs 42% more.
- **measured:** 763 of 768 gaps of the main session were under 5 minutes.
- The sample is one working day.
  How a subscription counts a 1-hour write against its usage limits is not documented, so the eval gate of task 5.8 decides the value.
- **measured:** In the main session, 4 of 781 gaps were 5 to 60 minutes (5.4 to 11.4 minutes, at prefixes of 149K to 253K tokens, all Opus 5.5).
- **inferred (simulation):** For the main session, the 5-minute TTL cost $34.07 and the 1-hour TTL cost $36.49 (+7%).
  The 1-hour TTL was cheaper in 2 of 13 sessions, which had 3 gaps and 1 gap.
  The break-even is about 1 to 2 gaps of 5 to 60 minutes in each session.
- An eval cannot decide the main-session TTL, because its runs have no human pauses.
  The real sessions of the user decide it.

## 22.1 Session events, `StopFailure`, status line, and plugin data (done)

Live runs on 2026-10-09 with Claude Code 2.1.295, from the agent session with `bun --no-env-file tools/sandbox.mjs` (**measured**, one run each).
Scratch folder: `/tmp/claude-501/p2201`.
The scratch plugin `p221` has `command` hooks on `SessionStart`, `SessionEnd`, and `StopFailure` (matchers `rate_limit`, `invalid_request`, and none).
Each hook logs its input to `logs/events.jsonl` and writes a file to `${CLAUDE_PLUGIN_DATA}`.
The 429 and the long-prompt runs use a local fake API (`fake.mjs`, Node, because Bun exits with no output when it binds a port in the agent sandbox), with `ANTHROPIC_BASE_URL`, a fake `ANTHROPIC_API_KEY`, and `CLAUDE_CODE_MAX_RETRIES=0`.

| Probe | Run | Result |
| --- | --- | --- |
| `/clear` | `stream-json` input: a prompt, `/clear`, a prompt (`b.out`) | `SessionEnd` with `reason: "clear"` on the old `session_id`, then 124 ms later `SessionStart` with `source: "clear"` on a new `session_id` |
| End of `-p` | `-p` (`a.out`) | `SessionEnd` with `reason: "other"` |
| 429 | fake API, `-p` (`c-429.debug`) | `StopFailure` matcher value `rate_limit`, but both hooks end with status 1 |
| 429 | fake API, `stream-json` (`d.debug`, `logs/d-429.jsonl`) | both hooks end with status 0, with `error: "rate_limit"` and `error_details: null` |
| Prompt is too long | fake API, 400 `invalid_request_error` "prompt is too long: 250000 tokens > 200000 maximum", `-p` (`c-long.debug`) | `StopFailure` matcher value `invalid_request`, and the reply text is `Prompt is too long` |
| Refused connection | a fake API that did not start (`c-429.debug`, first run) | `StopFailure` matcher value `server_error` |
| Status line in `-p` | `--settings status.json` with a logging `statusLine` command (`a.debug`) | the command did not run |
| `${CLAUDE_PLUGIN_DATA}` | each hook above | the env var is set and each write passes, to `config/plugins/data/p221-inline` for a `--plugin-dir` plugin |

- `SessionStart` with `source: "clear"` has only `session_id`, `transcript_path`, `cwd`, `hook_event_name`, and `source`.
  It has no field for the old session.
  So the carry of task 22.5 keys its file on `cwd`, and `SessionEnd` with `reason: "clear"` writes it before the new session starts.
- `SessionEnd` has `prompt_id` and `reason`, and `StopFailure` has `error`, `error_details`, `last_assistant_message`, `effort`, and `prompt_id`.
- In `-p`, Claude Code shuts down about 10 ms after the API error and kills the `StopFailure` hooks (`killProcessTree`), so a record from `-p` is lost.
  In a session that stays open, the hooks complete.
  So the record of task 22.5 is for an interactive session, and a test in `-p` cannot show it.
- The bundle maps a "prompt is too long" reply to the `invalid_request` kind (the `/\b(too long|too large|exceeds|token limit|prompt is too long)\b/i` test in the `invalid_request` case).
  So a `StopFailure` hook that wants only a long prompt matches `invalid_request` and reads `last_assistant_message`.
- The status line does not run in `-p`, so the usage state file of `lib/usage-state.mjs` gets no update in `-p` and in eval runs.

## 10.5 and 10.9 Subagent bounds, live (done)

Live headless runs on 2026-10-09 with Claude Code 2.1.295, from the agent session with `bun --no-env-file tools/sandbox.mjs` (**measured**, `DOTCLAUDE_SANDBOX_PLUGINS=dotclaude`, main model `claude-sonnet-5-5`).
Scratch folders: `/tmp/claude-501/p109`, `/tmp/claude-501/p109b`, and `/tmp/claude-501/p105`.
The agent with the lowest `maxTurns` is `test-runner` (`maxTurns: 16`, `model: claude-haiku-5-5`).
So both tasks ran on `test-runner`, and the subagent transcripts show the model `claude-haiku-5-5`.
A subagent delivers its report with the `SubagentHandback` tool call, and so a "text report" is that call (**measured**).

| Run | Task | Assistant turns | Context in tokens | Last assistant message | Cost in USD |
| --- | --- | --- | --- | --- | --- |
| `p109` | 40 files, `Read` of each | 2 | 7,360 and 12,667 | `SubagentHandback` | 0.047 |
| `p109b` | chain of 40 files | 16 | 7,461 to 10,021 | `Read` (no report) | 0.035 |
| `p105` | 8 files of about 60 KB | 6 | 7,381 to 126,788 | `SubagentHandback` | 0.086 |

### 10.9 Bound by turns

- In `p109` the agent made 40 `Read` calls in parallel in one turn, so the run did not reach the bound (**measured**).
  The run does not test `maxTurns`.
- In `p109b` each file names the next file, so each `Read` needs its own turn.
  The debug log has `[Agent: dotclaude:test-runner] Reached max turns limit (16)` (**measured**).
- The transcript has 16 assistant turns, which is `maxTurns` (**measured**).
  The first check, at most `maxTurns` turns, passes.
- The last assistant message is a `Read` of `f/c16.txt`, with no report (**measured**).
  The main model said that the agent "stopped at its 16-turn limit with no report" (**measured**).
  The second check, a last message that is a report, fails.
- The body rule "stop new work when two turns are left" had no effect (**measured**).
  The agent made `Read` calls up to the turn limit and never called `SubagentHandback`.
- The agent has no turn counter in its context, so it cannot count the turns that are left (**inferred**, from the transcript, which has no turn count in the messages).
- Result: **fail**.
  The `maxTurns` bound holds, but the "last turn for the report" rule does not keep a report when each turn needs a tool call.

### 10.9 Bound by turns, with the turn note

- `p109c` repeated `p109b` with the turn note of `features/context/turns.mjs` (**measured**, same chain of 40 files, `test-runner`, Claude Code 2.1.295).
- After the 14th `Read`, the `PostToolUse:Read` hook gave `additionalContext`: "You made 14 turns, and the limit is 16 turns. The run stops at the limit with no report. Start no new tool call. Give your report now in 400 words or fewer. Include what is done and what stays open." (**measured**, debug log).
- The subagent transcript has 15 assistant turns, which is at most `maxTurns` (16), and the last turn is `SubagentHandback` with the counts of 14 files and the 26 open files (**measured**).
- The hook ran again after the `SubagentHandback` call, with the 15 turns note, and did no harm (**measured**).
- The cost of the run was 0.034 USD (**measured**).
- Result: **pass**.
  The `p109b` result, 16 turns that end in a `Read` with no report, is fixed.

- The agent was `test-runner` on `claude-haiku-5-5`, so the bound was `HAIKU_CONTEXT_MAX` (85,000) (**measured**, `agent-*.meta.json` and the transcript).
- Each file is 60 KB, and `Read` cut each file at 25,000 tokens (`read_truncation_notice`, "cap 25000").
  So each `Read` result added about 53K to 63K characters, and about 22K to 26K tokens (**measured**).
- The context at the six assistant messages was 7,381, 29,806, 56,000, 78,351, 104,409, and 126,788 tokens (**measured**).
  The hook gave no text at 29,806, 56,000, and 78,351 tokens, which are below 85,000 (**measured**).
- After the fifth `Read`, the `PostToolUse:Read` hook gave `additionalContext` (299 characters): "Your context is 104409 tokens, which is over the bound of 85000 tokens. Make no more tool calls except a call that you need for the report. Give your report now in 400 words or fewer." (**measured**).
  The debug log line is `Hook PostToolUse (node "${CLAUDE_PLUGIN_ROOT}/features/context/cli.mjs") provided additionalContext (299 chars)`.
- After the text, the agent made no more tool turn for work (**measured**).
  Its next turn was the `SubagentHandback` call, at 126,788 tokens, and the run ended.
  The check allows at most one more tool turn, so the check passes.
- The agent read 5 of the 8 files, and it ended with a report of the facts that it had (**measured**).
- The hook gave the same text after the `SubagentHandback` call, at 126,788 tokens (**measured**).
  The run was over, so the text had no effect.
- The context at the report message (126,788) is 41,788 tokens over the bound.
  The bound is checked after a tool call, and one `Read` can add 25,000 tokens, so a context can pass the bound by that step (**inferred**).
  The step from 78,351 to 104,409 tokens is 26,058 tokens (**measured**).
- Result: **pass**.

## 25.2 The main status line from `$.ui.status` (done, cannot)

- A probe plugin (`/tmp/claude-501/dcl/uiprobe`) called `$.ui.status("UIPROBE row one\nUIPROBE row two")` at `session.start` in a TUI sandbox session (`/tmp/claude-501/dcl/m6`, Claude Code 2.1.295, tmux at 160 columns).
- The debug log `/tmp/claude-501/dcl/uiprobe.debug` has the line `$.ui.status (uiprobe): UIPROBE row one\nUIPROBE row two`.
- The screen showed one row under the prompt: `⚠ uiprobe: UIPROBE row one�UIPROBE row two` (**measured**).
  The row is a pinned notice beside the notices of the engine, with a warning glyph and the plugin name before the text.
  The newline is drawn as a replacement glyph, so the text has one row only.
- The type docs say the same: "Pins `text` as this plugin's status line under the prompt, beside the engine's own pinned notices", one for each plugin.
- Result: the mod cannot draw the main status line, which has up to 3 rows and colors and takes the status JSON of Claude Code on stdin.
  The wiki snippet keeps the `statusLine` command `node <plugin folder>/features/statusline/cli.mjs` for the user to set (`wiki/Settings-Snippet.md`).
