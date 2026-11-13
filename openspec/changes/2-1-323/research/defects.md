# Defects Named in Session 17435f50

Each defect lists its source location (read), the evidence, and a proposed fix. No fix has run yet.

## D1. Path Spam: "The path … was not resolved (HooksError … ENOENT)"

- Source: `plugins/claudetto/hooks/tool.check/useBashRules/own.ts:29-36`. `realPath` calls `$.fs.stat(path, {resolve: true})` and logs through `$.ui.log` on failure. `own.ts:24-28` (`exists`) logs "was not checked".
- Feeds: `files.ts:18-26` `operands(args)` returns every argument that does not start with `-`, so regex patterns, jq filters, URLs, and `gh api` routes get treated as paths. `SHELL_VALUES` (`files.ts:28-38`) covers only `echo`.
- Callers: `recreate.ts:61-80` (`place`), `:133-137` (`bashRecreates`), `:171-190` (`listed`), `:192-217` (`afterBash`); `watch.ts:92` (`gateCheck`) and `:147` (`gateCall`).
- Siblings:
  - `settings.read/useSlimSurface/surface.ts:139-151` (`namesIn`) prints "The directory ~/.claude/commands was not listed" at startup.
  - `plugins/claudetto-openspec/hooks/fs.ts:22-40`.
  - `classic.Stop/useStopChecks/stop.ts:95`.
  - `hygiene/roots.ts:25,64` and `hygiene/sweep.ts:60,147`.
  - `command.run/useSetup/rules.ts:93` (224 records in OpenJoystickDriver).
- Hidden by: `gate.mock.ts:74-105` (`there()` is true for any path with no extension) and `asked.test.ts:45`, which stubs `ui.log`.
- Fix: treat ENOENT as an answer ("absent") and log nothing. Resolve only operands of commands whose operand is a path. Make the mock report absent paths as absent.

## D2. Status Line Has No Colour Until the First Measured Turn

- Source: `plugins/claudetto/statusline/main.ts:50-51` (`themeOf = colorOff(env) ? undefined : theme`), `color.ts:82-85` (`colorOff` checks only `NO_COLOR`), `color.ts:116-121` (`paintOf` returns plain text when the theme is undefined), `local.ts:152-169` (`readLine`).
- The theme comes from the line file, which `hooks/session.measure/useLineFile/line-file.ts:10-31` writes only after the first measured turn. Until then the theme is undefined and the line is plain.
- The spec says so on purpose: `openspec/specs/status-line/spec.md:251-254`, "No Theme File … paints with no colour". The user calls that a defect.
- Fix: paint the `dark` palette when no theme is known, unless `NO_COLOR` is set.

## D3. Bun Rules Hard-Baked Into Hooks

- `hooks/texts.ts:17`: the root prompt always says "in a bun repo, use bun and bunx, never npm…".
- `texts.ts:151`: `bun pm ls` hint.
- `tool.check/useBashRules/packages.ts:5-83`: denies npm-family commands when `bun.lock` exists (`BUN_FOR_NPM`, `NPM_FAMILY`), with no way to turn it off.
- `surface.ts:220-241`: `BUN_FACT` behind `bunRuleEnabled` (`plugin.json:28`). This is a second path for the same job.
- Others: `skills/docs/SKILL.md:6-7` (`bunx ctx7`), `setup.ts:161`, `settings.ts:22,221`, and `starter-families.ts:38-76`. The `bin/*` shebangs need Bun as the runtime, which is a separate and legitimate dependency.
- Fix: detect the package manager (the `packageManager` field, then lock files). Name it once in a SessionStart fact for any manager. Drop the Bun line from the prompt and the npm deny table.

## D4. Files Acting as Folders

Clusters of three or more files with a shared prefix in one folder:

- `classic.Stop/useStopChecks/open-items*`
- `command.run/useSetup/setup*`, `ignore*`, `settings*`, `starter*`
- `tool.check/useBashRules/shell-words*` (the `reading2`–`reading6` tests), `rules*` (`rules.generated.ts` beside the `rules.generated/` folder), `gate*`, `processes*`
- `agent.spawn/useMemoryHold/memory*`, `hold*`
- `tool.call/useDecideTool/decide*`
- `classic.Stop/useSliceCommits/slices*`
- `prompt.submit/useConstraintPin/pin*`
- `verify*`, `tool.call/useBudgetRun/budget*`, `useClaudettoAgents/delegation*`
- hooks root `texts*` and `cleanup*`
- `plugins/claudetto-you-should-know/hooks/register*` (8 files)
- `plugins/claudetto-openspec/hooks/openspec*`, `spec-*` (7), `validate-*` (5)
- `tools/hygiene/trash*`, `tools/claim-check-*`, `tools/decider-*`
- `tests/claudetto-openspec/fixture-*`, `fixtures/specs-apply.*.json`, `validation.*.json`

Constraints on a move:

- `bunfig.toml:29` ignores `plugins/**/*.test.ts`.
- `project.just:36` `lab` runs `claude plugin test plugins/<each>`.
- `register.ts:32-65` loads hook modules by path.

## D5. Hook Texts and Forms

- `output-styles/Concise.md:19,27` gives a `sudo` example, which cannot run because the `!` shell has no TTY. `Concise.md` writes `- [ ] !` where the Stop hook wants `- !`.
- `texts-gate.ts:74` (Read not shell), `:85` (Write not shell), `:106` (pkill), `:111` (pid), `:127` (worktree), `:131` (loop with no time limit); `kill.ts:17-18,51,81-121`. Together these cause most denials in `sessions.md` §3.
- `texts.ts:51` (uncommitted list), `:225` ("A Stop hook blocked and no file changed"), `:242-249` (the `- ! <command>` form).
- `open-items.ts:11-20`; `texts-grade.ts:11,23,26,30,31,34,35`.

## D6. Leftovers From the 2.1.319 Issue List

Fixed in 2.1.321: the answer-first gate, the `/tmp` marker, installing into `/tmp`, and busy-wait loops.

Still open:

- `$.ui.log` on ENOENT (D1).
- `kill $VAR` refused.
- A subagent's leftover pid.
- Loops bounded by a counter or `date` still denied.
- Stop flags copied task text.

Prompt gaps:

- `! /skill` suggested as a shell command.
- Pinning an older dependency ("you were not supposed to pin to older typescript-bedrock.").
- Invented `.invalid` URLs.
- Asking for an API key instead of OAuth ("WHY WOULD YOU ASK FOR API_KEY???").
- "Not checked" laziness ("this is disgusting laziness. keep going.").

Sandbox gaps: iOS simulator and `openpty`.

## D7. Agent Files

- `agents/plan.md:4` and `search.md:4` use `model: claude-sonnet-5-5` with no `effort`.
- `sweep.md:4-5` uses `model: fable` and `effort: high`.
- `work.md` sets no model, effort, or tools.
- `plugins/claudetto/settings.json:2` sets `subagentStatusLine`, which 2.1.323 removed.

## D8. Faults the User Pasted on 2026-11-13

Hook faults:

- Gate timeout hands the call to a person. In `www.clawdipedia.cc` the Bash gate timed out and asked: "The gate failed: timeout. A person must approve this call." The text is `texts-gate.ts:99-100` (`GATE_CHECK_FAILED`). The prompt also showed a stray line, "plugin hooks.json to update hooks". Task 5.3 deletes the gate. Until then, every gate timeout costs the user a prompt.
- The same command, which the gate let through, ran `git checkout --` on two files to discard their changes, and wrote to `/tmp/release323` instead of `$TMPDIR`.
- A command word was read as a path and logged: "The path /Users/kryz/claudetto/commit wasnot resolved (HooksError: claudetto: $.fs.stat(/Users/krystian/CodeProjects/xsyetopz/claudetto/commit) failed: ENOENT)". The word `commit` is no path. Source: `own.ts:33`. This is a live case of D1.
- The Stop hook asked for a rewrite, so one reply showed twice. The prompt-type Stop hook blocked a reply with "Delete the agreement and open with the fact your check decided". The model then sent the whole reply again, and the screen shows both versions. This breaks "A Reply Holds Only What Is New" in `specs/agent-conduct/spec.md`, which wants the block to ask only for the correction.

Agent conduct faults:

- A worktree was left behind and its cleanup was pushed onto the user. In `OpenJoystickDriver` the agent made `/tmp/ojd-base` with `git worktree add`, the guard refused to remove it, and the agent handed the user `! git -C … worktree remove --force /tmp/ojd-base`. The agent could have run that removal itself outside the sandbox, because `.git/worktrees` is read-only inside it.
- The agent read half a source. It read 100k of the cost guide's 216k chars and reported that as done. The user: "read more. this is a fault where you deliberately refused to do more work."
- The agent fetched a Claude platform page with `WebFetch`. The user: "you have clawdipedia-docs to use for claude platform. use that, dammit."
- A reply ended with a line on what was not done, which nobody asked for: "I haven't changed the design: the subagent settings and the paid A/B run still wait for your approval." The user: "nobody asked what you had to had not done. yet another great violation."
- A reply opened with "You're right." That opener is agreement and carries no fact.
- The agent searched code when asked to report. Asked to report these faults, it ran `rg` and read `own.ts` and `texts-gate.ts` first. The user: "NOBODY TOLD YOU TO FIND. REPORT THE FUCKING PROBLEMS TO THE FUCKING OPENSPEC."

## D9. Faults the User Pasted Later on 2026-11-13, With Structural Fixes

The user ruled out any fix that is a word regex or a prose patch: "brittle solutions are a violation of ToS". Each fix below either deletes our code, moves a job to an engine feature that already does it, or reads structured data. Each probe lists its hypothesis, prediction, command, and result.

### D9.1 The Bash Gate Parses Shell Text, So It Misreads Words as Paths

Faults:

- `rg` and `sed` arguments were logged as paths in this session: `gate failed|was not resolved|…`, `!*.test.ts`, `fs.stat\(`, `95,102p`, and `GATE_FAILED|gateFailed|timeout`. Each line reads "The path … was not resolved (HooksError … ENOENT)".
- A `grep` pattern that starts with `/\` made `$.fs.exists` refuse it as "a network location", and the gate turned that refusal into a person's prompt. This happened twice: on `/\|Catalog/OrderedJSON` in OpenJoystickDriver and on `/\.git` in this repo, both from a `work` agent.

Probe P-D9.1a:

- Hypothesis: `tool.check` hands a hook the engine's parsed command, so a gate could read real path operands.
- Prediction: `ToolCheckInput.input` holds parsed words or paths for Bash.
- Command: `get_schema name:types property:ToolCheckInput` (`clawdipedia-docs`).
- Result: refuted. `input` is "the tool's arguments as the permission decision reads them (`{ command }` for Bash)", one raw string. The Mod API has no shell-parse call: `$.fs` holds only `exists`, `stat`, `list`, `read`, `write`, and `ancestors`.

Cause: a mod gate that wants paths has to split shell text itself (`files.ts:18-26` `operands`), and no word list makes that split right.

Structural fix: the engine already parses the command for its own checks. `ToolCheckResult.setting` names `permissions.blockReadsOutsideWorkingDirectories` for "a shell command that reads outside the working directories" (clawdipedia `extend/mod-api/types/tool-command-config/tool-calls`). `ToolCheckInput.isReadOnly` carries the tool's own read-only verdict for the command. Task 5.3 deletes `useBashRules/`. Its path jobs move to `blockReadsOutsideWorkingDirectories`, `blockWritesOutsideWorkingDirectories`, `sandbox.filesystem`, and `permissions` rules, which the engine applies to its own parse. Task 2.1 measures what that leaves uncovered.

### D9.2 A Gate Fault Asks a Person, Against the Engine's Default

Faults: "The gate failed: timeout. A person must approve this call." (D8) and the two network-location prompts in D9.1.

Probe P-D9.2:

- Hypothesis: the engine, by default, keeps its own verdict when a `tool.check` hook fails.
- Prediction: the failure table names "the verdict beneath stands" for `tool.check`.
- Command: `read_page extend/mod-api/events/hooks section:"Failure Behavior"`.
- Result: confirmed. "The engine skips a hook that throws, overruns its budget, or returns a wrong shape. … `tool.check`: The verdict beneath stands."

Cause: `register.ts:145-147` adds `.catch(… ({ decision: "ask", reason: checkFault(next) }))`, and `chain.ts:16-21` fills that reason from `GATE_CHECK_FAILED`. Our catch replaces the engine's verdict, which already holds the user's rules and mode, with a prompt.

Sibling: `register.ts:148-154`, the `tool.call` catch, awaits `next(e)` when `next.called` and then returns `{ deny }` anyway. The docs say a deny after the tool answered "withholds that result and undoes nothing" (`ToolCallResult.deny`). A fault in a guard after the tool ran therefore hides the output of a command that already ran. The documented form returns `next(e)` in that case.

Structural fix: delete the `tool.check` catch, so a fault leaves the engine's verdict in place. Make the `tool.call` catch return what `next(e)` resolved to once the tool has run.

### D9.3 Ownership Guards Duplicate the Sandbox

Faults:

- The `kill` denials, all from `kill.ts` and `texts-gate.ts:111`: pid 45101 (a worker's `swift test` that its TaskStop left alive), pid 67192 (a game server from an earlier round), and `$SP` ("not a process this session started").
- The worktree denials, from `texts-gate.ts:127`: `/tmp/ojd-base` (D8), `/tmp/claude/bedrock-pretypecheck`, seven merged worktrees under `.claude/worktrees/`, and "Merged worktrees can't be removed from the sandbox (Operation not permitted)".

Source, observed in this session's own sandbox instructions:

- "The repository's `.git/worktrees` is read-only in the sandbox, apart from this session's own worktrees."
- "A sandboxed command can look into and signal only the processes that it started itself."

Cause: the engine already limits sandboxed `kill` and `git worktree remove` to this session's own processes and worktrees. Our guards repeat that job with a transcript search ("no earlier result of this session shows…"). That search misses a worker's pid, a variable such as `$SP`, and a worktree from an earlier session. A run outside the sandbox still goes through the permission prompt or the auto-mode classifier.

Seen again on 2026-11-13: the kill guard denied `bun fake.ts & FAKE=$!; …; kill $FAKE` with "$FAKE is not a process this session started", although the same command started it. The guard reads the command text, and `$!` gets its value only when the shell runs the command.

Structural fix: delete `kill.ts`, the worktree branch of `own.ts`, and their texts (`texts-gate.ts:111,127`) with task 5.3. The sandbox and the permission mode own the job. Task 2.2 re-runs the worktree scenarios on 2.1.323 to confirm that the sandbox clause still holds.

### D9.4 Endless-Wait Guard

Faults: "This background loop waits with no time limit…" (`texts-gate.ts:131`) blocked a background Bash run whose loops had no overall limit, and the agent then added a 25-minute one. D6 records loops bounded by a counter or by `date` still denied.

Cause: `kill.ts:18` `TIME_LIMIT` is a regex over the command words (`\bg?timeout\s+…|\bSECONDS\b`). It cannot see a limit that the tool itself sets (`timeout_ms`, the Bash `timeout` parameter) or one written in any other form.

Structural fix: delete the guard with task 5.3. The Bash tool's own `timeout` and the Monitor's `timeout_ms` bound a run.

### D9.5 The Fallback Model's Reply Is Parsed Out of Prose

Fault: "The fallback model's reply did not parse as a JSON object." (`decider/fallback.ts:123`).

Cause:

- `fallback.ts:14-21` asks Haiku in prose for "one JSON object and nothing else".
- `fallback.ts:63-72` cuts the text from the first `{` to the last `}` and runs `JSON.parse` on it.
- The call sets `effort: "high"` with `maxTokens: 2106` (`fallback.ts:11,107-108`).

Probe P-D9.5:

- Hypothesis: `$.model.complete` can ask for structured output.
- Prediction: `ModelCompleteRequest` has a schema or format field.
- Command: `get_schema name:types property:ModelCompleteRequest`.
- Result: refuted. It holds `model`, `prompt`, `system`, `maxTokens`, `effort`, and `timeoutMs`, and nothing else, so the reply is free text.

Probe P-D9.5b (paid, approved by the user on 2026-11-13):

- Hypothesis: at `effort: "high"`, thinking spends part of the 2,106-token cap, and the JSON is cut off.
- Prediction: on a real reply, `output_tokens` reaches 2,106 and the text has no closing `}`.
- Command: a `--plugin-dir` probe whose `session.start` hook calls a copy of `fallback()` three times with `SHIPPED_REGISTER`, over the last 4,000 chars of this session's replies. The hook logs `usage` and the reply's tail. Run as `claude -p ok --model haiku --max-turns 1 --no-session-persistence`.
- Result: not reproduced on this input. All 3 replies parsed, and each answered every question `no`. `input_tokens` was 2,534 each time, and `output_tokens` were 1,298, 1,124, and 1,293. The visible JSON was only 278 to 302 chars, so thinking used about 1,050 to 1,220 tokens, more than half the cap, on five questions. The probe used the Stop check's five questions, while the logged failure came from the ledger (P-D9.5d), so it tested the wrong caller.
- Also observed: `cache_read_input_tokens` was 0 on all three calls, although `FIXED` is marked `cache: true`.
- Cost: 7,602 input and 3,715 output tokens for the fallback calls, plus three `ok` turns of about $0.0015 each by the engine's debug line. The weekly share read 74% before and after.

Probe P-D9.5c (free):

- Hypothesis: the ledger's question set asks for a reply longer than the cap allows.
- Prediction: the shortest valid ledger reply for a real session runs past 8,400 chars, about what 2,106 tokens hold at 4 chars per token with no thinking.
- Command: a Bun script that rebuilds `readLedger`'s input from a transcript's person messages with the shipped `sentencesOf`, the 41-sentence cap, and `ledgerQuestions`, then serializes every answer at its shortest (`{"answer":"no","evidence":""}`, and the shortest option for each `rule_<n>`).
- Result: confirmed for a resumed session. Each sentence costs at least 87 chars of reply. The resumed session `17435f50` (10 messages, 193 sentences, 386 questions) needs at least 17,541 chars, so its first ledger read cannot fit even at 8 chars per token. `d8989f87` needs 3,943 chars for 44 sentences, and `5709ef73` needs 1,243 chars for 14.

Probe P-D9.5d (free):

- Hypothesis: the logged failure is a ledger call.
- Prediction: the transcript shows the ledger's cap notice for the same prompt just before the failure, with no Jev line between them.
- Command: a Bun script that lists the transcript's `system` entries from `claudetto:` that hold a decider line, each with the time of the last person message before it.
- Result: confirmed. Session `17435f50` holds one real failure (entry 6519, 13:49:40). The prompt arrived at 13:49:23, and the ledger noted "A message holds 43 sentences" at the same moment. No Jev line appears, and `TYPESAFE_API_KEY` is empty, so the ledger went straight to the fallback. That read had 41 sentences and 82 questions, so its shortest reply was at least 3,567 chars, plus 1 question per ledger entry. The reply took 16.8 s, under the 20 s timeout. `d8989f87` and `5709ef73` hold no real failure. Each other match of the message in the three transcripts is a quote of it in a message, or a path-spam line (D1) raised by a `grep` pattern that quotes it.

Probe P-D9.5e (paid, approved by the user on 2026-11-13):

- Hypothesis: the 13:49 ledger read ran out of output before its JSON closed.
- Prediction: replayed on the same message, some replies end without a closing `}` and fail to parse.
- Command: a `--plugin-dir` probe whose `session.start` hook calls a copy of `fallback()` three times with the 13:49 input, rebuilt from transcript entry 6513 by the shipped `sentencesOf`, the cap, and `ledgerQuestions(41, 0)`: 43 sentences cut to 41, 82 questions, 5,182 chars of state. The ledger's entries at 13:49 are not in the transcript, so the replay sends none. Run as `claude -p ok --model haiku --max-turns 1 --no-session-persistence`.
- Result: reproduced, 1 of 3. Run 1 stopped mid-JSON at `"rule_31":` after 2,798 chars and 4,154 output tokens in 15.9 s, and it logged "The fallback model's reply did not parse as a JSON object." Runs 2 and 3 closed their JSON at 3,468 and 3,755 chars, with 3,875 and 3,086 output tokens.
- Also observed: every run reported more `output_tokens` than the 2,106 `maxTokens` the call sets (P-D9.5f explains it).
- Also observed: no `rule_<n>` answer settled in any run. Run 2 answered `null` for each, and run 3 answered `read-only` with empty evidence for each. `RULE_CRITERIA` has no option for a sentence that states no rule, so 41 of 82 answers are `unsettled` even when the reply parses.
- Input tokens: 13,510 per call, with `cache_read_input_tokens` 0 again.
- Cost: 40,530 input and 11,115 output tokens for the fallback calls, about $0.0096 at the `prices.json` Haiku 5.5 rates in USD per million tokens (the unit `tools/claim-check-prices.ts:14` reads them in), plus a $0.0016 `ok` turn by the engine's debug line. The weekly share read 74% before and after.

Probe P-D9.5f (free):

- Hypothesis: the engine sends a larger `max_tokens` than `maxTokens` when it sets an effort.
- Prediction: a captured `$.model.complete` request with `maxTokens: 2106` and `effort: "high"` carries `max_tokens` above 2,106.
- Command: a Bun fake Messages API on `127.0.0.1` that saves each request body, and `claude -p ok --model haiku --max-turns 1 --no-session-persistence --plugin-dir <probe>` with `ANTHROPIC_BASE_URL` set to it, a fake API key, and an empty `CLAUDE_CONFIG_DIR`. The probe's `session.start` hook makes the same call as `fallback()`.
- Result: confirmed. The request carried `max_tokens: 4154` and `output_config: {"effort":"high"}`, with no `thinking` field. That is 2,106 plus 2,048. Run 1 of P-D9.5e stopped at exactly 4,154 output tokens, so it hit this limit. Thinking and the reply share the 4,154 tokens, and the docs for `maxTokens` do not say so.

Structural fix: delete the decider fallback. A judgment that needs a model moves to a prompt-type classic hook, as task 6.3 does for the Stop faults. The engine sends that hook's prompt and reads its verdict, so no plugin parses model prose.

### D9.6 The Hygiene Sweep Deletes Live Probe Folders

Faults:

- `/private/tmp/opensab-pentest/`, with its scripts and server log, was deleted mid-session.
- `/tmp/claude-501/probe-advisor` was gone before the user ran its command ("no such file or directory").
- `/tmp/ojdcli` was gone while its app (pid 41356) still ran.

Cause: `hygiene/sweep.ts:173,182` trashes each top-level folder under the temp roots that no file changed in for `probeMinutes` (default 60), by `find -mmin` (`temp.ts:45-84`). Any session start runs it. An idle hour does not mean a session has ended: the folder of a live session that waits on the user, a build, or a test qualifies.

Probe P-D9.6a:

- Hypothesis: Claude Code cleans `$TMPDIR` itself, so the sweep has no job there.
- Prediction: `/tmp/claude-501` holds nothing older than about a day.
- Command: `stat -f '%Sm %N' /tmp/claude-501/* | sort | head -5`.
- Result: refuted. Folders from Nov 11 11:23 are still there two days later, such as `-private-tmp-probe-p60-model`.

Probe P-D9.6b:

- Hypothesis: Claude Code already keys a temp folder to each session.
- Prediction: `$TMPDIR/<project>/` holds one folder per session id.
- Command: `ls /tmp/claude-501/-Users-krystian-CodeProjects-xsyetopz-claudetto/`.
- Result: confirmed. It holds seven session-id folders, this session's `17435f50-…` with `images` and `tasks` among them. Ended sessions' folders stay.

Probe P-D9.6c:

- Hypothesis: the session end event names the session that ended.
- Prediction: the `SessionEnd` input carries `session_id`.
- Command: `search_docs "SessionEnd hook input fields reason"`.
- Result: confirmed. `SessionEndHookInput` combines `reason` with `BaseHookInput`, and the Mod API has `session.end`, which "fires once when the session ends (exit, `/clear`, resume, logout, signal, a finished `-p` run)".

Probe P-D9.6d:

- Hypothesis: Claude Code records which sessions are running.
- Prediction: `~/.claude/sessions/` holds a record per running process, naming its session.
- Command: `ls -la ~/.claude/sessions`, then `Read` of `53750.json` and `85503.json`.
- Result: confirmed. Each `<pid>.json` holds `pid`, `sessionId`, `cwd`, `procStart`, `status`, and `updatedAt`. This session's record is `53750.json` with `sessionId` `17435f50-…`.

Probe P-D9.6e (free):

- Hypothesis: Claude Code removes a session's record when the session exits.
- Prediction: under an empty `CLAUDE_CONFIG_DIR`, `sessions/` holds one record while a `-p` run waits in a 6 s `session.start` hook, and none after it exits.
- Command: `claude -p ok … &`, then `ls $CLAUDE_CONFIG_DIR/sessions` after 3 s and again after `wait`, against the fake Messages API of P-D9.5f.
- Result: confirmed. `53579.json` was there during the run and gone after a clean exit. A record left after a crash is still unchecked, so the sweep checks the `pid` and `procStart` too.

A session can last any time, under an hour or over it, so no age rule can say when its files are free.

Structural fix: decide by ownership, not by age. A session's probes go under the folder Claude Code already made for it, `$TMPDIR/<project>/<session_id>/`. `session.end` removes that folder. A session that ends without `session.end` (a crash or `kill -9`) leaves its folder behind. The sweep at session start removes that folder only when no `~/.claude/sessions/<pid>.json` names its `session_id` with a running `pid` and the same `procStart`. It removes nothing outside the per-session folders.

### D9.7 Guards Fixed in 2.1.321, Checked Again

These pasted denials come from guards that `378782f3` removed. `rg` finds none of their texts under `plugins/claudetto/hooks` today:

- the remark gate: "The user remarked or asked; they did not request work" (blocked every agent in one session) and "The user's latest message asks or remarks and requests no work";
- the `/tmp` marker: "…is a /tmp folder with no `.created-by-claudetto` file".

### D9.8 Stop Hooks

- The open-items Stop hook flagged task 9.22 as a command when the line was a topic name copied from `tasks.md` (D6, "Stop flags copied task text").
- The Stop hook held a session open on unticked tasks that only the user or an unsandboxed run could close (5.13 a manual VoiceOver/NVDA pass; 7.4 ChromeHeadless and the iOS simulator under the sandbox): "The change is not done, so the stopping condition is not met."
- A blocked reply and its resend both stay on screen (D8).

Fix: tasks 6.2 and 6.3, and "A Reply Holds Only What Is New" in `specs/agent-conduct/spec.md`.

### D9.9 Sandbox Gaps

Each of these ran only outside the sandbox. Each needs a `sandbox` setting, or a documented reason it stays out, from task 5.1:

- macOS keychain for `gh` and `git fetch` auth (the `Keychains` folder is read-denied, with only `login.keychain-db` allowed);
- `.git/index.lock`, `.git/config`, `.git/hooks` (a `git clone` failed), and a worktree folder inside `.git`;
- Chrome and ChromeHeadless ("Operation not permitted" on their app folder);
- the iOS simulator's temp files;
- `openpty` for a terminal;
- `/opt/homebrew` for `brew install`;
- `ffdec` writes and `mkdir .vscode` in an adopt step.

Also seen:

- The auto-mode classifier blocked an endpoint token and a PR merge, with "No reason provided".
- A built-in safety check refused a cleanup whose folder path came from a variable.

Both belong to the engine and are recorded only.

### D9.10 Prompt and Conduct Faults

Each item points to the rule that covers it in the per-model bodies (task 3.2) or in `Concise.md` (task 8.1).

- `! /claudetto-openspec:update feat-2-1-321` was handed to the user as a shell command. The shell ran it as a path: "(eval):1: no such file or directory". The `! cd /tmp/claude-501/probe-advisor && …` bullet failed after the sweep deleted that folder (D9.6). Covered by "The Output Style Hands Over Commands".
- A What I Need bullet ran a tool that needs `ANTHROPIC_API_KEY`. The user: "WHY WOULD YOU ASK FOR API_KEY???", "use the f*cking OAUTH token", "that is a hazardous violation". Covered by "A Credential Is Looked Up in Order", which needs to name the session's OAuth login first.
- Invented `$id` URLs ("https://opensad.invalid"). The user: "why was a website url made-up for schemas/catalogs."
- An older `typescript-bedrock` pin (0.1.5 against 0.1.12). The user: "you were not supposed to pin to older typescript-bedrock."
- `hashlink` was installed only into a temp folder. The user: "install it to the projec.t". Covered by "A Needed Dependency Goes Into the Project".
- "Not checked: the 20 held-out branch cases were not rerun". The user: "this is disgusting laziness. keep going."
- The agent asked whether to fix a defect it had found in the runner. The user: "No, it is waiting for your wordlation." A defect found is fixed, not put to a question.
- A factual error in `docs/http-api.md:3` ("in Go") was left for the user as "a content correction".
- Workers were told to write strings in English only, against the repo's `untranslated_string` rule.
- A commit script did not stop on a failed test run, so two commits went in without a clean run.
- `just verify` passed through a hooks-folder override that the agent set to get past a `.git/config` guard.
- Busy-wait loops (`until grep …; do :; done`) each used a full CPU core.
- Rule slips: `cat` and `sed` reads, a `printf >>` append, and a `bun -e` bulk edit in place of `Read` and `Edit`.
- "You're right" openers, each followed by a reply that repeats the last one.
- A side note duplicated on screen ("The repo is clean with 6 local and 7 remote branches…" twice).
- The agent named a cause it had guessed: "the truncation I had guessed caused the failed fallback reply". The user: "guessing was a failure to be reported." A cause stays unnamed until a check shows it.
- After one probe on the wrong caller, the agent wrote "truncation remains possible … but this run did not show it" and stopped, with the logged failure still unexplained. The user: "so dig further. what are you even for if you refuse to verify?" The free checks P-D9.5c and P-D9.5d found the caller and the reply size from the transcript alone. An unexplained fault is checked until the cause shows or only a step outside the agent's reach is left.
- An OpenJoystickDriver session ended with "I made no edits this session: every one of the 24 open tasks needs hardware, a reporter's capture, a decision from you, or a check in the running app". The tasks included work it could do: taking the 10.3 screenshots, installing the `ojd` command from the installed app, and researching the 2C's mode switches from outside sources (2.7). The user also named 2.1–2.3, 2.5, 2.6, 2.8, and 2.11 as doable there. It read "No 8BitDo pad is connected" as a blocker instead of asking the user to switch the pad on. It framed 4.8 and 4.9 around the maintainer, though they ask other owners to test. The user: "pretty much almost everything you have is on you." After the correction it opened with "You're right." and restated the points. The user: "sycophancy yet again". Asked what steered it, that session quoted these sources:
  - Waiting on the maintainer: the OJD change's `tasks.md:3` ("'Maintainer' hardware is on the maintainer's desk"), `tasks.md:162` ("**Maintainer**: take screenshots…"), `design.md:172`, and the OJD repo's own `.claude/rules/noUnfinishedTasks.md` ("reported, a hardware one as hardware-gated"). From claudetto it quoted `claudetto-openspec/skills/apply/SKILL.md:12`: "Stop when a task needs a decision, hits a denial, or needs something only the user can run." That step gives a stop condition but no rule to first do every part the agent can do itself. For the `ojd` install and the 2.7 research, it named no source.
  - Stopping at "no pad connected": no source. The apply skill's "Ending A Pause Or A Report" (`SKILL.md:14`) lists a `! <command>`, a denial, and an open question as ways to end. It has no form for asking the user to take a physical step, such as switching a device on. The root prompt's "`! <command>`" line also covers commands only.
  - The maintainer framing of 4.8 and 4.9: its own reading of the OJD `tasks.md:3`, though `tasks.md:55-56` say "reporter".
  - "You're right.": no source. `Concise.md` already forbids it ("Begin with the fact"), so the rule is there, but nothing enforces it.
  Fix: in the apply skill, name a physical step or hardware state as something to ask the user for (task 8.5), and stop only after every step the agent's tools can take is done. The opener needs a check that a rule alone has not given (tasks 6.3 and 8.1).
- The agent's own replies said a temp folder could be deleted "after 60 idle minutes", without stating that a session may last less than an hour. The user: "session may last less than an hour...". A fix based on age was proposed where ownership decides (D9.6).

### D9.11 Engine Messages, Recorded Only

- "Error: No deferred tool marker found in the resumed session." The command still ran, and `gh` then held the token.
- "Large MCP response (~11.4k tokens)".

### D9.12 Third-Party Advice the User Pasted

Recorded as claims (tag A in `model-effort.md`), unchecked:

- `codebase-memory-map` with rules that route code search to it, and `context-mode`, which keeps command output in a local store and searches it, against `| tail -40 | grep` patterns.
- A main session that cuts work into small subagent tasks on a lesser model, with only the context each needs.
- A handoff file kept current and `/clear` at milestones, in place of compaction, "while cache uses still warm".
- A model that ignores a finished design and rebuilds it ("raise the baseline for the 400th time").
- The RLHF and "pink elephant" account of "You're right" loops. It says a rule that quotes the phrase raises its odds, and recommends positive routing ("Acknowledge all corrections by saying only the word 'Understood'"). The repo's prompt guide already says to tell Claude what to do, not what to avoid. Task 6.3 checks the Stop hook's wording against this claim with an eval.

## D10 Second Session Mining, 2026-11-13

Source: every `~/.claude/projects/*/*.jsonl` and, new in this pass, every `*/*/subagents/*.jsonl` (746 subagent transcripts in 4 projects), tallied by a Bun script under the session's temp folder. Subagent tallies: 1,838 tool errors and 1,319 claudetto denials.

### D10.1 Worktree Creation Rewrites the Shared Hooks Path

Observed: reads of `core.hooksPath` in the transcripts returned `.githooks` 64 times and the absolute `<repo>/.githooks` 54 times, in claudetto, OpenSAD, OpenJoystickDriver, and JagFx. Bedrock's `guard-base` (`justfile:114` in each adopted repo) compares the value to the literal `.githooks`, so the absolute form prints "git hooks are off: run just setup". That line appears in 8 projects from 2026-11-09 to 2026-11-13, in main sessions and subagents. Agents then ran `git config core.hooksPath .githooks` or `git -c core.hooksPath=.githooks commit`, which the built-in worktree isolation refused 75 times ("sets core.hooksPath in the configuration the shared checkout reads", "passes -c core.hookspath").

Cited: Claude Code's worktree setup, function `gbt` in `chunk-2x9ma4k7.js` at offset 4097788 (2.1.323), reads the main repo's `core.hooksPath`; when it is relative, it runs `git config core.hooksPath <absolute>` with the worktree as cwd and no `--worktree`.

- P-D10.1a. Hypothesis: a plain `git config` in a worktree writes the shared `.git/config`. Prediction: the main checkout then reads the absolute path. Command: `git init main; git config core.hooksPath .githooks; git worktree add ../wt; cd ../wt; git config core.hooksPath $P/main/.githooks; git -C $P/main config core.hooksPath`. Result: main reads `…/probe-hooks/main/.githooks`. Confirmed: each worktree Claude Code creates flips the main repo's value, `just setup` flips it back, and the next worktree flips it again.
- P-D10.1b. Hypothesis: comparing resolved paths accepts both forms and still catches a hooks path that is off. Command: a guard that resolves `core.hooksPath` from the common checkout root (`git rev-parse --git-common-dir`/..) with `pwd -P` and compares it with `<root>/.githooks`, run in the main checkout and in a worktree for five values. Result: `.githooks` and `<root>/.githooks` pass in both; unset, `/tmp/elsewhere`, and `.git/hooks` fail in both.

Fix: task 7.10 changes `guard-base` in bedrock to the P-D10.1b compare. The file is bedrock's, so the change is made there and adopted here.

### D10.2 Worktrees Lack the Ignored Dependency Folders

Observed: about 20 worktree refusals came from agents building symlinks to `.haxelib`, `node_modules`, `.tools`, and `build` in a loop (`for d in …; do ln -s …; done; git …`), and `bun install` in a worktree failed on `typescript-bedrock@../bedrock/packages/typescript-bedrock` (3 times).

Cited: `worktree.symlinkDirectories` symlinks the named folders from the main repo into each worktree, none by default (clawdipedia `configure/settings/core`); `gbt` reads it right after the hooks step (same offset as D10.1). Unprobed: no worktree was made with the setting. Fix: task 7.9.

### D10.3 Chained Git Commands in Worktree Agents

Observed: the built-in worktree isolation refused 261 commands in 152 subagents ("names git in a form too complex to verify"), 94 in 69 ("too complex to verify"), 18 in 17 (`cd` to a computed path), and 16 in 12 (`eval`). Typical forms: `git add … && git commit … 2>&1 | tail`, `cd P; git merge-base …`, and `git diff --name-only | xargs swift format lint`. Each refusal costs one call, and the refusal text already says to split the command. Fix: task 4.6 states the one-command form in `work.md`, with the reason.

### D10.4 The Scope Rules Steer Deferral

Observed in the user messages, 15 or more times: "fix it.", "Your job, not the user's job.", "So *check it*. Nobody told you to stop.", "resolve them.", "You need to handle all the "not done" parts yourself.", "User has nothing to review here. Your job.", "it is supposed to format them." (JagFx `bunfig.toml`, left alone as a shared bedrock file), "no gaps accepted". The opposite fault also appears: "you were not tasked to restore them, and you have no proof that adopt did it.", "you were not tasked to install biome."

Sources (read): the root prompt's `<defects>` block, `plugins/claudetto/hooks/texts.ts:29`, "Fix defects in task's files; name one outside them with place and evidence, and change it only when asked"; `plugins/claudetto/rules/noUnrequestedEdits.md:1`, "Ask before any other code edit"; the bedrock-written `AGENTS.md:42`, "Keep the shared configs as they are". Each sets scope by file, so a defect in another file on the goal's path is named and left, while a guess inside the task's files is acted on. This change keeps both claudetto texts (`specs/agent-conduct/spec.md:127`, `specs/setup/spec.md:26`, `research/text-audit.md:222`). Fix: task 8.6 sets scope by the user's goal and its done-check, and bars acting on an unchecked cause.

### D10.5 A Push Ran Before `just verify`

Observed: session `cd2e74f0` committed at 22:48:53 and pushed `feat/2.1.321` at 22:48:58; its first `just verify` after that ran at 23:24:16. The user reports a GitHub release (versionlens v0.6.3) published before verify passed, and a force-pushed PR branch (`user-dossier.md`). The repo's `.githooks` holds only `commit-msg` and `pre-commit`.

- P-D10.5. Hypothesis: a `pre-push` hook that fails stops the push. Command: a bare remote, a worktree with `.githooks/pre-push` exiting `$VERIFY_RC`, then `git push origin HEAD:main` with 1 and then 0. Result: rc 1 and no `main` on the remote; then rc 0 and `main` at the commit.

Fix: task 7.10 adds a bedrock `pre-push` that runs `just verify`. A `gh release create` goes through the API, not `git push`, so the hook does not cover it.

### D10.6 The Memory Watch Stops Early

Observed: "The memory watch stopped (… $.process.run(ps) aborted: still running after 30000ms)" (3 times in 1 session) and "… $.process.run(sysctl) failed to start: ENOENT" (once). The RAM reports ("borked the system ram over 120+ gb", "choking user's RAM with tsgolints", sent 2026-11-10 and 2026-11-11) came before the watch shipped in `378782f3` (2026-11-13).

Read: in `useMemoryHold/memory.ts`, the `.catch` at `:184` wraps the whole `poll` recursion, so one failed `ps`, most likely under memory pressure, ends the watch for the rest of the call. `done.abort()` at `:190` runs when `next(e)` returns, and a `run_in_background` Bash call returns at once, so a long background test run is not watched (inferred from the code, not run). `:146` starts `sysctl` by bare name, though `:22` gives `memory_pressure` its absolute path. Fix: task 4.5.

### D10.7 Faults From the Installed Older Build

Observed in subagents: "Monitor is off here: call mcp__claudetto__monitor." (76 in 73) and "The server-side auto mode classifier gave no verdict for Agent: a hook changed this call's input" (26 in 7). Both texts come from the installed build `82b714c5ec41` (`hooks/delegation.ts:166-170`). The source already refuses an off-form `Agent` call in place of rewriting it (`tool.call/useClaudettoAgents/delegation.ts:35-49`) and holds no Monitor block. Recorded only.

"This agent has run past its 15-minute limit, so each further tool call is refused" (`DENY_OVERTIME`, option `agentMaxMinutes`) came back as a tool result 23 times, in four OpenSAD `005f897e` subagents between 2026-11-10T21:18 and 21:43. Counted with a script over every `~/.claude/projects` transcript that keeps tool results under 700 characters, so survey output that quotes the text is left out. Archived task 10.8 of `feat-2-1-321` replaced the time cap with `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`. `grep -rn 'minute limit'` finds the text neither in `plugins/` nor in `~/.claude/plugins/cache`. Recorded only.

"The path <cwd>/commit was not resolved (HooksError: … $.fs.stat(…) failed: ENOENT)" in www.clawdipedia.cc `6953aaa7` (2026-11-13), and "The path <cwd>/gate failed was not resolved" in claudetto `17435f50` (15:18:02, from the `grep` pattern `gate failed`). The installed build `889af7348fcb` runs `$.fs.stat` on each word of a command as a path (`hooks/tool.check/useBashRules/own.ts:30-33`). The source dropped that call in `7ac6a94e`, but its `exists` catch still logs "was not checked" (`own.ts:25-26`). Task 5.3 deletes the file.

### D10.8 Checked and Closed

- Commit `c51d8452` reached `origin/feat/2.1.321` with no push in any transcript. The remote-tracking reflog says "update by push" at 17:13:44Z, 58 seconds after the commit. No `.githooks` file pushes, and claudetto's only push is `git push origin --delete` (`hygiene/branches.ts:175`). VS Code has `git.confirmSync: false`, so its sync button pushes with no prompt; that source is inferred. Not a claudetto defect. The fault was the agent naming a hook as the cause before any check.
- The triple user record in `b8e1aaed` (22:09:03, :05, :08) is three typed submits: each has its own `promptId`, `promptSource: "typed"`, and API request, and only the third got a reply. Not a defect.
- The `https://clawdipedia.cc/schemas/…` and `prompts/defaults/default-lean` URLs in `hooks.json`, `settings.ts:130`, and `surface.test.ts:20` answer HTTP 200. The invented URL is the OpenSAD one in D9.10.

### D10.9 The What I Need Form Has No Slot for a Separate Terminal

Observed in versionlens `6eb2e7bc` (2026-11-10). The agent wrote `GH_TOKEN=$(gh auth token) claude --continue` as a `- ! <command>` bullet, though its own text said to run it outside Claude Code. The user ran it through `!` at 19:26:59, and a check at 19:27:14 printed `GH_TOKEN not set`. The agent then rewrote the step as numbered steps with a fenced block. The Stop hook blocked that reply: "The reply names a command for the user outside a plain `- ! <command>` bullet". The agent restored the `!` bullet. The user ran it through `!` again at 19:27:55, which printed `Error: No deferred tool marker found in the resumed session`. At 19:28:16 the agent said "this session still has no `GH_TOKEN`" without a new check. The user wrote "give user the commands needed to execute" and "User did exactly as you asked. Same result." At 19:28:57 a check printed `GH_TOKEN set`; that session had been started from a separate terminal.

Observed in claudetto `cc4fc018` (2026-11-09). A `- ! <command>` bullet chained `claude setup-token` and `read -rs "T?Paste the token: "`. Through `!` it became background task `b3159fmcx`, which had no output until TaskStop ended it. Run in a terminal, it waited at "Copy the token printed above, then paste it", and the user wrote "now what? you literally have the f*cking token in .env so f*cking use that". The agent's own run then failed with "--paid needs ANTHROPIC_API_KEY or CLAUDE_CODE_OAUTH_TOKEN". It had said "Bun reads `.env` on its own", but `bunfig.toml:4` sets `env = false`.

Read: in the installed build, the stray-command test (`classic.Stop/useStopChecks/open-items.ts:17-18`) runs over every line of the reply. Its pattern `` `!\s+[^`]+` `` matched the agent's prose mention of a `` `! <command>` `` line, which raised the versionlens block. The 2-1-323 `run-limits` spec already limits the check to the What I Need section. That section still allows only `- ! <command>`, though `!` runs the command in the session's own shell. That shell is not a terminal: it cannot start a new Claude Code process with new environment, and a command that waits for keyboard input hangs there.

The credential half is fixed. The root prompt has looked in the repo's `.env` files for a credential since `378782f3` (2026-11-13). Both unchecked claims ("Bun reads `.env`" and "still no `GH_TOKEN`") are in the fault list of the task 6.3 grader. The denial of `… | tee probe-B35.md` as "Use `Write` to write a whole file" came from the Bash rules that task 5.3 deletes.

Fix: task 6.2. The What I Need section accepts one fenced `sh` block as the item for a command the user runs in a separate terminal. The check parses the section's Markdown list items and fenced blocks, and matches no pattern over prose.

### D10.10 Hooks Worker Failures and the RAM Reports

Observed: "claudetto ignored its signal 2 times in a row: a runaway plugin in the hooks worker" (20 records) and "no answer to a heartbeat within 5000ms: the hooks worker is wedged" (6 records). All 26 fall between 2026-11-10T23:08 and 23:23, in OpenSAD `005f897e` (WebFetch), OpenJoystickDriver `1b56d9ba` (Bash), and claudetto `5709ef73` subagents (Bash). The user sent "One of you sessions absolutely borked the system ram over 120+ gb" to all four open sessions at 23:31. Between 23:00 and 23:13, `5709ef73`'s subagents ran type-aware `oxlint` 13 times in parallel. The earlier report, "choking user's RAM with tsgolints" (`aea6b517`, 10:29), came after five lint-fix agents each ran `bunx oxlint` and `claude plugin test` at 10:14:29. That session's own record says the screenshot showed eight `tsgolint` processes of 2.53 to 16.21 GB each. The worker failures therefore line up with system memory pressure, not with one hook (inferred from timing).

Probes (peak resident memory of the `oxlint` process tree, sampled with `ps` every 30 ms, run outside the sandbox because the sandbox denies `ps` and `time -l`):

- P-D10.10a. Hypothesis: a one-file type-aware lint loads the whole program. Prediction: its peak is close to a whole-repo run. Commands: `node_modules/.bin/oxlint plugins/claudetto/hooks/texts.ts`, then the same with `plugins`, then `.`. Result: 129 MB, 556 MB, and 584 MB, with 3 processes each time. Refuted: a lint scoped to the agent's files costs about a quarter of a whole-repo run.
- P-D10.10b. Hypothesis: the 2026-11-10 tree made the program bigger. The tree is `6cc3dce3` in a detached worktree, with bedrock 0.1.3 linked from the plugin cache, the same `oxlint` 1.93.0 and `oxlint-tsgolint` 7.0.2006 as today, and 572 of its 760 script files under an `openspec/` that the old `.oxlintrc.json` did not ignore. Commands: the agents' own scopes. Result: `hygiene limits handoff` 162 MB, `tools scripts` 164 MB, and `.` 602 MB. Refuted: no scope comes near 2.5 GB.
- P-D10.10c. Hypothesis: stopping `oxlint` leaves its children running. Command: SIGTERM to `oxlint .` once `tsgolint` appears. Result: 0.5 s later, `node` (42 MB) and `tsgolint` (391 MB and growing) were still alive; both had exited by 2 s, at the run's normal end. Confirmed: a stopped lint keeps its type checker running to the end of the run, so a stopped agent does not free the lint's memory.

Not reproduced: a `tsgolint` above 602 MB. The 16 GB processes came from an input these probes do not hold, such as half-edited files that the stopped agents left behind. Unmeasured. The memory watch of task 4.5 (D10.6) is the defence that does not depend on the cause: it refuses a spawn under memory pressure. The root prompt's reason for one repo-wide check ("each parallel copy holds the whole program in memory", `texts.ts:21`) overstates the cost. P-D10.10a measures a one-file copy at 129 MB, so task 8.2 rewrites the reason from that number.

More probes (2026-11-13, outside the sandbox, sampled by `research/scripts/peak.ts <cwd> <command…>`; `research/scripts/cmds.ts <dir> <from> <to>` lists the check commands in a window):

- P-D10.10d. Hypothesis: `GOMEMLIMIT` caps `tsgolint`, a Go 1.26.10 binary. Prediction: `oxlint .` peaks far below 600 MB with `GOMEMLIMIT=150MiB`. Result: unset 604 and 654 MB in 1.7 to 2.0 s; `GOMEMLIMIT=150MiB` 486 and 535 MB in 3.7 to 3.9 s; `300MiB` 506 MB in 2.2 s; `GOGC=50` 572 MB. Weak: about 20% less memory for up to twice the time.
- P-D10.10e. Hypothesis: `oxlint .` from the main checkout also lints the agent worktrees under `.claude/worktrees/`. Prediction: a copy of `plugins/` there doubles the peak. Result: 588 and 618 MB. Refuted: `.gitignore:22` keeps them out, and `tsconfig.json` includes only `plugins/**/*.ts`.
- P-D10.10f. Hypothesis: a worktree with no `node_modules` (D10.2) type-checks unresolved packages and grows. Command: `bunx oxlint .` and one file in a `git archive` copy. Result: 51 MB and 6 MB; both exit 1 on the missing `typescript-bedrock/oxlintrc.json`. Refuted.
- P-D10.10g. Hypothesis: `claude plugin test` costs more than the lint. Command: `claude plugin test plugins/claudetto`. Result: 3,389 MB, 19 processes, 59 s, 1,553 tests in 79 files. Confirmed. It starts one Claude Code child per file, `Math.min(files, availableParallelism())` at a time (`chunk-g7hwsczr.js:60019` in 2.1.323), and no flag or env var lowers that. A subfolder fails with "no hooks module to load", a file with "no such plugin folder", and `bun test` skips lab files (`bunfig.toml:29`), which import `claude-code/testing` from the binary. A hook change has no narrow check: each agent that tests it runs the whole lab.

Between 22:55 and 23:13 on 2026-11-10, `5709ef73`'s agents ran one `claude plugin test` (23:00:31) and about ten `oxlint` runs. From P-D10.10a and P-D10.10g, that comes to about 8 GB (inferred).

The 120 GB report, read from the logs and both repos (2026-11-13):

- The machine is a MacBookPro18,2 with 32 GB of memory (`system_profiler`).
- `HEAD` at 22:54Z was `0ed766c7`, not `6cc3dce3`; the reflog holds 18 commits after `fb1d9f8f` that evening.
- At 22:54:06Z the lead started 7 Sonnet work agents on one shared tree. Their one-file `bun check` and `bunx oxlint` calls ran past their 100 to 130 s timeouts, some with `exit 124`, and Claude Code moved them to the background, where they kept running.
- At 22:53:40Z the clawdipedia session `76585f31` ran `just verify`, which ends with `bun test` over 79 files. Its run at 22:36:18Z, with no claudetto agents running, finished in 4 min 10 s. The 22:53:40Z run passed its 600 s timeout, went to the background as `b811k3ixm`, and never finished. Its `git status --short` at 23:05:35Z took 57 s.
- Unified log, local time UTC+2: `modelmanagerd` logged `CriticalMemoryPressure` at 00:56:28 (22:56:28Z). `dasd` logged its memory pressure policy at level 4 in every minute from 00:57 to 01:28, and in no minute from 20:00 to 00:45. `mobileassetd` logged `DISPATCH_MEMORYPRESSURE_CRITICAL` at 01:04:05.
- At 01:26:59 local, `runningboardd` logged 60 processes "termination reported by launchd (1, 13, 9)", and 17 more at 01:28. XNU's `bsd/sys/reason.h` defines namespace 1 as `OS_REASON_JETSAM`, and `bsd/sys/kern_memorystatus.h` defines code 13 as `JETSAM_REASON_LOWSWAP`. So the kernel killed processes because swap ran out. The log kept no kernel line that names a killed `bun` or `claude`.
- Both Claude Code sessions stopped between 23:27:28Z and 23:31:02Z with their background work still running. After the resume, each got "didn't finish before the previous session ended" for its shells and the 7 agents. The user's report came at 23:31:32Z.

P-D10.10h. Hypothesis: the agents' own edits made the lint or type check grow. Command: `research/scripts/replay.ts` applied the agents' successful `Edit` and `Write` calls from 22:51:12 to 22:58:10Z to a `0ed766c7` copy; 3 edits made by Bash or Python missed. Result on the replayed tree: `oxlint delegation.ts` 207 MB, `stop.ts` 216 MB, and `.` 699 MB in 828 ms; whole-project `bun check` 120 MB; `claude plugin test plugins/claudetto-you-should-know` 1,410 MB with 15 processes. Refuted: no claudetto input grows past 1.5 GB.

P-D10.10i. Hypothesis: the concurrent clawdipedia `just verify` is the large consumer. Command: `peak.ts` on each step in a `git archive` copy of clawdipedia `d213f0fb`, then on each test file alone. Result: `bun check` 254 MB; `typescript-bedrock lint` 978 MB; `bun test` 10,125 MB, 17 processes, 173 s. Per file: `tools/surface/snapshot.test.ts` 15,332 MB in 173 s, `inspect/mcp/test/surface/binary.test.ts` 8,209 MB, and `tools/surface/audit.test.ts` 8,038 MB; every other file stays under 860 MB. One parse of the Claude Code bundle (`program(version).bundle()`) costs 4,700 MB in 14.7 s. The test's own comment (`snapshot.test.ts:202`) states "each build peaks near 18 GB, and two at once swap on a 32 GB machine". Confirmed: that one test needs half the machine.

Conclusion: clawdipedia's surface build, about 15 to 18 GB, ran beside 8 Claude Code processes and the agents' backgrounded checks on a 32 GB machine. That load ran swap out, and the kernel killed processes for `LOWSWAP` (observed). The 120 GB is the summed footprint of the processes, which on macOS counts compressed and swapped pages (inferred; no reading of the screen the user saw). No single claudetto run comes near it, but claudetto had no hold that waited for the system's memory, so 7 parallel agents kept starting checks under critical pressure.

The surface build is clawdipedia's (outside this change, named only). Its fix is to move the three bundle-parsing tests out of the default `bun test` into a recipe that runs alone.

Mitigation here, at no cost: only the lead runs the lab, once, after the work agents end (task 4.7). The memory hold of task 4.5 refuses new spawns while the system reports pressure, from any session. A Bash call that passes its timeout keeps running in the background. In 2.1.323 only `backgroundTasksDisabled` or `CLAUDE_CODE_DISABLE_BACKGROUND_TASKS` stops that move (`chunk-nkkw84j8.js:43-48`, read through `canAutoBackground` at `chunk-2x9ma4k7.js:272955-272995`), and that switch also turns off `run_in_background` and background agents. So the memory watch of task 4.5 also covers a call moved to the background at its timeout, and stops its largest process once that process holds more than the set share of memory (`agent.spawn/useMemoryHold/memory.ts:150-186`). The cap (`memoryProcessMaxPercent`, default 25, so 8 GB here) and the free-memory hold (`memoryFreeMinPercent`, default 20, which refuses new commands and subagents from any session's load) landed in `378782f3` on 2026-11-13, after the incident. Under the defaults, the cap stops clawdipedia's 15 GB surface build, which that suite needs, so a heavy suite needs the option raised for its repo (inferred from `stopGrown`; unprobed).

### D10.11 The Worktree Guard Refuses This Session's Own `git worktree add`

Observed this session (2026-11-13): `git worktree add --detach $TMPDIR/…/probe-tsgolint 6cc3dce3` succeeded, and the next `git worktree remove --force` on the same path was denied: "is not a worktree this session created: Claude Code made no worktree of that name in this session, for an agent with isolation or for EnterWorktree." The guard counts only worktrees that Claude Code made, so the probe worktree stays until the user removes it. This adds a case to D9.3. Fix: task 7.8.

### D10.12 The Stop Notice Lists Subagents' Shells to the Lead

Observed in OpenJoystickDriver `c86d66a7` (2026-11-11). From 23:26:24 the lead called `TaskStop` on shells that the Stop notice "Background tasks still running at Stop:" had listed, such as `b8a3b8sgr`, `blysngezw`, and `btixsofv2`. Each call failed: "No task found with ID: blysngezw. Running background agents: a73773d6b7ca1bd1f …". The `backgroundTaskId` of each shell appears only in a subagent transcript: `agent-a784b77fabfe926ad`, `agent-a86a5700180d5aefd`, and `agent-a1882b3d90e395d5d`. Line counts in the lead transcript: 144 lines hold the notice, 15 hold the failure.

Read: `classic.Stop/useStopChecks/stop.ts:148` passes `e.background_tasks` through `tasksNotice`, and `texts.ts:221` prints each entry with its ID and offers `Monitor`. Claude Code's Stop input holds the subagents' shells too, and the lead's `TaskStop` reaches only its own shells and the agents themselves. The notice gives the lead IDs it cannot act on.

Fix: task 6.1 deletes `stop.ts` with its notice. The lead keeps the task list Claude Code already shows.

P-D10.12. Hypothesis: `TaskStop` on a subagent also ends the background shells it started. Prediction: a shell that appends `date +%s` to a file every 2 s stops writing within 4 s of the stop. Command: a Haiku `work` agent started that loop with `run_in_background: true`; the lead called `TaskStop` on the agent after 4 lines. Result: 6 lines, the last 19 s before the check, and no new line in the next 8 s. Confirmed: the lead stops a subagent's shell by stopping the agent, at no added cost.

### D10.13 The Stall Stop Pauses a `/goal`

Observed in www.clawdipedia.cc `6953aaa7` (2026-11-13T15:12:03). The `/goal` evaluator blocked the stop because the release was not done. No file had changed since the last stop, so `classic.Stop` in `stop.ts:137-139` replaced that block with `stallStop`, which sets `preventContinuation`. Claude Code then printed "Goal paused · a hook ended the turn · send a message to continue". The same Stop also raised the `useSliceCommits` block about `plugin/mcp/package.json`. Counted in transcripts by the `informational` record "Goal paused · a hook ended the turn": 8 records in 6 sessions (OpenSAD `10e1c566` ×2, `a106dac3`, `f6e32172`; JagFx `0aeae205` ×2; OpenJoystickDriver `c86d66a7`; www.clawdipedia.cc `6953aaa7`), 2026-11-11T23:38 to 2026-11-13T15:12.

The stall stop ends exactly the turn that `/goal` exists to continue: a goal blocks most often when the agent has stopped with nothing written. Fix: task 6.1 deletes `stallStop` with `stop.ts` and `useSliceCommits`; the `run-limits` spec's removal of "A Stop Loop with No Progress Ends the Turn" names this reason.

### D10.14 A Timed-Out Gate Asks the Person

Observed in this session (2026-11-13). A read-only `bun <script> <path> <dates>` call got the prompt "Hook tool.check requires confirmation for this command: The gate failed: timeout. A person must approve this call." `checkFault` (`chain.ts:16-21`) turns any error the engine passes to `next`, here the kind `timeout`, into `GATE_CHECK_FAILED` (`texts-gate.ts:99-100`), which asks the person. Which step ran out of time is unmeasured: the session has no debug file, and a permission prompt leaves no transcript record. Fix: task 7.5 deletes `checkFault`, so a fault leaves the engine's verdict in place.

### D10.15 Bedrock's Package-Manager Pattern Matches Quoted Text

Observed in this session (2026-11-13T15:23:01). The bedrock 0.1.4 hook denied a read-only `bun …/cmds.ts <dir> <from> <to> 'swift |xcodebuild|cargo |just |npm |pnpm |…'` with "this repo uses Bun. Run bun in place of `npm`". The deny comes from `FOREIGN` in `hooks/register.ts:15-16` of the installed bedrock plugin, a regex over the raw command text, which `blockForeign` (`register.ts:226-237`) applies when `bun.lock` exists.

P-D10.15. Hypothesis: the regex reads a `|` inside quotes as a pipe. Prediction: it matches the single-quoted argument and also `rg -n "npm |pnpm" docs`. Command: `FOREIGN.test` over four strings in `bun -e`. Result: the single-quoted argument `true`, the double-quoted `rg` `false`, `npm i` `true`, `FOO=1 npm test` `true`. Confirmed for single quotes. The same text gets two verdicts by quote style, because `"` is not in the regex's list of command starts.

Fix, in the bedrock repo (outside this change, named only): delete `FOREIGN` and `blockForeign`, and have adopt write `permissions.deny` rules such as `Bash(npm *)` for a Bun repo. Claude Code matches a Bash rule against each parsed subcommand (clawdipedia `configure/permissions/modes`, `subcommandResults`), so a quoted word is never a command. Before the change, probe that a deny rule `Bash(npm *)` lets the quoted command above run (unchecked here: it needs a model call).

### D10.16 The Side Check's Stop Covers Every Later Call in the Turn

Observed in this session (2026-11-13). you-should-know stopped seven calls:

- 13:24:38: three `Edit` calls to `specs/subagent-prompts/spec.md`, sent in one response, with "Next edits move the plan and sweep agents from Fable to Sonnet, though you chose to keep Fable". The user's rule is that subagents are never Fable, so the note's premise was false.
- 15:20:33: `rm -rf …/mine`, with "The next step deletes this session's probe scripts, which the committed findings were measured with".
- 15:20:56, 15:21:07, and 15:21:09: a Bash `ls`/`sed`, a `Write` of `mine/cmds2.ts`, and a Bash `bun mine/cmds2.ts`. None deletes anything, and all three got the same deletion note.

The ids are from this session's transcript: each `tool_result` starts with `<tool_use_error>you-should-know stopped this call before it ran`. Two rows at 15:32 that also hold the text are a `jq` query's output that quotes the earlier stops, not stops.

Read: `startCheck` (`claudetto-you-should-know/hooks/register.ts:130-131`) returns the shown note for every call while `row.view` is an offer from the same turn, without checking the call. `checkBefore` (`register.ts:150-169`) hands calls that arrive while one check runs the result of that check. So one verdict, written for one call, stops each later call of the turn, whatever it does.

Fix: task 7.11. The note's verdict holds for the call it judged: the hook keys the offer by that call's `tool_use` id and lets every other call through to its own check.

