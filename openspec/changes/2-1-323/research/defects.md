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

Hypothesis, not run: at `effort: "high"`, thinking spends part of the 2,106-token cap, and the JSON is cut off. The probe is a paid Haiku call that logs `usage` and the reply's tail. It waits for approval (task 10.3).

Structural fix: delete the decider fallback. A judgment that needs a model moves to a prompt-type classic hook, as task 6.3 does for the Stop faults. The engine sends that hook's prompt and reads its verdict, so no plugin parses model prose.

### D9.6 The Hygiene Sweep Deletes Live Probe Folders

Faults:

- `/private/tmp/opensab-pentest/`, with its scripts and server log, was deleted mid-session.
- `/tmp/claude-501/probe-advisor` was gone before the user ran its command ("no such file or directory").
- `/tmp/ojdcli` was gone while its app (pid 41356) still ran.

Cause: `hygiene/sweep.ts:173,182` trashes each top-level folder under the temp roots that no file changed in for `probeMinutes` (default 60), by `find -mmin` (`temp.ts:45-84`). Any session start runs it. An idle hour does not mean a session has ended: the folder of a live session that waits on the user, a build, or a test qualifies.

Structural fix: decide by ownership, not by idle time. Sweep a folder only when the session that made it has ended. The session's own end event (classic `SessionEnd`, its payload to be probed) removes what that session made, and the start sweep removes nothing a live session holds open (`trash.ts:208` already lists open files through `lsof`). Hypothesis, to be probed: whether `$TMPDIR` (`/tmp/claude-501`) is cleaned by Claude Code itself, which would remove the need for the sweep there.

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

