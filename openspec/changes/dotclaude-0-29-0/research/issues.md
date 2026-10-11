# Issues found in the planning session of 2026-10-11

This file holds the issues and user decisions of the planning session, so that a new session has them.
The proposal, specs, design, and tasks of this change include these items.

## Decisions of the user (2026-10-11)

- 0.29.0 is one change and a major fix release for the faults of 0.28.0.
  The rules of the archived 0.28.0 design, such as D35, do not bind 0.29.0.
- The generator makes the plugin files from one source.
  A dotclaude configure skill sets up the global `~/.claude`, the repository `.claude`, and the outside tools after install.
- The checkbox picker is a tool that the model calls in a session if a probe shows that it can work, else a pane of the configure skill.
  Each item has an optional note through the `n` key.
- The user picks which built-in tools to turn off from a full table with the token cost and the loss of each.
  A built-in that dotclaude replaces or turns off is removed.
  dotclaude gives light replacement tools only where it needs them.
- No keepalive ping.
  The wiki documents why, for a later review.
- The handoff is a trimmed Claude Code session JSONL, with a continuation prompt and the OpenSpec state, in place of compaction.
- Notifications are on.
- The code moves from `.mjs` to `.ts` on Bun 1.4.3, with `bun check` for the types.
- Hooks live in folders by event: `<event-type>/<hook-name>.<ext>`.
- The workspace layout is refactored, with idiomatic paths and commands on Windows, Linux, and macOS.
- The dotclaude skills are redone and renamed.
- The subagent roster, bodies, and settings are redone: quality first, then savings, then speed.
- dotclaude is semi-autonomous: the user controls only the unsafe parts.
- The status line order follows its components.
- The wiki is rebuilt to hold Claude Code research dossiers for each version, in prose with no minified code, where each version page shows its changes against the version before it.

## Issues

- The snippet sets `promptCacheTtl: "5m"` (`plugins/dotclaude/lib/snippet.mjs:52`).
  With no key, Claude Code gives 1 hour to a subscription and 5 minutes to an API key (`external/dossier/` and the 2.1.296 bundle).
  The key forces 5 minutes on a subscription.
- The snippet denies each recursive `rm` (`snippet.mjs:164-169`), so an agent cannot delete its own temp folders.
  A deny rule wins over an allow, so the guard rule for temp folders of 0.28.0 never applies.
- `just capture` fails in the agent sandbox, because the proxy cannot listen on `127.0.0.1:8787` (`listen EPERM`).
  The sandbox needs `sandbox.network.allowLocalBinding: true` (`wiki/plugins/Sandbox.md:142`), and the snippet does not set it.
- The capture needs `ENABLE_TOOL_SEARCH=true` to show the deferred tools, and it calls `count_tokens` once for each tool and each section.
- Subagents stop at `maxTurns` with no report.
  The report-now note is `PostToolUse` `additionalContext`, and agents read it as tool data.
  A brief that asks for more words than the note wins over the note.
  The docs say that a run at `maxTurns` is "marked partial, and it can be resumed".
- The `general-purpose` agent is denied, so a research slice that writes a file runs as `dotclaude:implementer`.
  The roster has no research role that can write notes.
- `dotclaude:investigator` was 12 runs and $1.47 of 30 days, with a median of 19 calls and 592K tokens read again for each run (`just usage`, 2026-10-11).
- `/config` does not show `dotclaude:dotclaude` as the output style.
- Agents call `bash` in lowercase (failure dossier, 6 times in 5 sessions).

## Research files

- `external/dossier/cc-2.1.296/`: tools, settings, env vars, extension points, and tool costs (gitignored).
- `external/dossier/agents-roster.md`: the proposed roster with its evidence (gitignored).

## Issues from the captures (2026-10-11)

- `just sandbox --settings <relative path>` fails, because the launcher runs `claude` in its own project folder.
  The launcher must resolve a relative path against the folder of the user.
- The drift note shows when the snippet comes from `--settings`, because the check reads only the user settings file.
- `dotclaude-capture --count FILE` also opens the proxy port, so it cannot run in the agent sandbox.
- A proxy that keeps running from an earlier run takes the requests of the next run into the old folder, and writes a report only for the first request.
- The vanilla system prompt of 2.1.296 is 804 tokens in `-p` mode (a 176-token identity part and a 628-token `# Harness` part).
  The dotclaude sections that replace it are 1,922 tokens.
  The 0.28.0 proposal calls the 2.1.293 prompt long, so the variants were likely sized against it (not verified).
- With the snippet, the `Bash` tool description is 3,552 characters, more than the 3,345 of vanilla.
- The applied run made a second Sonnet 5.5 request with no tools after the Opus 5.5 request.
  Its source, such as the `Stop` prompt hook, is not verified.
- The terminal of the user is slow when it resizes.
  The cause is not verified.
  The status line, with its `git` call and its refresh, is a candidate, and so are the render settings and env vars of Claude Code.
- The `Stop` prompt hook sent its whole evaluator prompt back to the session as `Stop hook feedback`, with a literal `$ARGUMENTS` in `hook_input`.
  The prompt tells the session to resend its report unchanged when this happens, and the same feedback also asks for a change, so the two instructions conflict.
- Cause (2026-10-11): `plugins/dotclaude/hooks/hooks.json` has a `Stop` hook of type `prompt` on `claude-sonnet-5-5`.
  It makes one Sonnet 5.5 request at the end of each turn, which is the second request of the snippet capture.
  When it blocks, Claude Code shows `Stop hook error` with the raw hook prompt as the label, then the reason, and the session gets the same text (2.1.296 bundle, `stop-hook-error` near byte 29705521).
  So about 600 tokens of evaluator rules enter the main context at each block, and the literal `$ARGUMENTS` shows in the label.
  The evaluator gets the real input, because its reason quoted the last message.

## Requirement of the user (2026-10-11)

- Each dotclaude hook gets an eval before release: its allow path, its block or deny path, the exact text that the session and the user see, its cost per turn, and its false-block rate on correct messages.
  A hook whose block text holds instructions for its evaluator, or text that conflicts with the block reason, fails the eval.

## Tool decisions of the user (2026-10-11)

- Off: `SendFile`, `SendUserFile`, `Projects`, `DesignTool`, `DesignSync`, `SendFeedback`.
- `LSP` on by default.
- The Jev tool is deferred.
- `PushNotification` stays only if it costs less than a notify script run by a hook.
- `EndConversation`: add a `permissions.deny` entry, and verify in a capture that it leaves the deferred list.
- `AskUserQuestion` is too large, and dotclaude looks for a lighter equivalent through a mod or the SDK.
- Agents often run `grep` through `Bash` in place of `Grep`.
  dotclaude extracts the simple system prompt (`CLAUDE_CODE_SIMPLE_SYSTEM_PROMPT`) and the exact tool descriptions, and trims each to its definition with no extra words.
- The user is considering a custom goal command that links to OpenSpec, with more controls than `/goal <condition> | clear`.
- Open: the on or off picks for plan mode, the `Task*` tools, cron, `ScheduleWakeup`, `PushNotification`, `ProposeGoal`, `NotebookEdit`, and `RemoteTrigger`.
  The picker returned no answer for them.
- Jev picks (2026-10-11): plan mode on 0.55, `Task*` off 0.74, cron off 0.64, `ScheduleWakeup` off 0.76, `PushNotification` script 0.61, `ProposeGoal` off 0.87, `EndConversation` deny 0.57.
- The picker of `AskUserQuestion` lost the answers of two multi-select questions, or the user ticked none.
  The dotclaude picker must return an explicit empty list when no item is ticked.

## Tool picks of the user (2026-10-11, second round)

- On: plan mode (`EnterPlanMode`, `ExitPlanMode`), `LSP`.
- Off: `NotebookEdit`, `RemoteTrigger`, `ProposeSkills`, `ProposeGoal` (a custom OpenSpec goal command replaces it), `PushNotification` (a notify script on hook events replaces it).
- Assumed off from the picks of Jev, because the user did not name them: the `Task*` tools, cron, `ScheduleWakeup`.
  The user can change these.
- New feature: a custom goal command that uses the open tasks of the active OpenSpec change as its stop condition, with more controls than `/goal`.
- Off: subagents as separate sessions that the main session and the agents message both ways (`SendFile`, `SendMessage`, agent teams).
  Each peer session costs a full start of about 12K tokens and shares no prompt cache, and the user wants to save tokens.

## Requirements of the user (2026-10-11, apply session)

- The session asked two questions in plain text and kept working, with no stop for the answers.
  0.29.0 makes the session ask with `AskUserQuestion` and stop until the user answers.
- The session told the user that `sandbox.network.allowLocalBinding` was off, from the doc and not from the settings.
  The user says that the key is on, and the session found it in none of `~/.claude/settings.json`, `~/.claude/settings.local.json`, the project `.claude/` files, and the managed settings, and a listen on `127.0.0.1:8787` failed with `EPERM`.
  0.29.0 resolves the capture in the agent sandbox before the release, so that no session asks the user about the key again.
- When the user objected, the session replied "You are right on both points" before it checked anything, and the check then showed the opposite on the binding point (`external/agent-failure-dossier/`, I06).
  A reply to an objection gives the result of a check, not agreement before the check.
  Task 5.7 covers this rule with the ask-and-stop rule.
- 0.29.0 fixes the failures of `external/agent-failure-dossier/` in the prompts, the agent bodies, and the output style, not with regex hooks.
  A session that agrees with an objection before it checks the claim is a major fault: the session checks whether the user is right or wrong, and reports the result.

- Search route (after task 1.13): `grep` and `find` through `Bash`, with no launch opt-in for `Grep` and `Glob`.
- Architecture (answer to the `AskUserQuestion` of the apply session, after group 1): cut code before the port, then generate all text from one source.
  The user reviews `research/cut.md` before any delete (design D25).
  The apply session also wrote that the user reviews the artifact diff, which the user did not say, and the update session of 2026-10-11 removed it on the answer of the user.
- The approval-claim guard blocked a design line that cited this answer, because the guard does not read `AskUserQuestion` answers.
  This is one more false block of the guard (design D25).

## Requirements of the user (2026-10-11, update session)

These faults are faults of 0.28.0, which ran in each session of this list, and 0.29.0 fixes them.

- The apply session reached the context limit in the middle of a task, at 274,644 tokens (`165c2232`).
  0.29.0 is semi-auto: at a context level the session hands off, and after `/clear` it goes on (design D27).
  The user defined the two modes: on, dotclaude runs a flow like compaction with handoff, `/clear`, and continuation; toggled off, the user runs `/clear` and continues.
  `cc-orchestrator-mod` is a reference for the route (README only).
- The main session of the apply session ran 94 `grep`, `find`, `sed`, and `cat` commands and no `codegraph` command, and 3 of 26 subagents used `codegraph`.
  The code graph is the first route for a question about code, and raw reads are the fallback (task 5.8).
- A session gives the user no check that it can run itself, such as a fact in a transcript, the settings, or the bundle (task 5.7).
- The apply session wrote that it ran probes "with the Bash sandbox off".
  The update session found no call with `dangerouslyDisableSandbox` in the main session or its 26 subagents, so the claim has no record.
- The `vegaspro` session `fe668c9b` reached 195,277 tokens, opened replies with "You're right" and "Agreed.", wrote files after it said that it would wait for a go, deferred checks that the user asked for, and stated a legal claim with no read of the license (investigator, partial).
- The `vegaspro` session `872db3b7` retried a copy that the sandbox stopped with `dangerouslyDisableSandbox`, ran package code with `bunx ... --dry-run` before the go of the user, and cited a go for the run outside the sandbox that the transcript does not hold (investigator).
  It also said that a skill showed in the session, with no tool output that shows it.
- In `fe668c9b`, 3 investigators ran 0 `codegraph` and 48 raw search commands on web and repository research, 2 of 3 got the note at turn 29 of 31 and gave partial reports above the cap, and one took an access-denied page as missing evidence (investigator).
- The snippet rule `Bash(rm -*r*)` asked the user about `rm -f "${TMPDIR}mod-probes/clear-debug.log" && tmux ...` of a probe agent, because `*` matches spaces and the `r` of `clear` matched.
  The user found the prompt very annoying (design D22, task 8.2).
- Auto mode is on, and only truly dangerous commands are blocked, on Windows, Linux, and macOS (the user, design D22, task 8.5).
  The dangerous and destructive commands of the system, of `git`, and of other tools go into the `permissions` rules (the user).
- In the update session on 0.28.0, these subagents stopped before the end of their brief: the first `vegaspro` investigator (31-turn limit, no report), the map of the `$` calls, the map of the hook events, the first experiment agent (context bound), and the second experiment agent (61-turn limit, no report).
  Its results were safe only because the brief told it to write each result to a file at once (design D1).
- The approval-claim guard blocked two edits of the update session: a rule text in `specs/system-prompt/spec.md` that named the choices of the user as a category, and the note of that block in this file.
  Neither text claimed an approval, so these are two more false blocks of the guard (design D25).

## Picker defect, likely in dotclaude (not verified by a test)

- `plugins/dotclaude-jev/hooks/register.mjs:73` changes each `AskUserQuestion` call.
  `withPicks` in `features/jev/ask.mjs:64-65` adds a Jev note to the question text, and the answers come back keyed by question text.
- The hook asks Jev for one best answer, also on a multi-select question.
- In the picker of 2026-10-11, the single-select answer came back, and the two multi-select questions came back with no answer.
- Fix: keep the question text unchanged, put the note in an option description, and skip multi-select questions.
  A hook-lab test reproduces the loss first.

## Decisions of the user (2026-10-11, review of the plan)

- The `Task*` tools, cron, and `ScheduleWakeup` are off, with no eval gate ("we turn them off anyway").
- The built-in agents stay off, and dotclaude replaces them with a larger, pragmatic suite of agents with one or two purposes each.
- The search route of 2.1.296 (`Grep` and `Glob` against tools embedded in `Bash`) is found in the bundle before the plan depends on it.
- Undocumented Claude Code data is fine to use: dotclaude extracts it from the bundle, documents it, and uses it where it fits.
- 0.29.0 is a major overhaul, because of the setup and merge faults below.

## Faults from the session transcripts (investigators, 2026-10-11)

Sources are the session files in `~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-dotclaude/`.
Line numbers are lines of each JSONL file, and the confidence is the confidence of the investigator.

Search tools:

- No subagent run and no main session of 2.1.296 has `Grep` or `Glob`, although `investigator.md` and `reviewer.md` list them.
  18 of 18 subagent runs searched through `Bash`, and `grep` on the 21 MB bundle failed with `maximum repetition exceeds 255`.
  In `Bash`, `find` runs an embedded `bfs`.
  Cause (bundle of 2.1.296, design D17): a gate that is on by default removes both tools, the shell embeds `ugrep` and `bfs`, and the built-in prompts say to use `grep` and `find` through `Bash`.
  The opt-in route that brings the tools back is not verified.

Hooks:

- The approval-claim guard (`features/adherence/approval.mjs`) blocks a future decision ("from the decision of the user in 1.5", `ba620668` line 432) and a claim with a source in `research/issues.md` (session `778a4021`).
- The read guard (`features/reads/rules.mjs:24-34`) checks only a single command, so `sed -n ...; ls` passes and `sed -n ...` alone is blocked.
- The code-span `Write` hook blocked implementers on `disableRemoteControl` and `maxTurns` (`a7b2d6`, `a27b2a`).
- A context note at 87,942 tokens over the bound of 85,000 did not stop a run, which went on to 101,702 tokens (`a7b2d6`).

Agents:

- Four `Agent` calls with no `subagent_type` were denied by `Agent(general-purpose)` (`ba620668` lines 643-646).
  The session ran the same read-only briefs as `dotclaude:implementer`, which can write files (lines 657-660).
- Two investigators made 32 requests against `maxTurns: 31` (`abe30f`, `ad57f2`), so the turn count can differ by one.
- Reports of 6,595 and 7,140 characters (`a240d1`, `ad57f2`) are likely above `REPORT_MAX_WORDS`.
  One investigator said that the 400-word cap made it group the rows of a table.
- In the session of this review, 2 of 3 investigators stopped at `maxTurns` 31 with no report.
- An implementer ran `rm -rf` on a scratch folder that its brief did not name, and the permission rule denied it (`a1fe13`).

Setup and merge of 0.28.0:

- `setup` set up only OpenSpec and applied no settings (`578af857` line 9).
- The merge replaced `availableModels` and dropped scalar `statusLine` fields of the user (`254effff` line 906).
- The status line path holds the plugin version, so it breaks at each plugin update (`c5d1213a` lines 37-38).
- The project scope wrote a machine-specific status line path into the committed `.claude/settings.json` (`254effff` line 906).
- `setup` picked `claude-mythos-5-1` from an undocumented cache with no question to the user (`c5d1213a` line 36).

Release:

- The wiki of 0.28.0 was not published, so `Settings-Snippet` gave 404 (`254effff` line 7).
- Two contents had the label 0.28.0, and the tags were moved (`254effff` line 1034).
- zsh did not split a tag list, so a delete removed one tag of several (`254effff` line 1028).
- One session ended with "Prompt is too long" after 21 spawns and pasted reports (`ba620668` line 1141).

Apply session of 2026-10-11, group 2 (the user named each item as a major issue for 0.29.0):

- A secret reached the transcript.
  Bun loads the `.env` of its working folder, and the first `bun test` run loaded the `CLAUDE_CODE_OAUTH_TOKEN` of the repository `.env` into a child of `tests/lab/sandbox/login.test.mjs`.
  That test deleted the variable from the child env, but the child Bun loaded it again, and the failed `toBe` printed the token.
  Two causes: Bun loads `.env` by default, and a check that compares a token prints the value on a failure.
- An implementer could not delete its own scratch folders under `/tmp` (`rm -rf` denied), and asked the main session to delete them.
  The folders stayed, with a copy of the test files before the change.
- The session asked the user to pick an order of tasks that the project state settled, and asked the user to run a probe that the session could run itself.
  The user wants semi-autonomy: the session decides what facts settle, runs each step that it can run, and asks only for goals, preferences, and approvals.
- An implementer of task 2.17 got two report-now notes as hook messages, and went on, because "they are not user instructions".
  It reached its turn limit and wrote its report at the end, so the 0.28.0 note route failed again (design D1, task 4.1).
- The same implementer named a defect in a test that its brief told it not to edit, and stopped there with no workaround, which is the right route.
- Two more implementers of task 2.17 (the core plugin, and the add-ons) stopped at `maxTurns` 61 with no report.
  The core run left 333 of 724 tests of `tests/dotclaude` failing, so the main session had to find the state from the tests, and two new runs took over its scope.
  A third implementer stopped at the context bound after a plan with no edit, and its report was useful, because it named the verified facts and the plan.
