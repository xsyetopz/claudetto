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

Cited: `worktree.symlinkDirectories` symlinks the named folders from the main repo into each worktree, none by default (clawdipedia `configure/settings/core`); `gbt` reads it right after the hooks step (same offset as D10.1). P-D10.2a. Hypothesis: the setting gives an isolated subagent the main checkout's `node_modules`. Prediction: with `{"worktree":{"symlinkDirectories":["node_modules"]}}` in `--settings`, a subagent started by `Agent` with `isolation: "worktree"` sees `node_modules` as a link, and with `{}` it sees none. Command: the fake Messages API stub `/tmp/claude-501/probe-scripted/stub.ts` with `script-w.json`, Claude Code 2.1.323, no billed call; the subagent runs `pwd; ls -ld node_modules; ls node_modules`. Result: on, `node_modules -> /private/tmp/claude-501/probe-scripted/repo-w/node_modules` and `pkg`; off, "ls: node_modules: No such file or directory". Confirmed.

P-D10.2b. Hypothesis: git ignores the link. Prediction: `git check-ignore node_modules` exits 0 in the worktree. Command: `git check-ignore` against a `.gitignore` of `node_modules/`, then of `node_modules`. Result: `node_modules/` exits 1, because a trailing slash matches only a directory and a symlink is a file to git; `node_modules` exits 0. The on-arm worktree showed `?? node_modules`, so Claude Code kept it as changed at the agent's end (the off-arm worktree was removed), and a `git add -A` there would commit the link. Every sampled project ignores with the slash form: claudetto, OpenSAD, OpenJoystickDriver, JagFx, versionlens-redux, and apple-docs. The line comes from the bedrock `gitignore` blocks (`bedrock/packages/typescript-bedrock/files/blocks/gitignore`, adapted from GitHub's `Node.gitignore`), which claudetto does not own. Fix: task 7.9.

### D10.3 Unresolved Expansions in Worktree Agents' Git Commands

Observed: the built-in worktree isolation refused 261 commands in 152 subagents ("names git in a form too complex to verify"), 94 in 69 ("too complex to verify"), 18 in 17 (`cd` to a computed path), and 16 in 12 (`eval`). Typical forms: `git add … && git commit … 2>&1 | tail`, `cd P; git merge-base …`, and `git diff --name-only | xargs swift format lint`. Each refusal costs one call, and the refusal text already says to split the command.

P-D10.3a. Hypothesis: chaining with `&&`, `;`, or `|` triggers the refusal. Prediction: a fake-API subagent with `isolation: "worktree"` is refused on `git add a && git commit -qm one 2>&1 | tail -1`. Command: `stub.ts` with scripted Bash calls, `claude -p go --setting-sources ""`, under `--dangerously-skip-permissions` and again in default mode with `allow: ["Bash","Agent"]`. Result: refuted. Seven chained, piped, and `xargs` forms ran and committed in the worktree.

P-D10.3b. Hypothesis: an expansion the parser cannot resolve triggers it. Prediction: `git log --oneline -1; echo rc=$?` is refused and `git log --oneline -1; echo rc` runs. Command: the same probe with 27 single-construct variants. Result: confirmed. Refused: `$?`, `$PWD`, `$USER`, an unset `$f`, a `for` loop variable, and `$(date +%Y)`, each also when double-quoted, and `git -C "$PWD"`. Ran: `$HOME`, `f=x; echo $f`, `|| echo failed`, `&& echo ok || echo failed`, a redirect to a file, a newline, `git grep` with a `:!` pathspec, and a commit with two `-m` strings. Of the 264 logged "names git" refusals, 75 hold `$?`; the rest hold a `for` loop, `$(…)`, or a variable set elsewhere.

P-D10.3c. Hypothesis: a setting, env var, or hook can avoid or soften the check. Prediction: the guard sits behind a gate. Command: `cc-inspect code` on 2.1.323. Result: refuted. `checkBgWorktreeCommandGuard` (`chunk-seb6ez7g.js`) runs in the shell exec path (`chunk-2x9ma4k7.js`, near offset 3504537) whenever the agent has an isolation root, with no gate; it refuses each parse whose `kind` is not `"simple"` and whose text names git. It runs after PreToolUse: a logging PreToolUse hook received the refused `$?` command. A hook can only refuse earlier with the same cost, and a wrapper that hides git from the parse turns the security check off.

P-D10.3d. Cost, measured over all subagent transcripts: 495 refusals in 196 subagents, 51 of them right after another refusal (at most 10 in one agent); the replies that followed them read or wrote 30,502,397 input tokens, mostly cache reads, and wrote 219,052 output tokens. No structural fix in claudetto removes it: the choice left is to keep `isolation: "worktree"` and pay one call per refusal, or to drop the isolation. Prose in `work.md` is no fix, and the refusal text already names the split form.

### D10.4 The Scope Rules Steer Deferral

Observed in the user messages, 15 or more times: "fix it.", "Your job, not the user's job.", "So *check it*. Nobody told you to stop.", "resolve them.", "You need to handle all the "not done" parts yourself.", "User has nothing to review here. Your job.", "it is supposed to format them." (JagFx `bunfig.toml`, left alone as a shared bedrock file), "no gaps accepted". The opposite fault also appears: "you were not tasked to restore them, and you have no proof that adopt did it.", "you were not tasked to install biome."

Sources (read): the root prompt's `<defects>` block, `plugins/claudetto/hooks/texts.ts:29`, "Fix defects in task's files; name one outside them with place and evidence, and change it only when asked"; `plugins/claudetto/rules/noUnrequestedEdits.md:1`, "Ask before any other code edit"; the bedrock-written `AGENTS.md:42`, "Keep the shared configs as they are". Each sets scope by file, so a defect in another file on the goal's path is named and left, while a guess inside the task's files is acted on. This change keeps both claudetto texts (`specs/agent-conduct/spec.md:127`, `specs/setup/spec.md:26`, `research/text-audit.md:222`). Fix: task 8.6 sets scope by the user's goal and its done-check, and bars acting on an unchecked cause.

### D10.5 A Push Ran Before `just verify`

Observed: session `cd2e74f0` committed at 22:48:53 and pushed `feat/2.1.321` at 22:48:58; its first `just verify` after that ran at 23:24:16. www.clawdipedia.cc `a663e2b2` pushed `7171a909` on 2026-11-10 after a `just verify` that failed (D10.25). Side-agent notes also claimed that versionlens v0.6.3 was released before verify passed and that a PR branch was force-pushed. The leads' checks showed both claims wrong (D10.25), and `user-dossier.md` reports neither. Force-push and release are on the user's list of reserved actions (U3.1). The repo's `.githooks` holds only `commit-msg` and `pre-commit`.

- P-D10.5. Hypothesis: a `pre-push` hook that fails stops the push. Command: a bare remote, a worktree with `.githooks/pre-push` exiting `$VERIFY_RC`, then `git push origin HEAD:main` with 1 and then 0. Result: rc 1 and no `main` on the remote; then rc 0 and `main` at the commit.

Fix: task 7.10 adds a bedrock `pre-push` that runs `just verify`. A `gh release create` goes through the API, not `git push`, so the hook does not cover it.

### D10.6 The Memory Watch Stops Early

Observed: "The memory watch stopped (… $.process.run(ps) aborted: still running after 30000ms)" (3 times in 1 session) and "… $.process.run(sysctl) failed to start: ENOENT" (once). The RAM reports ("borked the system ram over 120+ gb", "choking user's RAM with tsgolints", sent 2026-11-10 and 2026-11-11) came before the watch shipped in `378782f3` (2026-11-13).

Read: in `useMemoryHold/memory.ts`, the `.catch` at `:184` wraps the whole `poll` recursion, so one failed `ps`, most likely under memory pressure, ends the watch for the rest of the call. `done.abort()` at `:190` runs when `next(e)` returns, and a `run_in_background` Bash call returns at once, so a long background test run is not watched (inferred from the code, not run). `:146` starts `sysctl` by bare name, though `:22` gives `memory_pressure` its absolute path. Fix: task 4.5.

### D10.7 Faults From the Installed Older Build

Observed in subagents: "Monitor is off here: call mcp__claudetto__monitor." (76 in 73) and "The server-side auto mode classifier gave no verdict for Agent: a hook changed this call's input" (26 in 7). Both texts come from the installed build `82b714c5ec41` (`hooks/delegation.ts:166-170`). The source already refuses an off-form `Agent` call in place of rewriting it (`tool.call/useClaudettoAgents/delegation.ts:35-49`) and holds no Monitor block. Recorded only.

"This agent has run past its 15-minute limit, so each further tool call is refused" (`DENY_OVERTIME`, option `agentMaxMinutes`) came back as a tool result 23 times, in four OpenSAD `005f897e` subagents between 2026-11-10T21:18 and 21:43. Counted with a script over every `~/.claude/projects` transcript that keeps tool results under 700 characters, so survey output that quotes the text is left out. Archived task 10.8 of `feat-2-1-321` replaced the time cap with `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS`. `grep -rn 'minute limit'` finds the text neither in `plugins/` nor in `~/.claude/plugins/cache`. Recorded only.

"The path <cwd>/commit was not resolved (HooksError: … $.fs.stat(…) failed: ENOENT)" in www.clawdipedia.cc `6953aaa7` (2026-11-13), and "The path <cwd>/gate failed was not resolved" in claudetto `17435f50` (15:18:02, from the `grep` pattern `gate failed`). The installed build `889af7348fcb` runs `$.fs.stat` on each word of a command as a path (`hooks/tool.check/useBashRules/own.ts:30-33`). The source dropped that call in `7ac6a94e`, but its `exists` catch still logs "was not checked" (`own.ts:25-26`). Task 5.3 deletes the file.

"Subagent spawn denied by a plugin: N subagents started in N seconds and the cap is N" came back 56 times in eight sessions' transcripts: OpenJoystickDriver `c86d66a7` (13, 2026-11-11T23 and 11-12T13), OpenSAD `3308c572` (6, 11-11T13), and six www.clawdipedia.cc transcripts on 2026-11-09T16 (37). This session's five rows are survey output that quotes the text. The text is in the installed builds `2.1.319` and `82b714c5ec41` (`hooks/texts.ts`), not in the source, where the cap answers with `DENY_CALLS` (`agent.spawn/useMemoryHold/admit.ts:56`). Task 4.4 deletes that cap and writes the `CLAUDE_CODE_MAX_*` env keys in its place.

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

P-D10.11, 2026-11-13:

- **Hypothesis:** the live guard also denies a session's own isolated worker when the command names the path through a shell variable, and it denies a path from the session's own `git worktree add`, because `ownsOf` (`tool.check/useBashRules/processes.ts:105-116`) never reads the `paths` that `createdOf` returns.
- **Prediction:** `ownedVerdict` passes a literal `.claude/worktrees/agent-abc` and denies the other three forms.
- **Command:** `bun $TMPDIR/probe-wt/probe.ts`. It calls `parse` and `ownedVerdict` with an `Owns` that holds the worker `agent-abc` and the past call `git worktree add --detach /tmp/ojd-base HEAD`.
- **Result:** confirmed. The probe printed `createdOf paths: [ "/tmp/ojd-base" ]`, then:
  - `pass` for `git worktree remove .claude/worktrees/agent-abc`;
  - `deny` for `W=/r/.claude/worktrees; git worktree remove $W/agent-abc`;
  - `deny` for `for id in abc; do git worktree remove .claude/worktrees/agent-$id; done`;
  - `deny` for `git worktree remove /tmp/ojd-base`.

  The Stop cleanup reads those same `paths` as owned (`classic.Stop/…/cleanup.ts:52`), so the gate refuses what the cleanup counts as the session's own.

The transcripts show the same denials. Over five days the guard denied 44 calls (36 from leads, 8 from subagents) in 22 sessions (`/tmp/claude-501/scan-remark.ts`). The 4 denials with the live text all fell on worktrees their own session had made:

- OpenJoystickDriver `05884638` at 13:03:31 (`$W/agent-a3154b6e68160addc`), at 13:22:23 (`agent-$id` for `a8e055190b6587dfb` and `a4342ae1d234a5eb6`), and at 13:40:54 (`/tmp/ojd-base`, from that session's own `git worktree add`). All three workers have transcripts under `05884638/subagents/`.
- this session at 15:00:06 (`probe-tsgolint`).

Under the older text, which counted only a `git worktree add` in the transcript, the same guard denied claudetto `cd2e74f0` at 18:11:21 on 2026-11-12. That session's own workers had made the two worktrees at 11:52:18 (`cd2e74f0/subagents/agent-af99e8c0cb23b8587.jsonl` and `agent-a233e7d6eed9df42c.jsonl`). From 17:06:37 to 18:11:05 the Stop block named the uncommitted files in those worktrees as "files you changed" 8 times, and the gate then refused their removal. The user removed them by hand at 18:11:46. The current `changedOf` leaves out `.claude/worktrees/` (`classic.Stop/useSliceCommits/slices.ts:97-102`), and the last such block came at 2026-11-13T00:43:22 in OpenJoystickDriver `92c2d0ed`, before the 00:55 install. Task 7.8 deletes the guard, which covers every case above.

### D10.12 The Stop Notice Lists Subagents' Shells to the Lead

Observed in OpenJoystickDriver `c86d66a7` (2026-11-11). From 23:26:24 the lead called `TaskStop` on shells that the Stop notice "Background tasks still running at Stop:" had listed, such as `b8a3b8sgr`, `blysngezw`, and `btixsofv2`. Each call failed: "No task found with ID: blysngezw. Running background agents: a73773d6b7ca1bd1f …". The `backgroundTaskId` of each shell appears only in a subagent transcript: `agent-a784b77fabfe926ad`, `agent-a86a5700180d5aefd`, and `agent-a1882b3d90e395d5d`. Line counts in the lead transcript: 144 lines hold the notice, 15 hold the failure.

Read: `classic.Stop/useStopChecks/stop.ts:148` passes `e.background_tasks` through `tasksNotice`, and `texts.ts:221` prints each entry with its ID and offers `Monitor`. Claude Code's Stop input holds the subagents' shells too, and the lead's `TaskStop` reaches only its own shells and the agents themselves. The notice gives the lead IDs it cannot act on.

Fix: task 6.1 deletes `stop.ts` with its notice. The lead keeps the task list Claude Code already shows.

P-D10.12. Hypothesis: `TaskStop` on a subagent also ends the background shells it started. Prediction: a shell that appends `date +%s` to a file every 2 s stops writing within 4 s of the stop. Command: a Haiku `work` agent started that loop with `run_in_background: true`; the lead called `TaskStop` on the agent after 4 lines. Result: 6 lines, the last 19 s before the check, and no new line in the next 8 s. Confirmed: the lead stops a subagent's shell by stopping the agent, at no added cost.

### D10.13 The Stall Stop Pauses a `/goal`

Observed in www.clawdipedia.cc `6953aaa7` (2026-11-13T15:12:03). The `/goal` evaluator blocked the stop because the release was not done. No file had changed since the last stop, so `classic.Stop` in `stop.ts:137-139` replaced that block with `stallStop`, which sets `preventContinuation`. Claude Code then printed "Goal paused · a hook ended the turn · send a message to continue". The same Stop also raised the `useSliceCommits` block about `plugin/mcp/package.json`. Counted in transcripts by the `informational` record "Goal paused · a hook ended the turn": 8 records in 6 sessions (OpenSAD `10e1c566` ×2, `a106dac3`, `f6e32172`; JagFx `0aeae205` ×2; OpenJoystickDriver `c86d66a7`; www.clawdipedia.cc `6953aaa7`), 2026-11-11T23:38 to 2026-11-13T15:12. Counted by the `hook_stopped_continuation` record that holds the `stallStop` text (`texts.ts:225`): 10 records in the same six sessions, two each in OpenSAD `f6e32172` and `a106dac3` where one of the two paused no goal.

The stall stop ends exactly the turn that `/goal` exists to continue: a goal blocks most often when the agent has stopped with nothing written. Fix: task 6.1 deletes `stallStop` with `stop.ts` and `useSliceCommits`; the `run-limits` spec's removal of "A Stop Loop with No Progress Ends the Turn" names this reason.

### D10.14 A Timed-Out Gate Asks the Person

Observed in this session (2026-11-13). A read-only `bun <script> <path> <dates>` call got the prompt "Hook tool.check requires confirmation for this command: The gate failed: timeout. A person must approve this call." `checkFault` (`chain.ts:16-21`) turns any error the engine passes to `next`, here the kind `timeout`, into `GATE_CHECK_FAILED` (`texts-gate.ts:99-100`), which asks the person. Which step ran out of time is unmeasured: the session has no debug file, and a permission prompt leaves no transcript record. Fix: task 7.5 deletes `checkFault`, so a fault leaves the engine's verdict in place.

### D10.15 Bedrock's Package-Manager Pattern Matches Quoted Text

Observed in this session (2026-11-13T15:23:01). The bedrock 0.1.4 hook denied a read-only `bun …/cmds.ts <dir> <from> <to> 'swift |xcodebuild|cargo |just |npm |pnpm |…'` with "this repo uses Bun. Run bun in place of `npm`". The deny comes from `FOREIGN` in `hooks/register.ts:15-16` of the installed bedrock plugin, a regex over the raw command text, which `blockForeign` (`register.ts:226-237`) applies when `bun.lock` exists.

P-D10.15. Hypothesis: the regex reads a `|` inside quotes as a pipe. Prediction: it matches the single-quoted argument and also `rg -n "npm |pnpm" docs`. Command: `FOREIGN.test` over four strings in `bun -e`. Result: the single-quoted argument `true`, the double-quoted `rg` `false`, `npm i` `true`, `FOO=1 npm test` `true`. Confirmed for single quotes. The same text gets two verdicts by quote style, because `"` is not in the regex's list of command starts.

Fix, in the bedrock repo (outside this change, named only): delete `FOREIGN` and `blockForeign`, and have adopt write `permissions.deny` rules such as `Bash(npm *)` for a Bun repo. Claude Code matches a Bash rule against each parsed subcommand (clawdipedia `configure/permissions/modes`, `subcommandResults`), so a quoted word is never a command.

P-D10.15b. Hypothesis: a `permissions.deny` Bash rule matches a program word, never quoted text. Prediction: with `allow: ["Bash"]` and `deny: ["Bash(cowsay *)"]`, the two quoted commands run, and the bare, env-prefixed, chained, and piped forms are denied. Command: a fake Messages API that answers each first request with one `Bash` `tool_use`, then records the `tool_result`; Claude Code 2.1.323 `claude -p` in a temp `HOME` and `CLAUDE_CONFIG_DIR`, with `--setting-sources ""` and a fake key, so no request leaves the machine and no model is billed. The rule names `cowsay` because the bedrock hook in this repo blocked each probe command that held the word `npm`, even inside quotes passed to `bun` and `sed`, two more hits of this defect. Result: `rg -n 'cowsay |x' README.md` and `echo 'a|cowsay i|b'` ran; `cowsay hi`, `FOO=1 cowsay hi`, `echo hi && cowsay hi`, and `true | cowsay hi` each returned "Permission to use Bash with command … has been denied." Confirmed: the settings rule does the job without a regex.

### D10.16 The Side Check's Stop Covers Every Later Call in the Turn

Observed in this session (2026-11-13). you-should-know stopped seven calls:

- 13:24:38: three `Edit` calls to `specs/subagent-prompts/spec.md`, sent in one response, with "Next edits move the plan and sweep agents from Fable to Sonnet, though you chose to keep Fable". The user's rule is that subagents are never Fable, so the note's premise was false.
- 15:20:33: `rm -rf …/mine`, with "The next step deletes this session's probe scripts, which the committed findings were measured with".
- 15:20:56, 15:21:07, and 15:21:09: a Bash `ls`/`sed`, a `Write` of `mine/cmds2.ts`, and a Bash `bun mine/cmds2.ts`. None deletes anything, and all three got the same deletion note.
- 2026-11-13, about 18:00 UTC: a note on an `Edit` to `tasks.md` 7.18 ("makes setup auto-allow edits to the whole temp folder") also stopped a `Write` of `/tmp/claude-501/scan-gate-fault.ts` and a `TaskStop` of a probe stub, until the user answered. Its premise that the rule applies "regardless of the probe result" was false: P-D10.31 had already run.

The ids are from this session's transcript: each `tool_result` starts with `<tool_use_error>you-should-know stopped this call before it ran`. Two rows at 15:32 that also hold the text are a `jq` query's output that quotes the earlier stops, not stops. So are the rows at 14:36:40, a `Read` of a saved tool result, and 14:53:49, a `grep` whose output quotes other notes: neither `tool_result` starts with the stop text.

Read: `startCheck` (`claudetto-you-should-know/hooks/register.ts:130-131`) returns the shown note for every call while `row.view` is an offer from the same turn, without checking the call. `checkBefore` (`register.ts:150-169`) hands calls that arrive while one check runs the result of that check. So one verdict, written for one call, stops each later call of the turn, whatever it does.

Fix: task 7.11. The note's verdict holds for the call it judged: the hook keys the offer by that call's `tool_use` id and lets every other call through to its own check. The id is on each `tool.call` event: the engine types document `tool_use_id` as "the same at every event of the call" (`.claude-plugin/types/claude-code/index.d.ts:6403`), and `usePriceStep/price-step.ts:160` already keys calls by `e.tool_use_id`.

### D10.17 zsh Aborts Bash-Style Commands

Observed with `/tmp/claude-501/scan-err.ts` over the 807 transcripts changed in the 4 days before 2026-11-13: Bash results that start with `(eval):N:` held "no matches found" 123 times and "= not found" 36 times. The Bash tool runs the user's shell, zsh here, and two zsh options abort a whole command line that bash would run:

- `NOMATCH`: an unmatched glob word aborts the line before any part runs. Of the 63 rejected words a script could classify, 30 were grep options such as `--include=*.ts` and 1 was a URL with `?`. bash passes both through as literal text.
- `EQUALS`: a word that starts with `=` expands to a command path, so `echo ==` and `[ a == a ]` fail.

P-D10.17a. Hypothesis: the two options cause the errors. Prediction: under `CLAUDE_CODE_SHELL=/bin/zsh`, `echo == x` and `[ a == a ]` fail with `= not found`, and under `/bin/bash` they print. Command: the fake Messages API probe of P-D10.15b, Claude Code 2.1.323, no billed call. Result: zsh `(eval):1: = not found` for both; bash `== x` and `same`. Confirmed.

P-D10.17b. Hypothesis: switching the tool to bash costs nothing. Check: of 39,389 Bash commands in the same window, 104 used an unquoted `**`, and 70 of them ran without error. macOS `/bin/bash` is 3.2, where `**` matches one folder level, so those commands would match fewer files with no error. Refuted: `CLAUDE_CODE_SHELL=/bin/bash` trades loud failures for silent ones.

P-D10.17c. Hypothesis: a `SessionStart` hook that appends `[ -n "$ZSH_VERSION" ] && setopt no_nomatch no_equals` to `$CLAUDE_ENV_FILE` turns the two options off in each Bash command and keeps `**` recursive. Prediction: `echo == x`, `grep --include=*.ts`, and `ls d/**/z.swift` all run, and `ls nothing*here` fails alone. Command: the same probe, with the hook in `--settings`, then with `CLAUDE_ENV_FILE` set by hand. Result: `== x`, `glob-ok`, `d/e/f/z.swift`, and `ls: nothing*here: No such file or directory` followed by the next command's output. Confirmed. Two routes failed: a `ZDOTDIR` that holds a `.zshrc` (Claude Code still read `$HOME/.zshrc`, and `=` failed), and editing the user's `.zshrc`, which works but changes the user's interactive shell. P-D10.17d. Hypothesis: a subagent's Bash commands load the same file. Prediction: in a worktree subagent, `echo == x; grep --include=*.ts -l zzz /dev/null; echo after` prints `== x` and `after` with the hook, and `= not found` without it. Command: the P-D10.2a probe, same two settings files. Result: with the hook, `== x` and `after`; without it, `(eval):1: = not found`. Confirmed.

Fix: task 7.12.

### D10.18 Agents Poll Background Output With `sleep`

Observed: Claude Code's built-in block "Blocked: sleep N followed by: …" ended 146 calls in the same window: 82 OpenJoystickDriver, 27 OpenSAD, 18 claudetto, 9 clawdipedia, 6 JagFx, 1 versionlens-redux. 134 came from subagents and 12 from leads; 105 were `cat` or `tail` of a `tasks/*.output` file of a background command, 102 of them in subagents. An earlier version of this entry said all 146 came from leads; the split above counts error results per transcript, with subagents told apart by the `/subagents/` path. The block runs nothing, so each costs one request. After 13 blocks the agent took the block's advice and called `Monitor`, and 11 of those got claudetto's "Monitor is off here", the old-build text that D10 records; the last one is from 2026-11-12T18. Both installed builds and `plugins/` no longer hold that text.

P-D10.18a. Hypothesis: a subagent cannot wait for its background command's end notice. Prediction: a fake-API subagent that starts a background Bash call and ends its turn gets no further request. Command: `stub.ts` with `script-bg.json`, `claude -p go --setting-sources ""`. Result: confirmed. The subagent handed back at once, and the call's result says the command "is terminated when you give your final response and no notification can follow that". The notice does arrive while the subagent is still working. The block's advice, "To wait for a command you started, use run_in_background: true", is therefore no route in a subagent.

P-D10.18b. Hypothesis: the block catches each leading `sleep`. Prediction: `sleep 6; cat f` is blocked. Command: the same probe. Result: refuted. The block is in Bash `validateInput` (`chunk-2x9ma4k7.js`, near offset 5404896); it refuses a first command `sleep N` with N of at least 25 (`xfo=25`), only when Monitor is on and the call is in the foreground. `sleep 6; cat f` and `until test -s f; do sleep 1; done; cat f` ran. A subagent gets Monitor through ToolSearch.

P-D10.18c. Hypothesis: a PreToolUse hook can run a subagent's background call in the foreground, so no poll follows. Prediction: `updatedInput` with `run_in_background: false` returns the output inline. Command: the probe with a hook that keys on `agent_id`. Result: confirmed. The hook input carries `agent_id` and `agent_type` for a subagent's call only, and the subagent's `sleep 3; echo done-bg` returned `done-bg` inline while the lead's background call stayed in the background. The trade is refuted by the transcripts: of 160 subagent background calls, 141 overlapped other work (2,781 calls), 80 were polled (257 polls), and only 8 were polled with no other work between start and notice (`/tmp/claude-501/scan-sub-bg.ts`). The hook would serialize the 141 to save the 257 polls. Since the live install (2026-11-13T00:55Z) the block fired 7 times: 4 in subagents and 3 in leads. Recorded only: no structural change of claudetto's removes the poll without that loss.

The 51 refused `SubagentHandback` calls (the subagent's final-report tool in 2.1.323) in the same window came from the remark gate (38) and the 15-minute cap (13), both recorded above. Neither is in `plugins/` or in the live build `cache/xsyetopz/claudetto/889af7348fcb-cd50c5e0`, which was installed at 2026-11-13T00:55Z (`installed_plugins.json`). The stale builds `cache/claudetto/claudetto/82b714c5ec41` and `2.1.319` still hold the remark text (`PIN_ANSWER_FIRST`), but no session loads them now. Over five days the remark gate denied 184 calls, 100 from leads and 84 from subagents. The last one came at 2026-11-12T23:56, before the live install. Its trigger was the latest "user" row: in a subagent, that row is an image result or a system reminder, not a person (`/tmp/claude-501/scan-remark.ts`). The side check skips every subagent call (`claudetto-you-should-know/hooks/register.ts:283`), so no gate left in the source can refuse a hand-back. The 254 refused `Write` calls under `/tmp` came from the `.created-by-claudetto` marker gate, which is likewise absent. Most of the 139 subagent "File has not been read yet" errors in the same window, all from `claudetto:Heracles` on `claude-sonnet-5-5`, followed one of those refused writes or a `sed -i` on the file.

### D10.19 The Bash Gate Logs Each Shell Word It Cannot Stat

Observed: 18,175 transcript rows, 13.2 MB, across `~/.claude/projects`, read "claudetto: The path <cwd>/<word> was not resolved (… `$.fs.stat(…)` failed: ENOENT)" or "The directory … was not listed". The words are shell syntax, not paths: `pipefail`, `in`, `$f`, `select(.type`, `$TMPDIR/`. In this session's transcript they are 7,267 of 15,986 rows, about 10.8 per Bash call, and they still ran at 3,297 rows in the 15:00 UTC hour of 2026-11-13. The engine types say `$.ui.log` is "not sent to the model" (`.claude-plugin/types/claude-code/index.d.ts:2475-2476`), so the cost is transcript size and the dim lines on screen, not tokens. The source is `hostOf` in `tool.check/useBashRules/own.ts:29-36`, which logs each failed `$.fs.stat`.

Fix: task 5.3 deletes `useBashRules` and this logger with it. Task 7.1's rule, ENOENT means absent and logs nothing, covers each logger that stays.

### D10.20 The Price Step Logs Its Own Normal Wait End

Observed: 9 `informational` records "claudetto: The usage wait ended early (HooksError: This operation was aborted)" in this session. Four fall at 2026-11-13T15:11:46 to 15:11:54, one per call of the Haiku subagent `aa377ced`, which made four calls (2 `Bash`, `Monitor`, `ToolSearch`) between 15:11:45 and 15:11:56. Five more fall at 15:56:48 to 16:00:49, when no subagent ran; which Haiku step they came from is unmeasured.

Read: `readingOf` (`turn.step/usePriceStep/price-step.ts:97-119`) races the step's stop chunk against a sleep, and its `.finally` calls `done.abort()`, which ends the sleep with an abort. The `catch` at `price-step.ts:110-113` logs every aborted sleep. So the notice fires whenever the stop chunk wins, the normal path.

P-D10.20. Hypothesis: the notice fires on the normal path. Prediction: a test in which the Haiku step's stop chunk arrives before the wait ends records the notice. Command: a scratch `probe-wait.test.ts` beside `price-step.test.ts`, with the same stubs as its `lab` plus an `on("ui.log")` collector and a 100 ms wait before the assertion, run by `claude plugin test plugins/claudetto` (a sub-folder holds no `hooks/hooks.json`, so the whole mod runs). Result: without the 100 ms wait the test passed, because the sleep's rejection lands after the call answers. With it, the test failed with `["The usage wait ended early (AbortError: This operation was aborted)"]`. The other 1553 tests passed. Confirmed. The probe file was deleted.

Fix: task 7.13. The comment at `price-step.ts:111` already says an aborted wait ends like one that ran out, so the `catch` returns without a log.

### D10.21 The Commit and Cleanup Stop Blocks Cost a Turn Each

Counted as "Stop hook feedback:" user rows, each of which sends the lead one more request:

- "These files you changed are not committed": 337 rows from 2026-11-09 to 11-13, the most in OpenJoystickDriver `c86d66a7` (68), `f4b7e436` (54), and OpenSAD `3308c572` (51). 210 of them list files in an agent's worktree (`.claude/worktrees/agent-*`), which the lead does not own: the agent's own stop commits them. `changedOf` skips those paths since `378782f3` (2026-11-12T22:59 UTC, `classic.Stop/useSliceCommits/slices.ts:97-101`), and both installed builds hold that skip. The last three, in OpenJoystickDriver `92c2d0ed` at 2026-11-13T00:31 to 00:43, came from a build the transcript does not name.
- "These files changed this session by a command, the user, or a tool, and are not committed": 41 rows, 2026-11-09 to 11-13.
- "claudetto removed the folders, worktrees, and branches this agent created": 30 rows, 2026-11-09 to 11-12.

Fix: task 6.1 deletes `useSliceCommits` and the cleanup Stop block.

### D10.22 Tool Errors With No Plugin Cause

Measured over transcripts changed in the last five days, to rule out a plugin cause. None of these gets a task.

- `Edit` "String to replace not found": 132 of 14,683 `Edit` calls (0.9%). 17 repeat, word for word, an `Edit` that had just failed. 35 follow a successful `Edit` on the same file in the same response (30 Sonnet, 4 Opus, 1 with no model recorded). Hypothesis: a format-on-write hook changed the file after an `Edit`. Refuted: no installed plugin hooks `Edit` or `Write`; bedrock's only `tool.call` hook is `blockForeign` on `Bash` (`bedrock/0.2.2/hooks/register.ts:239`). P-D10.22a. Hypothesis: `Edit` calls in one response race. Prediction: three disjoint `Edit` calls in one fake-API response leave one failure. Result: all three succeeded; Claude Code runs them in turn. Refuted. P-D10.22b. Hypothesis: the misses are indentation. Command: `/tmp/claude-501/scan-edit-miss.ts` compares each `old_string` with the session's last `Read` of the file, line prefixes stripped. Result: of 98 classified misses, 49 differ in indentation only, 33 hold text not in that `Read`, and 16 had no `Read`. Of the 49, 39 are exactly one tab too deep in tab-indented files (TypeScript 31, Haxe 6), 6 swap tab and space, and 3 match from the first line; by model, Sonnet 41, Opus 6, Mythos 2. Cause: `Read` writes each line as `N\t` plus the text, and a model counts that tab as indentation. Claude Code 2.1.323 holds a fix behind the server flag `tengu_tab_read_sep` (`chunk-4t0apqbz.js:1529`, off): `s9e` (`chunk-pywr10fm.js:13920`) then writes `N:` for a file with a tab-led line, and the `Edit` description changes with it. P-D10.22c. Hypothesis: `CLAUDE_INTERNAL_FC_OVERRIDES` turns the flag on. Result: no change in the `Read` output; `getEnvironmentOverrides` returns `null` in the public build (`chunk-x4fdscgs.js`). Refuted. P-D10.22d. Hypothesis: a `PreToolUse` hook that returns `updatedInput` (clawdipedia `extend/hooks/tool-events`) with one leading tab removed from each line of `old_string` and `new_string`, when the original is absent and the shifted text occurs once, rescues the miss. Prediction: the shifted `Edit` succeeds. Command: the fake Messages API stub with a `Read`, a valid `Edit`, and a one-tab-deep `Edit`; the hook appends to a log file before it answers. Result: the hook ran once, for the valid `Edit`; the deep `Edit` failed with "String to replace not found" and the debug file shows `Edit tool validation error: code=8` with no hook run. Claude Code validates `Edit` input before `PreToolUse`. Refuted. P-D10.22e. Hypothesis: `PostToolUseFailure`, which returns `additionalContext` (clawdipedia `extend/mod-api/events/classic-events`), fires on that error and can hand back the shifted `old_string`. Result: it did not fire for the `Edit`; as a control, the same hook fired once on a `Bash` call that exited 1. Refuted: no hook event sees an `Edit` input-validation error. No user or plugin lever sets the separator or answers the miss, so this stays a Claude Code defect.
- `grep` "exceeds complexity limits": 24 `Bash` calls. Claude Code shadows `grep` with its embedded `ugrep -G` through a function in the shell snapshot (clawdipedia `reference/tools/files`). P-D10.22. Prediction: the shadow fails on `.\{0,60\}`, and the system grep does not. Command: `source` of a script with six forms on one line of text. Result: the shadow exits 2 with "exceeds complexity limits" in BRE, in ERE (`-E '.{0,60}'`), and under `LC_ALL=C`. It passes with `.\{0,10\}`. `/usr/bin/grep` and `command grep` print the match. No documented setting turns the shadow off, and turning it off would also drop its `--ignore-files` and `.git` exclusions, so this stays a Claude Code limit.
- `Read` "File content (N tokens) exceeds maximum allowed tokens": 13 calls. The www.clawdipedia.cc session `6953aaa7` sent `limit: 5`, then `limit: 40`, on a one-line JSON file of 26,234 tokens. `limit` counts lines, so no line limit fits.
- `Edit` "The server-side auto mode classifier gave no verdict (it skipped this action)": 10 calls, all in claudetto sessions `cc4fc018` (2026-11-09T19 and T21) and `d21b8a3c` (2026-11-10T14), on files inside the project, and none since. The cause is unmeasured: the sessions have no debug file. The server gives the verdict, so no plugin change reaches it.
- "The user doesn't want to proceed": 14 rows, the user's own denials, five of them in OpenJoystickDriver `c86d66a7` at 2026-11-11T23:25, during the memory incident of D10.10.

### D10.23 OpenJoystickDriver Session `b429b5a4`, 2026-11-13 15:39 to 16:15 UTC

- Gate timeout ask. At 16:06:29 a `tool.check` guard ran out of time, and the `.catch` in `register.ts` turned the fault into "The gate failed: timeout. A person must approve this call." The engine's types say a failed guard is skipped and the verdict beneath stands; only the catch made it an ask. Fixed in `b786893a` (task 7.5): the catch is gone, and `faults.test.ts` "a check guard that throws leaves the verdict beneath" failed before and passes after.
- A background agent raised the app window after a ban. Agent `af31598cf17d3f091` (`claudetto:work`, recorded model `claude-sonnet-5-5`) took task 10.5 at 15:39:14 with a lead prompt that said to drive the live app through `osascript` System Events clicks. It used `activate` and `set frontmost` at 15:50 to 15:53. The user asked for capture in the background at 15:59:04; the lead sent the ban by `SendMessage` at 15:59:30. The agent compacted at 16:01:19 with the ban in its summary, and at 16:01:20 pressed the "Open OpenJoystickDriver" menu item and went on clicking until the user's "STOP BRINGING THE FUCKING WINDOW UP" at 16:04:52. The lead stopped it with `TaskStop` at 16:05:14. The constraint ledger (`prompt.submit/useConstraintPin`) has no subagent path: the agent's transcript holds 0 ledger rows. Claude Code's `SubagentStart` hook can hand context to a subagent before its first prompt (clawdipedia `extend/hooks/agent-events`), so it carries only constraints known at spawn; this ban came after the spawn, and the agent did receive it. Recorded only: task 6.5 deletes the ledger, and no settings rule tells a window-raising AppleScript from a background one.
- The lead stopped the agent and left task 10.5 unticked; the user answered at 16:06:30 that no task stays unticked. Recorded only: a project rule, not a claudetto defect.
- Pipefail gate on a list command. At 16:09:12 the gate denied `just --list … | grep | head`. Across `~/.claude/projects`, 19 of 116 masked-exit denials are help, list, or version calls (`/tmp/claude-501/scan-masked.ts`). Cause: `pipefail.ts` treats every `just` and `claude plugin` command as a check. Fix: task 5.3 deletes the rule.
- Memory watch notice on a cancel. At 16:05:17, three seconds after the `TaskStop`, the agent's transcript logged "The memory watch stopped (HooksError: The operation was aborted.)". Read: `memoryWatchCall` (`agent.spawn/useMemoryHold/memory.ts:169-193`) calls `done.abort()` only after `next(e)` returns. When the call is cancelled and `next(e)` throws, the poll keeps running until the engine aborts its sleep, and since `done.signal` is not aborted, the catch logs. P-D10.23. Hypothesis: a call whose `next(e)` throws leaves the watch polling. Prediction: after the call rejects, 60 s more on the mock clock runs `ps` again. Command: a scratch `probe-cancel.test.ts` beside `memory-watch.test.ts`, with its `lab` stubs and a `tool.call` beneath that throws after 1 s, run by `claude plugin test plugins/claudetto`. Result: the call rejected, and `ps` ran 12 times after it, against 0 before; the other 1552 tests passed. Confirmed: a cancelled call leaks a watch that runs `ps` every 5 s until the engine aborts its sleep, and that abort is the logged notice. The probe file was deleted. Fix: task 4.5 aborts the watch in a `finally` around `next(e)`.
- Each compaction logged ENOENT notices for `.claude/skills`, `.claude/commands`, and `~/.claude/commands`. Fix: task 7.1.

### D10.24 Tool Errors and Notices Over Five Days, 2026-11-08 to 11-13

Counted by `/tmp/claude-501/scan-kinds.ts` (row kinds and error heads with digits folded), sampled by `scan-samples.ts` and `scan-bare.ts`, over transcripts changed in the last five days.

- Shell reads and writes the gate refused: 655 "Use `Read` to read", 617 "Use `Write` to write", 29 "Use `Edit` to change", and 364 more where `cc-plugin-privacy` joined claudetto's denial ("denied by plugins claudetto, cc-plugin-privacy"). Each refused call costs one request. Fix: task 5.3.
- Bare "Exit code 1" results: 23 `Bash` errors carry only the exit code. 10 of them begin with `set -o pipefail;`, the form the pipe rule demands, and most of them end in a `grep` that matched nothing, so a no-match fails the whole command with no output. Fix: task 5.3 deletes the rule. The rest are `grep`, `find`, or `lsof` finding nothing, which Claude Code reports as an error by design.
- Read guard: 14 denials of "This is a lock, generated, or build file". `heavyFile` (`settings.read/useSlimSurface/surface.ts:68-76`) judges by path, so it refused a small source file under `node_modules/typescript-bedrock/src/` and a template under `.build/checkouts/`. Claude Code's `Read` already refuses a file past its token or size limit (D10.22). The `surface-trim` delta removes "A Whole Read of a Heavy File Is Denied", but no task deleted it. Fix: task 5.5.
- `.git/config` lock: 16 `Bash` errors "could not lock config file .git/config: Operation not permitted", 13 of them from commands that run `git config core.hooksPath .githooks` to satisfy `guard-base`, most in OpenSAD Opus leads; the others set a remote URL or the Git LFS filter. The sandbox protects `.git/config`. Fix for the `guard-base` cause: task 7.10.
- Missing tools: 15 `Grep` calls in `claudetto:work` agents got "Grep is not available in this session". Hypothesis: the read-only agents have no `Grep` either. Refuted: in this session the `claudetto:search` agents `af0273ae` and `ae7c0cd6` called `Grep` 16 and 32 times. A `work` agent takes the lead's tools, and this build gives the lead no `Grep`. 12 `Bash` calls came from read-only agents whose `tools` line lacks `Bash`, and 6 `bash` calls, all with input `{"command":"true"}`, from Sonnet `work` agents. Claude Code answers each with the tool to use, at a cost of one request. Recorded only.
- `Grep` rejected by ripgrep: 20 calls, all Sonnet subagents, with a look-ahead (`(?!…)`) or nested glob braces (`{a,{b,c}}`). A Claude Code limit. Recorded only.
- `Agent` type `fork`: 9 calls on 2026-11-09 in two www.clawdipedia.cc Sonnet subagents. A subagent has no `fork` type. Recorded only.
- `mcp__claudetto__handoff` "Tool call did not complete: the turn was ended to deliver the message that follows": 6 calls, 2026-11-09 to 11-12. No `handoff` tool is left in `plugins/claudetto/hooks`. Recorded only.
- Model fallback: 3 `model_fallback` warnings on 2026-11-13, at 13:20:52 and 13:32:01 in OpenJoystickDriver `05884638` and 13:26:33 in www.clawdipedia.cc `6953aaa7`, each "Switched to Sonnet 5.5 due to high demand for Opus 5.5" with `trigger: server_error`. The user's eval settings set `CLAUDE_CODE_NO_MODEL_FALLBACK=1` (`research/user-dossier.md`). Whether an interactive lead should fall back is the user's choice. Recorded only.
- Stall stop over a goal: 10 `hook_stopped_continuation` rows, "A Stop hook blocked and no file changed since the last stop, so the turn ends here", in OpenSAD (6), JagFx (2), OpenJoystickDriver `c86d66a7` (1), and www.clawdipedia.cc (1). In each sampled row the block came from the user's `/goal` check ("The goal is not satisfied", "Tasks 5.13, 7.3 and 7.4 remain unticked"), and claudetto's `STALL_STOP` (`classic.Stop/useStopChecks/stop.ts:31`) ended the turn the goal meant to continue. Claude Code logged "Goal paused · a hook ended the turn · send a message to continue" 8 times in the same window (`/tmp/claude-501/scan-notices.ts`). "No file changed" is no sign of a stall for a goal whose work writes no file, such as an analysis. Fix: task 6.1 deletes `stop.ts`.
- Thinking drops: 524 `thinking_drop` rows, `reason: prefix_mismatch`. Hypothesis: a claudetto hook rewrites an earlier message. Prediction: the drops spread over the session. Command: `/tmp/claude-501/scan-drops.ts`. Result: 515 of 524 fall within 10 minutes after a `compact_boundary`, and 510 of all 524 report `firstChangedMessageIndex: 0`, the message compaction replaces (Claude Code computes the index in `chunk-2x9ma4k7.js`, `messagesHistoryChanged`). Refuted: compaction causes them. Recorded only.
- Silent-turn reminder: 1,258 `silent_turn_reminder` rows, up to 155 in one session (`0afb43bf`). Claudetto sets only the text, through `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` (`command.run/useSetup/settings.ts:175`); Claude Code decides when it fires. Read (2.1.323, `chunk-2x9ma4k7.js`): `Sas` adds the reminder when the last 5 assistant messages hold no text, thinking summary, or user-facing tool call (`tengu_hushed_lark`, 5 in `~/.claude.json`), at most 3 times in one silent stretch (`p5n`); a model with `timed_silent_turn_reminder` uses 60 s of silence instead. `g5n` returns `CLAUDE_CODE_SILENT_TURN_REMINDER` before the model's served capability (`yR`), and the variable is a three-state boolean (`H.triBool`; `0`, `false`, `no`, or `off` turns it off, `chunk-nnjc1886.js` `ps`); `_TURNS` and `_SECONDS` set the cadence. P-D10.24a. Hypothesis: the reminder also fires after turns that carry text. Prediction: the 5 assistant messages before this session's reminder at 2026-11-13T16:39:25 each hold a text block. Command: a `bun -e` walk back from that row. Result: 5 messages held only `tool_use` and thinking; the last text was at 16:39:10. Refuted: it fired as designed. Each reminder costs about 35 tokens. Recorded only; the off-switch stays unused while the text serves G-QUIET.
- "File has been modified since read": 21 `Write` or `Edit` calls, all in Sonnet subagents, mostly in worktrees. No installed plugin hooks `Edit` or `Write` (D10.22). Recorded only.
- Read truncation: 51 `read_truncation_notice` rows, each Claude Code's own 25,000-token `Read` cap ("showing lines 1-N of M … Call Read with offset="). P-D10.24b. Hypothesis: leads often stop at the first page. Prediction: many notices have no later `Read` of that path with `offset` or `allow_large`. Command: `bun /tmp/claude-501/scan-truncation.ts`. Result: of the 49 whose banner names a path, 36 were read on and 13 were not, among them OpenJoystickDriver `tasks.md` and `design.md` of `0-6-0-alpha-3` and wiki `Controller-Records.md`. Whether each lead needed the rest is unmeasured. Claude Code's banner already gives the next call. Recorded only.
- Corrections a lead sent to a running subagent: among the `queued_command` rows (2,311: 1,325 task notifications, 489 agent hand-backs, 41 side-agent notes), the larger groups of lead-to-subagent messages are "Stop every `swift build`" (9) and "Do not run `swift test` or `swift build`" (4), memory (D10.10, tasks 4.5 and 4.7); "Commits fail in worktrees (git hooks …)" (5), D10.1 and task 7.10; "Every commit message must follow Conventional Commits" (7), which the `commit-msg` hook already enforces; "Do not run `oxlint --fix-suggestions`" (5); and corrections to a worker's own instructions (13). Each correction costs the lead a `SendMessage` and the worker a turn. Recorded only.
- Output-style reminder: 22,320 `output_style` rows, one per turn, each "claudetto:Concise output style is active. Remember to follow the specific guidelines for this style." Read (2.1.323, `chunk-2x9ma4k7.js`): `Has` adds the attachment on every turn unless the style is `default`, and the renderer writes `${style} output style is active. ${turnReminder ?? "Remember to follow the specific guidelines for this style."}`. Only built-in styles carry `turnReminder` and `waitingTurnReminder` (Proactive, Concise). The plugin loader `z7t` returns `name`, `description`, `prompt`, `source`, `forceForPlugin`, and `keepCodingInstructions`, and the strict frontmatter schema `msr` allows only `name`, `description`, `keep-coding-instructions`, and `force-for-plugin`. A plugin style therefore cannot set or empty its reminder; the default text is fixed. The line is about 20 tokens a turn (estimated, not counted). Recorded only; no lever exists short of the `default` style.
- Prompt snapshots: 2,908 `prompt_snapshot` rows of about 9,200 characters each. Read (2.1.323, `chunk-mepvtc0x.js` `rZi`): Claude Code drops `prompt_snapshot`, `prompt_render_point`, and `deferred_tools_record` before a request, so they cost disk only. Recorded only.
- MCP server failures: 1,877 `deferred_tools_delta` rows; Claude Code sends one when the tool pool or the pending, needs-auth, or failed server set changes (`chunk-2x9ma4k7.js`, `failedChanged`), and again in each context after a compaction. They name a failed server 612 times: `apple-docs` 533 times across 35 sessions, `jscpd` 79 times, all on 2026-11-09. Hypothesis: `apple-docs` flaps. Prediction: OpenJoystickDriver `f4b7e436` shows deltas with the failure cleared between failures. Result: refuted; the failure appears once per context, a few milliseconds before or after each `compact_boundary`, and never clears. `apple-docs` is `bunx apple-docs-mcp-next@latest` in OpenJoystickDriver's `.mcp.json`, outside this repository. A handshake probe of the package was denied by the auto-mode classifier. P-D10.24c. Hypothesis: the package did not exist when the failures happened. Prediction: the registry's first publish time falls after the failures, and no failure follows it. Command: `curl -s https://registry.npmjs.org/apple-docs-mcp-next | jq .time`, then a `bun -e` split of the failures at that time. Result: confirmed; the package was first published at 2026-11-11T22:34Z (2.0.0 at 22:39Z), all 533 failures across OpenJoystickDriver, claudetto, OpenSAD, www.clawdipedia.cc, and versionlens-redux came before it, none came after, and 11 OpenJoystickDriver sessions loaded `mcp__apple-docs` tools afterwards. Resolved by publication. Recorded only.
- Hook context: 1,603 `hook_additional_context` rows. Claudetto's own: the `SessionStart` Bun line (501, deleted by task 7.4), the `prompt.submit` budget line (577), the Stop "Background tasks still running" notice (440, D10.12), and the stated-constraints line (84). Recorded only.
- Task and goal status: 457 `task_status` rows (293 running agents, 130 running shells, 34 finished agents) and 115 `goal_status` rows (107 unmet, 8 met). Hypothesis: `task_status` repeats an unchanged status within one context. Prediction: some repeats of a task's status have no `compact_boundary` between them. Command: a `bun -e` scan that keys each row by task id and compaction count. Result: refuted; all 96 repeats follow a compaction, which re-announces running work by design. Recorded only.
- Refusals: 3 `stop_reason: "refusal"` replies, all in one Sonnet subagent of OpenSAD `005f897e` (`claudetto:Heracles`, "Catalogue known public exploits", 2026-11-10). Each holds thinking only, and its `stop_details` is `category: "cyber"`, "Cyber safeguards flagged this message. You have Defense Access", `cyber_verification` tier `c`. The flag came right after the agent read `.tools/ref/Stick-Arena-CredBot/` (`README.md`, `Procfile`, `requirements.txt`), a cheat bot that the lead's prompt framed as defensive analysis for the owner's own server. The classifier runs on Anthropic's side, and no plugin setting or text reaches it. Recorded only.
- Unfinished replies: 5 assistant rows with `stop_reason: null`. Hypothesis: they are streamed partials that a later row with the same `message.id` finishes. Prediction: each id also has a row with a stop reason. Command: a `jq` group of each session's assistant rows by `message.id`. Result: refuted; no null row has a finished sibling. Four are followed by `[Request interrupted by user]` (OpenSAD `335fc9c0`, claudetto `5709ef73` after a rejected tool call, versionlens-redux `03862ab5`, and a stopped Haiku probe agent in claudetto `17435f50`). The fifth, claudetto `60fc9776`, is a whole reply followed by the user's `/export`. Each is an interrupted reply, not a defect. Recorded only.
- Once-per-context attachments: hypothesis: one of the other model-facing attachments repeats within a context, as `nested_memory` did (D10.27). Prediction: some type has many identical rows with no `compact_boundary` between them. Command: `bun /tmp/claude-501/attsize.ts`, which keys each row by type, compaction count, and body. Result: refuted; each type repeats at most 6 times in 840 transcripts. The largest per context are `sandbox_instructions` (1,291 rows, 7,589 characters on average), `invoked_skills` (232, average 5,212, max 22,526, the skills a compaction carries over), `skill_listing` (1,360, average 2,989), and `output_style_instructions` (456, average 2,981). The sandbox text ranges from 5,490 to 8,400 characters, because Claude Code lists about 51 write-deny paths and cuts the rest as "and N more" (76 to 96 more). So the `sandbox.filesystem` entries of task 5.1 cannot grow it past that cap. Recorded only.

### D10.25 Side-Agent Notes and User Complaints, 2026-11-08 to 11-13

`/tmp/claude-501/scan-notes.ts` lists each you-should-know note that a person forwarded to a lead ("Here is a note offered by a side agent:"), with the lead's next reply. It skips compaction summaries, which quote earlier notes; a first pass that counted them gave 22, and those repeats were not repeated offers. `showReply` already drops a line shown before (`claudetto-you-should-know/hooks/register.ts:80-84`).

- Count corrected: 51 notes reached a lead, not 10. The first count read only user rows, the form a note takes when the lead is idle. A note that arrives while the lead works is a `queued_command` attachment, rendered as "The user sent a new message while you were working … Address the message above as you continue" (`origin.kind: human`); `scan-notes.ts` now reads both forms, and 41 notes came that way. P-D10.25a. Hypothesis: a lead drops a queued note more often than a forwarded one. Prediction: fewer queued notes are taken up in the lead's text for the rest of the turn. Command: `bun /tmp/claude-501/scan-note-uptake.ts`, which counts a note as taken up when that text names the note or side agent or quotes one of its backticked tokens, walking past compaction summaries. Result: 23 of 41 queued notes and 9 of 10 forwarded ones. The match is a floor on uptake: `e203f4ab` dropped the change its note warned of, and OpenSAD `1a6fd0d9` committed the stashed `README.md` 10 minutes after its note, each without naming the note. In www.clawdipedia.cc `6953aaa7` the note arrived at 13:02:14.626 and the call it warned of ran at 13:02:15, so it came too late, as in D10.16. No queued note was shown to have been ignored with harm. Recorded only.
- Of the ten forwarded notes, the lead's check showed three were wrong:
  - versionlens-redux `b3514a27` at 2026-11-10T14:34: "release v0.6.3 … its verify run never passed". The CI run `42831271159` for `b0286a2d` had passed.
  - claudetto `cd2e74f0` at 2026-11-12T17:19:47: "The PR branch on origin was force-pushed". At 17:20:07 the lead ran `git merge-base --is-ancestor` over the last six pushes of `origin/feat/2.1.321`, and each was a fast-forward.
  - claudetto `cd2e74f0` at 18:08:40: "A commit … reached origin when made, though no git push was run". `.githooks` holds only `commit-msg` and `pre-commit`, and neither pushes. The lead answered that the note "repeats my own unchecked guess from earlier", so the side check took the lead's guess as fact.

  Two more were partly out of date: www.clawdipedia.cc `d9e65e3e` and claudetto `b8e1aaed`. Each wrong note cost the person a forward and the lead a checking turn. At 17:19:51 the old remark gate also denied the lead's first check of the note (D9.7). Recorded only: the design keeps `claudetto-you-should-know` as it is beyond the folder moves (`design.md:46`).
- Desktop disturbance: the search agent's class of 2 held only one incident, OpenJoystickDriver `b429b5a4` (D10.23). The other, JagFx `f562bb33` at 2026-11-12T11:09:55, asked ahead of time for a `JAGFX_HIDDEN` flag, and nothing had raised a window before it.
- Push before verify: www.clawdipedia.cc `a663e2b2` at 2026-11-10T10:36:44. The note was right, and the lead confirmed that `7171a909` "reached GitHub before the note arrived", after a `just verify` with 27 failures. Recorded as D10.5.
- Complaint map. A search agent read the 545 user lines of `/tmp/claude-501/user.txt` and mapped each complaint to a task or a D entry: stopped early or left gaps (20 lines; tasks 8.5, 8.6, D10.4, D10.23), pushed work onto the user (7; 8.5, 6.2, D10.9, D10.11), guessed or made up a fact (9), ignored a standing rule (8), unrequested work (2; 8.6), leftovers (9; 7.7, 7.8, D10.11), desktop (3; D10.23), RAM (3; D10.10, 4.5, 4.7), and a guard or hook misfire (13; 5.3, 5.5, 6.1, 7.2, 7.10, 7.11). The counts are the agent's own tally. Each unmapped line that names a mechanism was checked:
  - claudetto `cd2e74f0` at 2026-11-12T17:00, "you literally have the token in .env": the lead ran `claude setup-token` three times. The root prompt line "Look for a credential in repo's `.env` files, then the environment" landed in `378782f3` at 2026-11-13T00:59, after it. Covered.
  - OpenSAD `3308c572` at 2026-11-11T15:38, a made-up `$id` URL: the root prompt line "Write a URL or name into a file only from a source you read" landed in the same `378782f3`. Covered.
  - claudetto `d21b8a3c` and `cd2e74f0`, bedrock rules that clash with the hook loader (`bedrock/ISSUES-2026-11-10.md` items 6 and 7). The agent quoted "scoreReply is not a function"; that text is in no session but this one. The real `cd2e74f0` error was "cannot import `node:fs/promises` (from hooks/hygiene/worktrees.ts)". Now `typescript-bedrock/oxlintrc.json:363-368` turns `func-style`, `prefer-await-to-then`, and `no-callback-in-promise` off for `**/hooks/**`, and `git grep` finds no `node:` or `bun` import in a shipped hook. Fixed.
  - Guesses and partial reads (claudetto `aea6b517` at 2026-11-10T08:57 to 09:33, and this session): the root prompt `<evidence>` block asks for a labelled claim and a check. Task 10.3 measures the text.
  - OpenSAD `f6e32172` at 2026-11-12T11:32, "Yes you can.": the lead had declined a change as "outside the four goal items" (8.6, D10.4), after the Stop grader blocked its first draft as crediting the user (D10.26).
  - "Word regex or implementation prose" as a fix (claudetto `aea6b517` at 09:22, this session at 13:52): task 6.3 now carries the constraint.

### D10.26 The Stop Grader Misses What the User Typed as a Slash Command

`claimTurn` (`plugins/claudetto/hooks/verify.ts:55-92`) gives the grader the person messages that `isPersonMessage` (`verify.ts:11-15`) accepts, and that filter drops each user row whose text starts with `<`. A slash command's row starts with `<command-name>`, so the grader never sees a `/goal` condition or any other command's arguments.

- OpenSAD `f6e32172`: at 2026-11-12T11:18:56 the user ran `/goal` with four items. At 11:31:44 the `credited` fault blocked a reply that said "the four items you set", and the lead resent it as "the four goal items". The user answered "Yes you can." to the deferral that followed.
- P-D10.26. Hypothesis: `credited` blocks cluster after slash commands. Prediction: a share of the blocks come in lead sessions where the user typed a slash command earlier. Command: `bun /tmp/claude-501/scan-credited.ts`, over all lead transcripts. Result: 95 blocks in 32 sessions; 55 came after a slash command and 19 after a `/goal`. Confirmed for `f6e32172`; the scan shows exposure, not each block's cause.
- Fix: task 6.3. The prompt-type Stop hook that replaces the grader gets the user's slash-command arguments, the `/goal` condition among them, as the user's words.

### D10.27 Setup Leaves Retired Rules Installed

`rulesPart` (`plugins/claudetto/hooks/command.run/useSetup/rules.ts:82-90`) offers only the names in `RULES`. Commit 378782f3 (2026-11-13) deleted `rules/noNarratingComments.md` and `rules/useEdgeCaseReport.md` and dropped the `paths: "**/*"` frontmatter from the rest, but nothing removes a rule the plugin stopped shipping. Both files still sit in `~/.claude/rules/claudetto/` with that frontmatter, so Claude Code loads them as path-scoped rules: a `nested_memory` attachment after the first file read, and again after each compaction.

- P-D10.27. Hypothesis: `nested_memory` rows repeat within one context. Prediction: many rows name a path already injected since the last `compact_boundary`. Command: a `bun -e` scan of 5 days of transcripts that sorts each row into first in the transcript, first after a compaction, or repeat in the same segment. Result: 11,097 rows; 6,226 first, 4,861 after a compaction, 10 repeats. Refuted: Claude Code injects each path once per context. In this session, all 44 rows are the two retired rules, one pair at the start and one after each of 21 compactions.
- The five most-injected paths are claudetto rules (1,123 to 1,234 rows each): the two retired ones, and `useLeastCode`, `noUnrequestedEdits`, and `noImpossibleStateGuards`, which held the same frontmatter before 378782f3 (`git show 378782f3^:plugins/claudetto/rules/<name>.md`). The two retired files are 337 bytes together, about 85 tokens per context (estimated), and they keep two rules the plugin withdrew in force.
- P-D10.27b. Hypothesis: a path-scoped rule's load breaks the prompt cache. Command: `bun /tmp/claude-501/scan-cache.ts 5` marks a rebuild where a reply wrote more than 20,000 cache tokens and read less than half of what the reply before it read, within 5 minutes and with no `compact_boundary` between; `scan-cache-cause.ts` tallies the rows between the two requests. Result: 82 such rebuilds wrote 5,732,297 cache tokens in 5 days; each read fell to the cached system prefix alone (5,722 tokens for a lead, 3,708 for a subagent). A `nested_memory` row came before 73 of the 82 (89%), against 0.8% of 49,059 requests with no rebuild. P-D10.27c. Hypothesis: the load rewrites an earlier message. Prediction: in the fake Messages API, the request after a `Read` that loads a `paths: ["**/*"]` rule changes the hash of an earlier message. Result: the rule arrived as a text block in the newest message, and the system, tools, and earlier messages hashed the same. Refuted. The transcripts' `api-request` rows agree: at each rebuild, `keep` equals the prior request's message count, and `shapeHash`, model, effort, and thinking settings are unchanged. P-D10.27d. Hypothesis: a mid-conversation `role: "system"` message causes it. Result: 73 of 82 rebuild requests added none. Refuted. P-D10.27e, billed with the user's approval. Hypothesis: a rule load breaks the cache on the real API. Prediction: in a project whose `.claude/rules/` holds a `paths: ["**/*"]` rule, the reply after `Read` reads only the system prefix from cache, and in a project without it the read keeps rising. Command: `claude -p` with `--model claude-haiku-5-5 --setting-sources project --strict-mcp-config --no-session-persistence --output-format stream-json`, one tool per reply: `Bash`, `Read`, `Bash`, `Bash`. The free fake-API run under the same flags showed the rule loading after the `Read`. Result: with the rule, cache reads went 0, 16,248, 16,350, 16,573, 16,843; without it, 10,666, 16,248, 16,384, 16,523, 16,625. Refuted: one rule load did not rebuild the cache. Cost $0.0065 by Claude Code's `total_cost_usd`; the weekly budget line stayed at 78%. The 89% correlation stands unexplained. Position: counting replies since session start or the last compaction, the 82 rebuilds fall at reply 1 to 3 (3), 4 to 10 (25), 11 to 50 (52), and past 50 (2), so they are not a session-start effect. The billed probe differed from those sessions in model (Haiku against Opus and Sonnet), plugins and user settings (none loaded), and context size (16,000 against 23,000 to 132,000 cached tokens); which of these matters is unmeasured. Task 7.15 removes the two files, which drops claudetto's share of the `nested_memory` rows.
- Fix: task 7.15.

### D10.28 A Lead's `model` Argument Puts Subagents on Opus

The person's rule is that no subagent runs on Opus or Fable. Over all 840 transcripts (2026-11-08 to 11-13), subagent replies came from `claude-sonnet-5-5` 30,964 times, `claude-opus-5-5` 207 times, and `claude-haiku-5-5` 12 times; no Haiku subagent passed 100,000 tokens of context. The 207 Opus replies are four `claudetto:work` agents: OpenJoystickDriver `05884638` ("F15 controller record name field"), www.clawdipedia.cc `6953aaa7` ("Re-anchor manual schema overrides"), and this repository's `17435f50` ("Spec deltas: prompts and conduct", "Spec deltas: gates and setup"). Each parent `Agent` call passed `model: "opus"`, as the root prompt's `<delegation>` block invites ("keep design across files, or pass `model: opus`", `plugins/claudetto/hooks/texts.ts:21`). The `Agent` tool's own description says its `model` argument takes precedence over the agent file's `model`, so the agent files of design.md cannot hold the rule by themselves.

- P-D10.28a. Hypothesis: an `agent.spawn` mod sees the lead's `model` argument and can override it. Prediction: with a lead `Agent` call carrying `model: "opus"`, the event shows `model: "opus"`, and a mod that sets `claude-sonnet-5-5` sends the subagent request to Sonnet. Command: a fake Messages API (`/tmp/claude-501/probe-spawn-model/stub.ts`) whose first answer is that call for `general-purpose`, and `claude -p --model opus --plugin-dir` a probe plugin, with a fake key, a temp `CLAUDE_CONFIG_DIR`, and `--debug-file`. Result: confirmed; the event held `model: "opus"`, `parentModel: "claude-opus-5-5"`, `subagentType`, and `provider`; without the rewrite the subagent request went to `claude-opus-5-5`, and with it to `claude-sonnet-5-5`. No paid call.
- P-D10.28b. Hypothesis: dropping `model` from the event lets the agent file decide. Prediction: for a plugin agent with `model: claude-haiku-5-5`, the lead's `opus` wins without the mod, and the request goes to Haiku when the mod drops the key. Command: as in P-D10.28a, for `probe-spawn:probe-agent`. Result: confirmed; `claude-opus-5-5` without the mod and `claude-haiku-5-5` with it.
- A mod that ran `Bun.write` failed with "ReferenceError: Bun is not defined": a mod runs in a hooks worker with no `Bun` global, and `$.fs` works there.
- Fix: task 7.16.

### D10.29 A Burst of Rule Reminders Moves the Cache Breakpoint Past the Lookback

This explains the 82 rebuilds of P-D10.27b and the 89% `nested_memory` correlation. Claude Code sends one moving message breakpoint, on the newest message, beside the cached system blocks. The Messages API checks at most 20 positions back from a breakpoint for an earlier cache write, "counting the breakpoint itself as the first", and "a run of consecutive `tool_use` blocks counts as one position, and so does a run of consecutive `tool_result` blocks, so a turn with many parallel tool calls doesn't push the previous request's entry out of the window on its own" (platform docs, `build-with-claude/prompt-caching`, "How automatic prefix checking works", cited). Each `nested_memory` attachment is its own `<system-reminder>` text block, so each counts as one position. The first file read of a context loads every path-scoped rule at once: in OpenJoystickDriver `f4b7e436` at 2026-11-11T15:31:15, 22 rules arrived in one step, 5 from `~/.claude/rules/claudetto/` and 17 from that project's `.claude/rules/`. The read then fell back to the 5,722-token system prefix, and 41,147 tokens were written again. A wide parallel batch is not a cause.

- P-D10.29a. Hypothesis: the rebuilds come from a change in `cacheControl` itself. Command: `bun /tmp/claude-501/scan-cc-norm.ts`, which masks the message breakpoint's index and compares consecutive main and agent requests over 5 days. Result: the masked layout stayed the same in 43,754 forward moves across all pairs. Of the 82 rebuilds, 67 had a masked change and 11 had none, and their breakpoints sat at `content,19` to `content,25`, at the end of wide parallel batches. Partly refuted: the layout changes, but only where the breakpoint lands deep in one message.
- P-D10.29b. Hypothesis: the rebuilds come where the breakpoint moved 20 or more blocks. Prediction: rebuilds cluster at distances of 20 and up, and other moves are mostly under 20. Command: `bun /tmp/claude-501/scan-bp-distance.ts`, which rebuilds each request's message list from `keep`, `tail`, and the blob block counts, and measures the block distance between consecutive breakpoints. Result: of all moves, 53,465 were 0 to 19 blocks, 336 were 20 to 29, and 60 were 30 or more. Rebuilds: 9 at 0 to 19 blocks (739,854 cache-write tokens), 67 at 20 to 29 (4,696,435), and 6 at 30 or more (296,008). Confirmed: 73 of the 82 rebuilds and about 5.0M of 5.7M cache-write tokens follow a move of 20 or more blocks. The rule loads of D10.27 came alongside, because a wide batch of `Read` calls is where rules load.
- A mod cannot add the second breakpoint: `TurnStepInput.messageCount` is pinned, and "the messages belong to the engine" (clawdipedia `extend/mod-api/types/turn-prompt/suggest-skill-turn`, cited).
- P-D10.29c. Hypothesis: a `turn.step` hook that passes no more than 8 `tool` chunks per step keeps each step under 20 blocks, and the engine records only the calls it passed. Prediction: on the fake Messages API, after an answer of 12 parallel `Bash` calls, the next request holds 12 `tool_use` and 12 `tool_result` blocks without the cap and 8 and 8 with it. Command: `/tmp/claude-501/probe-batch-cap/stub.ts` and a probe plugin, `claude -p go --setting-sources "" --plugin-dir`, with a fake key, a temp `CLAUDE_CONFIG_DIR`, and the cap switched by a marker file. Result: confirmed; without the cap, 12 and 12, and with it, 8 and 8. The hook saw the chunks in order (`tool:i`, then `input:i`, with `engine` chunks between). The return value of `next` still counted 12 `toolUses`, but the engine recorded 8. A dropped call leaves no trace in history, so the model sees only the 8 it seems to have asked for and must ask for the rest in a later step. No paid call.
- P-D10.29d. Hypothesis: the rebuilds follow lookback positions, not raw blocks. Prediction: once each run of `tool_use` or `tool_result` blocks counts as one position, the steps past 21 positions nearly all rebuild, and the steps below almost never do. Command: `bun /tmp/claude-501/scan-lookback4.ts` over all 841 transcripts (2026-11-08 to 11-13). It rebuilds each request's messages from `keep`, `tail`, the `api-request-blob` rows, and the assistant rows, which have no blob, and counts the positions between consecutive message breakpoints, for steps within 5 minutes of a warm request and with no compaction. Result: confirmed. Steps of 21 positions or fewer: 46,612, with 22 rebuilds (0.05%). Steps of 22 to 25: 88, with 56 rebuilds (63.6%). Steps over 25: 44, with 43 rebuilds (97.7%). Counted by raw blocks (`scan-lookback3.ts`), steps over 21 of mostly `tool_use` and `tool_result` (22 and 22, distance 47) kept their cache. The rebuilt steps held 19 to 22 `<system-reminder>` blocks. Rebuilds past 21 raw blocks wrote 6,419,485 cache tokens in the archive. P-D10.29b's breakpoints at `content,19` to `content,25` were the reminder blocks of one user message, not a parallel batch.
- P-D10.29c's cap is therefore void. The engine counts a parallel batch as two positions, so capping it saves nothing, and it costs the model calls it seems to have made.
- P-D10.27e agrees: one rule adds one position, and it did not rebuild.
- A mod cannot merge the reminders. A `prompt.attachment` hook sees one attachment and returns its text or `null` (clawdipedia `extend/mod-api/types/turn-prompt/attachments-context`, cited), so joining a burst would rest on the order in which the hooks fire. No mod event writes `cache_control` (clawdipedia `how-it-works/request-and-cache`).
- Mitigation at the source: a rule with no `paths` loads with the memory at session start, not as a reminder after a file read. claudetto's share ends with task 7.15: of the 9 files in `~/.claude/rules/claudetto/`, only the two retired ones still have `paths:` (`grep -l '^paths:'`, observed). Outside this repository: the 17 `paths` rules in OpenJoystickDriver's `.claude/rules/` still make a burst of 17 positions plus the step's own blocks, at the edge of the window. Merging them into one file, or dropping `paths: "**/*"` from them, is a change to that repository; the user decides.
- Fix: task 7.15, then task 7.17.

### D10.30 The Kill Gate Takes Pids From Any Number and Made the Agent Hand the User Its Own Recipe

`startedPids` (`plugins/claudetto/hooks/tool.check/useBashRules/kill.ts:81-91`) takes each number that `NUMBER` (`kill.ts:76`) matches in the result of any Bash call that put something in the background. `killVerdict` denies each other pid (`kill.ts:121`). The pid list is therefore a word regex over output, and the denial tells the agent to "Leave it running".

- OpenJoystickDriver `b429b5a4`: at 14:25:11Z the agent ran `just install-fast-dev` itself. At 16:25:03Z a staging script ran `kill -TERM 37064`, the app the recipe had installed. At 16:25:11Z the gate denied it: "37064 is not a process this session started… Leave it running… Your own commands started these pids: 33, 18337393, 20, 67, 15757, 25, 501, 05884638." None of those eight is a process. At 16:25:16Z the agent wrote "I'm not allowed to stop the running app" and gave the user `! just install-fast-dev`; the user answered "you could've done that your[self]".
- This session, `17435f50`, 2026-11-13: a probe stub started in the background with `SP=$!` was refused `kill $SP`. The gate's list of the session's own pids was "0, 90, 89, 77, 47331, 120, 97, 78", which are a port number and line counts from earlier output. The stubs were then stopped with `TaskStop`.
- The same denial came in `1b56d9ba` (for `$p`, 2026-11-10), `f4b7e436` (39648, 11-11), and `c86d66a7` (45087, 11-12); `b429b5a4` holds it 11 times.
- The root prompt's rule "A denial declines the action, not the tool: reach its effect through no other tool or agent unless the denial names one" (`plugins/claudetto/hooks/texts.ts:25`) then makes a wrong denial final.
- Fix: tasks 5.3 and 7.8 delete `kill.ts`. Until they land, nothing should be added to it.

### D10.31 Write Asks Before It Writes to Claude Code's Own Temp Folder

The root prompt sends probes to `/tmp` (`texts.ts`, `<evidence>`), and the project's `CLAUDE.md` names `/tmp/probe-*`. The sandbox lets Bash write under `/private/tmp`, but in this session a `Write` to `/tmp/claude-501/scan-cc-norm.ts` opened a permission dialog that offered "always allow access to /tmp/claude-501, /private/tmp/claude-501". The user called the dialog a fault. Each probe step then costs the user a click, or the agent turns to the shell, which the gate refuses for whole-file writes.

- The sandbox sets `TMPDIR=/tmp/claude-501` (observed), so pointing probes at `$TMPDIR` alone changes nothing.
- P-D10.31. Hypothesis: `permissions.additionalDirectories` holding the temp folder stops the ask. Prediction: on the fake Messages API, a scripted `Write` to `/tmp/claude-501/probe-write-tmp/out.txt` from a project in `repo/` is refused in default mode and written with the setting. Command: `/tmp/claude-501/probe-write-tmp/stub.ts`, `claude -p go --setting-sources "" --settings '<json>'`, with a fake key and a temp `CLAUDE_CONFIG_DIR`; the stub logs the `tool_result`. Result: refused ("Claude requested permissions to write to … but you haven't granted it yet") with no setting, with `additionalDirectories` of `/tmp/claude-501` or `/private/tmp/claude-501`, with `sandbox.enabled`, with `allow` `Write(//tmp/claude-501/**)`, with `allow` `Edit(//private/tmp/claude-501/**)`, and with `defaultMode: acceptEdits` alone. Written with `allow` `Edit(//tmp/claude-501/**)`, and with `additionalDirectories` plus `acceptEdits`. Refuted as stated: the folder needs an `Edit` allow rule, a `Write(...)` rule does not cover `Write`, and the rule's path must use the form the call uses, since a `/private/tmp` rule missed a `/tmp` path. No paid call.
- Fix: task 7.18.

### D10.32 A Read-Only MCP Call Asked Because a Guard Timed Out

On 2026-11-13 at 17:46 UTC, a call to the clawdipedia `read_page` tool opened a dialog: "Hook tool.check requires confirmation for this tool: The gate failed: timeout. A person must approve this call. [plugin:claudetto]". The installed claudetto (`~/.claude/plugins/cache/xsyetopz/claudetto/8ac3516a4a55-cd50c5e0`) still has the `tool.check` `.catch` that answers `ask` with `checkFault` (`register.ts:145-147`, `chain.ts:16-21` of that copy). Task 7.5 deleted both in the repository, but the installed copy predates it. The user pasted six such dialogs into session `17435f50` on 2026-11-13, between 13:49 and 17:59 UTC; most were on Bash calls, and one or two were on the clawdipedia MCP tool.

The guard that overruns is `pinCheck` (`prompt.submit/useConstraintPin/pin.ts:101-109`). It awaits `state.pending`, the Decider's ledger read of the latest person message, on every tool. The hook clock stops only during the hook's own `next` and `$` calls (clawdipedia `extend/mod-api/events/hooks`, Budgets: 10 s per event). The ledger read's model call belongs to the `prompt.submit` dispatch, so `tool.check` pays for the whole wait. The fallback's own timeout is 20 s (`decider/fallback.ts:12`), twice the budget. A pinned rule can only break `Bash`, `Edit`, `NotebookEdit`, or `Write` (`pin-rules.ts:73-88`), yet the wait applies to `Read` and every MCP tool too.

- P-D10.32a. Hypothesis: the transcript replay in `gateCheck` overruns on a long session. Prediction: resuming a copy of the 49 MB transcript puts `recreates` near 10 s. Command: the fake-API pattern with `--resume 17435f50…`, `--debug-file`, and a plugin copy that logs timings. Result: refuted. `$.session.messages()` returns the 94 calls since the last compaction; the replay took 43 ms, `ownVerdict` 1 ms, and `next.budget.remainingMs` read 9985.
- P-D10.32b. Hypothesis: `pinCheck`'s wait on the ledger read overruns. Prediction: with the side model delayed 15 s, the first tool call's `tool.check` is skipped at 10 s. Command: the stub with `SIDE_DELAY_MS=15000`, `claude -p "read the readme"`, the timed plugin copy. Result: confirmed. "claudetto: tool.check hook skipped: ran past its 10s budget"; `tool.check settled in 10010.9ms`; `pinCheck waited 14948ms` with `remainingMs: 0`.
- P-D10.32c. Hypothesis: `prompt.submit`'s own wait for the first ledger read after a resume (`pin.ts:68-70`) overruns the same way. Prediction: it is skipped. Result: refuted. It settled in 15072.8 ms without a skip, because the model call is its own `$` call. The same run showed `classic.Stop settled in 45155.8ms`: three times the 15 s delay, so the Stop checks likely ran three side-model calls in sequence (inferred, not logged). That holds the end of each turn as long as the side model takes.
- Fix: task 7.19, then task 7.20.
- The user pasted one more such dialog on 2026-11-13 in `17435f50`. It was on a read-only Bash `grep` for the test kit's `mock.clock`, and it came after the user's message about agents handing work back to the user. That message started a ledger read, so this fits the cause above.
- Fixed by task 7.20, which holds until tasks 6.1 and 6.5 delete this code.
  - `pinCheck` now passes any tool other than `Bash` and the writers at once.
  - `pinCheck` and `pinCall` now wait for the ledger read only until `next.budget.remainingMs` less 1 s, through `withinBudget` (`hooks/tools.ts`), which `price-step.ts` also uses. After that they judge by the ledger as it stands.
  - The `classic.Stop` checks now start their side-model calls together. They still settle in their old order, so a block still wins over a later check's fault.
  - Tests: "a Read while the ledger read hangs settles at once" and "a Bash call while the ledger read hangs settles within the hook's budget" (`pin.test.ts`), and "the Stop checks start every side-model call before any answers…" (`useStopChecks/register.test.ts`). Each failed before the change; the Stop test got "Expected: > 1, Received: 1". After it, `claude plugin test plugins/claudetto` passed 1555 tests with 0 failures, and `just verify` exited 0.
- P-D10.32b rerun on the repository's plugin (`--plugin-dir plugins/claudetto`, the same stub with `SIDE_DELAY_MS=15000`). Prediction: no skip, and `classic.Stop` near one delay. Result: confirmed. No "ran past its 10s budget" line appeared; `tool.check settled in 15.8ms`, against 10010.9 ms before; `classic.Stop settled in 15194.3ms`, against 30116.7 ms before.
- The same run logged "The wait ended early (HooksError: This operation was aborted)" on a wait that had not timed out. `withinBudget` aborts its own sleep once the work wins the race, and the `catch` logged that abort as a fault. The old `readingOf` in `price-step.ts` had the same `catch`. The fix logs only an abort that the race did not cause. The test kit cannot show the fault: with `mock.clock`, and with a `clock.sleep` handler that never answers, an aborted `$.clock.sleep` never rejects, so a unit test passes both before and after the fix. The probe is the check: rerun after the fix, the log line is gone, `tool.check` took 20.4 ms, and `classic.Stop` took 15082.2 ms.

### D10.33 The Docs Tool Refuses an H3 It Lists

Outside this repository: the clawdipedia-docs `read_page` tool takes a `section_heading` that its description calls an H2. For the H3 headings that the same page lists, it answers "No H2 section". Reading by `offset` works. Owner: the clawdipedia-docs plugin; this change does not fix it.

### D10.34 Reports From Other Users: Fewer Rules, Less Prompt

Reported by the user from a Discord thread, not measured here. One user wrote that they removed over 80% of their rules, moved the rest to mechanical checks, and set goals and a bar instead; the output "ended up being way better, less churn and ended up reducing usage". A second user replied: "no point in having 100k of prompt per turn for 10 words added".

The user also passed a Reddit r/ClaudeAI thread, captured 2026-11-13, "Anthropic are discouraging using Fable as a coordinator for Projects" (80 of 86 comments). Most commenters put Fable on architecture, planning, or review, and Sonnet or Haiku on routing and dispatch; one wrote "just use fable as /advisor". This matches the model rule of this change: subagents run on Sonnet and Haiku, and Fable stays an opt-in advisor.

- A second Reddit thread the user passed, on Claude Desktop freezing on Linux, is about the Electron app and does not touch this change.
- These match D10.24 and D10.30: most gate denials blocked correct work, and a gate's prose turned one wrong denial into a hand-off to the user. Hypothesis: fewer prompt rules and gates lower both the cost per turn and the churn. Task 10.2 measures the request size against the 2.1.322 baseline, and task 10.3's A/B run measures the outcome.

### D10.35 Archive-Wide Measures

Each count below is over all of `~/.claude/projects/`: 841 transcripts, the first at 2026-11-08 12:20 UTC and the last at 2026-11-13 18:06 UTC, with 3, 100, 137, 240, 274, and 86 sessions per day. No older transcript exists, so the archive is whole. 825 of the 841 hold `api-request` rows (observed).

- Cache rebuilds by time gap and the size of the step before, from `scan-deep2.ts`. A step of 1 to 4 calls rebuilt 0.2% of the time within a minute (6.18M tokens written), 5.9% at 1 to 5 minutes (5.67M), and 95% after more than an hour (1.76M). A step of 5 to 8 calls rebuilt 1.6% within a minute and 28.2% at 1 to 5 minutes. A step of 9 or more calls rebuilt 2.2% within a minute (0.31M) and 18.2% at 1 to 5 minutes (0.27M). Rebuilds wrote 17.2M of 151.5M cache-write tokens. Past an hour the 1-hour TTL has run out; that cost is not a defect.
- What changed before a fast rebuild, from `scan-shape.ts`, which compares each request with the one before it from the same query source within 5 minutes. A full message replacement (`keep` 0, mostly a compaction) came before 172 rebuilds in 1,410 steps (12.2%). Steps with no change came before 119 rebuilds in 46,936 (0.25%), and D10.29 explains them. A model change rebuilt every time: 9 rebuilds in 9 steps. The four the scan printed fell on 2026-11-13 between 13:22 and 13:41 UTC.
- Those model changes are the five `model_fallback` rows ("Switched to Sonnet 5.5 due to high demand for Opus 5.5"), between 13:20 and 13:32 UTC on 2026-11-13. The cause is on the platform side.
- Models: the main loop ran 4,634 requests on Mythos (425M tokens). D10.28 covers the subagents.
- 125 interrupts. Only 2 rows written by the engine name a skipped hook, both on 2026-11-10, so the transcripts do not record a `tool.check` skip. The dialogs of D10.32 that the user pasted are therefore a lower bound.

### D10.36 A Side-Agent Note Ignores the Person's Popup Answer and Hands the Edit to the User

In OpenJoystickDriver `b429b5a4` on 2026-11-13, the agent asked through `AskUserQuestion` at 18:18:16Z whether to replace the 9.22 note in `tasks.md`. The user answered "Replace and commit" at 18:18:23Z. At 18:18:26Z the `you-should-know` hook denied the agent's `Edit`: "This edit replaces the open decision note … Put this note in your reply to the person, and wait for their answer". At 18:18:27Z it denied the same way a `Write` of a commit message to `/tmp`, which does not touch the note. The agent then wrote "The hook doesn't see your answer … I won't get around the hook with another tool" and gave the user a `! sed -i` command for an edit it could make itself.

- Cause: once a note is offered in a turn, `startCheck` (`plugins/claudetto-you-should-know/hooks/register.ts`) returns it for every later call of that turn, and `tool.call` denies each of them. The `AskUserQuestion` branch logged the question and never read the answer. A popup answer does not end the turn, so the note kept blocking whatever the person said.
- The deny tells the agent to wait for the person's answer, but the hook did not accept the answer. Together with the denial rule of the root prompt (D10.30), that left the hand-off as the agent's only route.
- Failing test first: "a popup the person answers while this turn's note is open closes the note, and the next call runs" (`register.test.ts`). It failed with the deny text above, then passed after the fix (92 of 92, `claude plugin test plugins/claudetto-you-should-know`).
- Fix: task 7.21.

