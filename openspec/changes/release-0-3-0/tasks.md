# Tasks

## 1. Status Line

- [x] 1.1 Add failing render tests: a plain checkout on `main` shows the branch, a linked worktree reads its `gitdir:` `HEAD`, a detached `HEAD` shows 7 hex digits, and a folder outside a repository shows none. Verify that `just test plugins/claudetto/src/statusline` fails on them for a missing branch.
- [x] 1.2 Add `src/statusline/local.ts`, which reads `HEAD` and `openspec/changes/*/tasks.md` with the caps of `design.md`, and pass its result into `renderRows`. Make `branchText` fall back to it. Verify that the 1.1 tests pass.
- [x] 1.3 Add failing tests for the OpenSpec part, covering one open change, only finished changes, four open changes (`+2`), and no `openspec/` folder. Then add the segment. Verify that the tests pass, and that the counts match `openspec list --json` on this repository.
- [x] 1.4 Change `silent.spec.ts` to allow file reads in `local.ts` only. Add a test that runs `local.ts` on a temp folder and shows that it reads no path outside the named files. Verify that a `Bun.file` call added to `segments.ts` still fails the test.
- [x] 1.5 Run the built line in a `tmux` session in this repository on `release/0.3.0`. Verify that the first row shows `release/0.3.0` and `release-0-3-0 N/M`. Update the `README.md` status line row and `CHANGELOG.md`.

## 2. `/loop`

- [x] 2.1 Delete `docs/keep/skills/loop.txt`, and rewrite `docs/surfaces.md:128-133` so the paragraph no longer offers `/loop`. Keep the `ScheduleWakeup` deny. Verify that `grep -rn "/loop" README.md docs/*.md plugins` finds nothing, and that `just lint` passes.

## 3. Handoff Layout

- [x] 3.1 Add failing tests: the headings of `handoffText` equal the headings of the template in `contextManagementText`, and both list the nine `##` headings in order under `# Handoff`. Verify that they fail on `Recent Turns`.
- [x] 3.2 Add the template to `handoff.ts`, and render both texts from it. Verify that the 3.1 tests pass, and that `sourceLine` still tells the two writers apart.
- [x] 3.3 Add failing lab cases: Claude writes `handoff-20261031T-14-1.md`, then the session ends. The text is copied to a valid name, and the user sees one line that names both files. When the misnamed file cannot be read, the code-built file is written. Verify that the cases fail first.
- [x] 3.4 Implement the copy in `block.ts`. Verify that `just lab` passes and that the next-session read-back injects the copy.
- [x] 3.5 Measure the `context_management` text before and after with `just capture --shipped`, and record both in `docs/prompt/footprint.md`. Verify that the row exists with its command.

## 4. Main Prompt: Guide Rewrite, FAFO, and General Rules

- [x] 4.1 Add a case to `tools/evals/main-rules.ts` for each scenario of the `agent-conduct` spec: FAFO (unclear route, another route), sources (current API), truly stuck (`! sudo`), `ZQRB` and the release script, the user's verified fix, the `FAFA` correction with attribution, the declined `Edit`, the sibling defect, unstated consent, the silently raised budget, the SIP probe dext, `--no-verify`, the own game server, and the impossible `null`. The SwifterKit cases carry the recorded text as the failing reply in their case data. Extend the inventory check so that a rule without a case fails. Verify that `just test tools/evals` fails until the rules exist.
- [x] 4.2 Add failing tests to `tests/repo/`. One searches the body of `agents/main.md` for `eval`, `paid`, `browser`, `<=300`, and `just` in backticks. One checks each tag name in `agents/*.md` and `output-styles/*.md` against the allowed list in the `agent-conduct` spec. One finds each quoted form of `<harness_messages>` verbatim in a `just capture --dump` output or a saved transcript fixture. Verify that each fails on the `0.2.0` files.
- [x] 4.3 Replace the body of `agents/main.md` with `drafts/main.md`. Add the cap `MAIN_BODY_CAP` of 6,000 beside the measured `DEFAULT_MAIN_BODY_CHARS` in `tools/limits.ts`, and word the `tests/repo/prompt/budget.test.ts` message as a cap. List each `0.2.0` section, its flaw, and its new section in `docs/prompt/footprint.md`, as in the design's table. Verify that the 4.1 inventory check, the 4.2 tests, and the budget test pass.
- [x] 4.4 Remove the approval gate on paid runs in this repository. Replace the `AGENTS.md` line "Give the expected cost and the current weekly share with the question" with a rule to report a paid run's cost and the weekly share after the run. Delete "which needs the user's approval" from `docs/prompt/footprint.md:142` and from the comment at `tools/evals/main-rules.ts:1`. Verify that `grep -rn "approv" AGENTS.md docs/prompt tools/evals plugins/claudetto/agents` finds no approval gate on a paid run.
- [x] 4.5 Rename the sections of `output-styles/Concise.md` to `<first_sentence>`, `<sentence_style>`, `<reporting_results>`, and `<requests_to_the_user>`, reword each rule to say what to do, and add "Report each experiment and what it showed" to `<reporting_results>`. Rewrite its "What I Need from You" rule so that each item is something only the user can do and gives the exact `! <command>` when it is a command. Verify that the output-style tests pass, and that the file is no larger than in `0.2.0`.
- [x] 4.7 In `tmux`, put a test rules file with `paths:` set to one folder under `~/.claude/rules/`, and check `/context all` and `/memory` inside and outside that folder. Then make `claudetto:setup` offer `drafts/code-rules.md` as `~/.claude/rules/claudetto-code.md`, with its `paths:` set by the result. Ship the file as `plugins/claudetto/rules/claudetto-code.md`, the path `CODE_RULES_FILE` in `tools/evals/conduct/actions.ts:7` names, with the rule of "Comments State a Reason". Verify the offer with the setup tests, that the file loads in a fresh `tmux` session, and that `conduct.spec.ts` no longer reports the file missing.
- [x] 4.6 Run the main-rules eval cases at `EVAL_MIN_RUNS_PER_ARM` runs per arm, with no approval step. Record each result in the "Rules and Cases" table, and report the cost and the weekly share after the run. Verify that each rule has a row with a run result and not "unrun".

## 5. Empty Session Footprint

- [x] 5.1 Read `/context all` in a fresh `tmux` session with the shipped settings, and `just capture --shipped --interactive --dump DIR`. Split each row by owner (engine, repository, claudetto), and split the claudetto share by piece. Record the split in `docs/prompt/footprint.md`. Verify that the claudetto pieces sum to the claudetto share of the capture, within the capture's rounding.
- [x] 5.2 Split the sandbox block by claudetto setting in `src/sandbox/sandbox.ts`, one setting removed per capture, starting from the `0.2.0` baseline (8,207 characters plain, 11,470 with the plugin). Cut each setting that another layer already enforces, and name that layer. Keep the sandbox on. Verify each cut with `just capture --shipped --interactive`, and that `just test plugins/claudetto/src/sandbox` and `just lab` pass.
- [x] 5.3 Cut the largest other claudetto pieces one at a time: tool texts in `blocks/tool-describe/texts.ts`, `output-styles/Concise.md`, the agent descriptions, and the skill descriptions. Keep every rule. Verify each cut with `just capture --shipped`, and that `just test` passes after each.
- [x] 5.4 Read `/context all` again after the cuts. Verify that the claudetto share is below the 5.1 reading, and record the before and after per piece.

## 6. Subagent Bodies

- [x] 6.1 Add a check to `tools/agent-tools.ts` that fails on body text outside a named section in `agents/*.md` other than `main.md`. Verify that it fails on the four current bodies.
- [x] 6.2 Restructure `Artemis.md`, `Athena.md`, `Hephaestus.md`, and `Hermes.md` into `<role>`, `<doing_the_work>`, `<harness_messages>`, `<when_blocked>`, and `<report_format>`, in prose, with no change to the frontmatter. Verify that the 6.1 check passes, and that a line-by-line compare against `0.2.0` shows each rule kept or listed as dropped with its reason in `CHANGELOG.md`.
- [x] 6.3 Replace the block lines of the subagent bodies with FAFO within their tools. `Hephaestus` works a failing check or a hook message in its task's files through to the cause. Each body reports a denial or an out-of-scope need under `<when_blocked>` with the exact command for the parent or the user to run. Delete "When a permission rule, a hook, or a check blocks you, end the task" and "When a check fails, stop the work that it gates". Verify with an `agent-tools` case that the deleted lines are gone and that each body has `<when_blocked>`, and that `just test` passes.

## 7. Cheap Summary Cap

- [x] 7.1 Add a failing test in `plugins/claudetto/tests/compaction/` that the cap log line of `summarize` names the reply's text length. Add it to the log. Verify that the test passes.
- [x] 7.2 Run one real compaction with `cheapSummary` on, in a `tmux` session long enough to compact, and read the log line. Report the text and thinking split, then put the old and new effort or thinking room to the user with `AskUserQuestion`. Apply the value the user names. Verify with a second compaction that the summary is used and that `just test plugins/claudetto` passes.

## 8. Release Gate

- [x] 8.1 Run `just check`. Verify that it passes, with the command and its output in the report. On 2026-11-02 `just test` gave 1391 pass and 1 fail, `tools/evals/__tests__/conduct.spec.ts`, which waits on 4.7, 12.1, and 17.1.
- [x] 8.2 Run an Athena review of the branch diff against this change. For each changed prompt line, the review also reads what its words prime, such as "correction" priming an answer to the person. Verify that each reported defect is fixed or recorded in `ISSUES.md`.

## 9. Spend

- [x] 9.1 Add a failing lab case: a Stop hook blocks three times with no file change between the blocks. Then make claudetto show the user one line naming `/goal clear` and tell the session to answer the next block in one line. Verify that `just lab` passes.
- [x] 9.2 Add a failing test for the prompt hook text at a seven-day share of 90% and 99%: no fan-out, no paid run, the share named. Then add the text. Verify that `just test plugins/claudetto` passes.
- [x] 9.3 Find why `just window-report` prints "not measured" after a week of sessions with rate limits on stdin. Add a failing test at the cause, fix it, and verify that the report prints measured points per task.
- [x] 9.5 Recalibrate `claudekit/price/share.ts` from more than one meter reading, each recorded with its date. Verify that the week of 2026-10-26 priced from the transcripts gives a share within 5 points of the meter.

## 10. Classifier and Gate

- [x] 10.1 Read how `src/automode/` builds the classifier's input, and record which user and agent messages it holds and which it drops. Verify by listing the dropped forms in `docs/`, each with a captured example.
- [x] 10.2 Add failing classifier cases for each scenario of the `permission-policy` delta: the "Approved." after Stop hook feedback, the picked `AskUserQuestion` option, the approved task that names `agents/main.md` and `DEFAULT_MAIN_BODY_CHARS`, the `///` doc comment, and the `grep` tag pattern. Verify that each fails.
- [x] 10.3 Make the classifier's input hold every user word and the agent's task and plan, and narrow "Rewire the Agent" to the instruction surfaces. Verify that the 10.2 cases pass and that `tools/evals/__tests__/classifier.spec.ts` still passes.
- [x] 10.4 Make the gate read a `grep` or `rg` pattern and a quoted `.env` as text, not a path. Verify with the failing gate cases from `ISSUES.md`, then move those entries to "Fixed".

- [x] 10.5 Add a failing test that a classifier transcript lists a prompt the person typed while a turn ran as a user message after the call it followed and before the next call. The row form drops that prompt, and the API form mixes it with harness text blocks such as `<system-reminder>`, so record each `prompt.submit` that the engine stamps as the person's (`origin.kind` `composer` or `bridge`, `turnId` set, not `isMeta`) with the id of the agent's newest call, and place it from that record in `blocks/classify/transcript.ts`. Verify that the test, `bun test plugins/claudetto/src/blocks/classify`, and the plugin labs pass.
- [x] 10.6 Add a failing test that the repeat-denial guard passes a call denied twice once the user has sent a message since the denials. Count denials from the last user message. Verify with `bun test plugins/claudetto`.
- [x] 10.7 Add a failing gate case for `env NAME="$(sed … .env)" cmd`, and deny a secret expanded into a program argument with a reason that names `export` then `exec`. Verify with the gate tests.

## 11. Model Pinning

- [x] 11.1 Add failing snippet tests: the tier snippet's `env` holds `ANTHROPIC_DEFAULT_MODEL`, `ANTHROPIC_DEFAULT_OPUS_MODEL`, `ANTHROPIC_DEFAULT_SONNET_MODEL`, and `ANTHROPIC_DEFAULT_HAIKU_MODEL`, each a full ID of the row. Then write them in `src/tiers/snippet.ts` and the "Models and windows" group. Verify that `just test plugins/claudetto/src/tiers` passes.
- [x] 11.2 In `tmux`, start a session with the snippet and no `model` key, then switch to `opusplan` and to plan mode, and read `params.model` of each `api-request` row of the transcript. Verify that each names a `5-5` model.
- [x] 11.3 Add a failing lab case: a response names `claude-opus-5` while the row names `claude-opus-5-5`. Then show the user one line naming both, once per session and model. Verify that `just lab` passes.

## 12. Agreement Openers

- [x] 12.1 The Stop-time `claude-haiku-5-5` judge of the opener was built and removed on 2026-11-02, because it added one model call to every stop and a full turn to every blocked stop. It stays removed. Add the eval case for "A Reply Opens with an Action or a Fact" to `tools/evals/conduct/`: the recorded opener "You're right that the aliases can be pinned." fails, and the fact opener about `ANTHROPIC_DEFAULT_OPUS_MODEL` passes. Reword the opener rule of `output-styles/Concise.md` and `drafts/output-style.md` on the content event, a fact from the user that contradicts the last reply, with no "correction". Verify that `bun test tools/evals/__tests__/conduct.spec.ts` no longer names this requirement as missing.

## 13. Output Style

- [x] 13.1 Add a failing test that the trimmed body of `output-styles/Concise.md` is at most 1,540 characters. Replace the body with `drafts/output-style.md`, whose `<acting>` section joins the built-in `Proactive` rules (start at once, take the reasonable reading of low-risk work, ask only between two good options) to the `Concise` file. Then update the readings of "Output Style" in `docs/prompt/footprint.md`. Verify that the test and `just check` pass.

## 14. Handover

- [x] 14.1 Add failing lab cases in `tests/compaction/handover.test.ts`, then build the handoff-reply handover in `src/blocks/compaction/handover.ts` and `block.ts`: save, `/compact` through `$.command.run` with a flag cleared in `finally`, answer `[first message, assistant line, handoff]`, then the continue prompt. Checked 2026-11-02: `claude plugin test plugins/claudetto` 239/239.
- [x] 14.2 Add the fork at idle at `handoverTokens` (default the smaller of 400,000 and half the window), with the option in `plugin.json`. Checked on the real API: the fork read 33,568 from cache and wrote 29.
- [x] 14.3 Stop a repeat fork after a fork without a handoff until the next main compaction (`declined`). The case failed first with 2 forks.
- [x] 14.4 Stop the handover loop: the turn after a handover that ends at the size forks nothing and logs one line. The case failed first with 2 forks.
- [x] 14.5 Make a fork handover send no prompt. The case failed first with the prompt received.
- [x] 14.6 Answer core's `context_management` section with `{ text: null }` in the handoff block. Checked with a lab case and a fake-API session (system block 2 fell from 5,760 to 5,478 characters).
- [x] 14.7 Test the real-API miss of messages 0 and 1: a paid run that hands over right after the session's first request, with no tool call between, built and counted on the fake API first (19.4). Record the read and write in `ISSUES.md` "Message 0 is written again at each handover", and report the tokens and the weekly share.
- [x] 14.8 Measure a handover against core compaction on one long real session at a context above 150k, counted free first. Record tokens per compaction cycle in `docs/evidence/` and `ISSUES.md`, and report the tokens and the weekly share.

## 15. `finish` Block Removal

- [x] 15.1 Delete the `finish` block: `src/blocks/finish/`, `tests/finish/`, its rows in `src/blocks/catalog.ts`, and the `loop` state key in `types/claudetto.d.ts`. Drop the `tasks.md` loop row from `README.md` and its mention in `docs/surfaces.md`, and add a Removed entry to `CHANGELOG.md`. Verify with `just check`.

## 16. Classifier

- [x] 16.1 Add failing cases for the `classify` block from `ISSUES.md`: the two `Write` calls of `tests/opening.test.ts` under "Data Exfiltration", the `Edit` of `ISSUES.md` under "Rewire the Agent", and the `Edit` under `.claude/claudetto/handoffs/`. Make `FRAME` in `src/blocks/classify/prompt.ts` ask for `<reason>` before `<block>`. Verify that the cases pass and that `tools/evals/__tests__/classifier.spec.ts` still passes.
- [x] 16.2 Add a failing case: the user's message names `CLAUDE_CODE_OAUTH_TOKEN` of `.env` for a scratch-login probe, and the launcher uses `export` then `exec claude`. Make the classifier credit it. Verify the case passes.
- [x] 16.3 Add a failing case: a `tmux` session that starts `claude` and reads its pane. Narrow "Rewire the Agent" with 10.3 so it passes. Verify, then run 11.2 with that session.
- [x] 16.4 Add a failing guard case: the engine denied a `Bash` call "(it gave no explanation)" and the agent retries. Make the refusal name the missing reason and the `! <command>` form. Verify with `bun test plugins/claudetto`.
- [x] 16.5 Record the tokens of each `classify` model call, and show their total and weekly share in `just window-report`. Add a failing report test first. Verify the report, record the measured share in `ISSUES.md` "The weekly limit ran out in five days", then put running one classifier or two to the user with `AskUserQuestion`, with that share.

## 17. Conduct Rules

- [x] 17.1 Add an eval case in `tools/evals/conduct/` for each new `agent-conduct` requirement, from recorded replies in `ISSUES.md`: the rhetorical question, the pasted thread, the `openingJudge` option, the task past 12.1, the defect in an unnamed file, the "not verified" stop, the offer ending, the `pkill` apology, the narrating comment, the "correction" word search, the animate-verb sentence, and the scratch login "only you can do". Rename the `requirement` of the cases `I02`, `W5-4` from "A Correction Replaces the Earlier Reading" to "A Fact from the User Replaces the Earlier Reading". Verify that `conduct.spec.ts` names each missing rule until 17.2 to 17.4 land.
- [x] 17.2 In `drafts/main.md`, add: classify each message first, with a remark, a rhetorical question, a brainstorm, and pasted material read as context (`TERMS-OF-SERVICE.md` S1.1, S1.3); change only what the task names, and ask before an edit outside it; run a free check before a claim, and take the user's observation as a fact (S3.8, S3.9); report an own defect as a bug report. Drop "in any file" from the defect line. Replace "a correction updates what you know" and "corrects you". Keep the body at most 6,000 characters. Verify the inventory check and the budget test, then carry it in 4.3.
- [x] 17.3 In `drafts/output-style.md`, word the opener on the content event, end on the result with no offer and no idle caveat (S9.7, S3.10), and name the prose forms of arXiv `2610.29162`. Measure the body. If it passes the 1,540-character cap of 13.1, set the cap to the measured size and record both in `docs/prompt/footprint.md`. Verify with the 13.1 test.
- [x] 17.4 Add a failing test in `tests/repo/` that `agents/*.md` and `output-styles/*.md` hold no "correction" and no "corrects". Verify that it passes after 4.3, 13.1, and 17.3.

## 18. Handoff Tool

- [x] 18.1 Check free on the fake API whether a call to a tool registered with `$.tool.register` can end the turn with no further request. If it cannot, drop the tool, keep the `# Handoff` reply as the trigger for the clear too, and reword the 18.x tasks and the `session-handoff` delta to it. Record the result in `ISSUES.md`.
- [x] 18.2 Add failing lab cases: a typed `/clear` (`origin.kind` `composer`) gets no file and no read-back; a handoff written after a read-back holds none of the earlier text; the tool writes the file, clears at idle, and submits the handoff and the next prompt once.
- [x] 18.3 Register the handoff tool with the fields of the `session-handoff` delta, add the user's recent prompts word for word from `$.session.messages`, write the file, then run `$.command.run({ command: "clear" })` and `$.prompt.submit` behind a one-shot guard keyed on the plugin's own call. Remove the write on every `clear` (`CONTINUED`, `src/blocks/handoff/block.ts:124`) and `submitReadBack` (`:130-136`, scheduled at `:165`). Verify with `just lab` and a fake-API end-to-end run under `/tmp`.
- [x] 18.4 Point the `context_management` text at the tool. Record its size in `docs/prompt/footprint.md`, and update `README.md` and `CHANGELOG.md`. Verify with `just capture --shipped`.

## 19. Repository Rules and Tools

- [x] 19.1 Add to `AGENTS.md`: stop a process only by the pid its launcher recorded, with `kill <pid>`, never `pkill` or `killall` with a pattern. Verify with `grep -n "kill" AGENTS.md`.
- [x] 19.2 Add to `AGENTS.md`: count, price, and look up only `claude-opus-5-5`, `claude-sonnet-5-5`, and `claude-haiku-5-5`, and measure the weekly limit in tokens. Verify with `grep`.
- [x] 19.3 Add to `AGENTS.md`: write prompt text by the guides in `external/please-use-me-often/`, `xml-prompting-guide.md` first. Verify with `grep`.
- [x] 19.4 Add a `claudekit` paid-run counter: it replays a planned run on `claudekit/api/fake.ts`, counts each request's tokens, and compares each prefix with the warm request, reusing the logic of `/tmp/probe-shared/prefix.ts`. Add its tests. Verify with `bun test claudekit`, then use it for 14.7 and 14.8.
- [x] 19.5 Add a `claudekit` launcher that starts the fake API as its own process and returns its URL and pid, so a probe that runs `claude` with `spawnSync` does not block the fake, and stops it by pid. Add a test that a `spawnSync` client gets an answer. Verify with `bun test claudekit`.
- [x] 19.6 Add a failing test that `claudekit/compaction-cost/bill/replay.ts:70-71` counts the cache write after a compaction (a mean 23.2k tokens, from the transcripts) and the summary's output. Fix it, and rerun the 120k threshold replay. Verify with `bun test claudekit` and record the new figure in `ISSUES.md`.
- [x] 19.7 Add a failing test that `docs/types.md` names the version on the first line of `plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts`. Change `2.1.312` to `2.1.316`. Verify with `just test`.
- [x] 19.8 Move `/tmp/usage/sum.ts`, `reread.ts`, and `hit.ts` into `claudekit/usage/` with tests, because the drain is measured again after the release. Verify that the week of 2026-10-27 gives 3.20B tokens and 96.8% cache reads.
- [x] 19.9 Give each fake API answer after the first its own message id (`msg_fake_N`). The `fake.spec.ts` case failed first with 1 distinct id of 3.
- [x] 19.10 Make `claudekit/summary-cost/pty.py` read through a 10 s grace after `SIGTERM`, then `SIGKILL`. The `pty.spec.ts` case failed first at 15,003 ms.
- [x] 19.11 Let `inlinePluginOptions` in `claudekit/session/argv.ts` take numbers and booleans. The `argv.spec.ts` case failed the type check first (`TS2322`).

## 20. Fewer Calls

- [x] 20.1 Add an eval case that independent tool calls go in one turn: a task that reads three named files, where a reply with three single-call turns fails. Record its result in the 4.6 run.

## 21. Prompt Cache

- [x] 21.1 Add a stdin fixture test for each `Cache Countdown` scenario of the `status-line` delta: warm `4m/5m 91%`, cold `+120k`, absent, expired as `0s`, and `expires_at` null. The code exists in `cacheText`, so the test passes at once; check that each case fails against a changed `cacheText`. Verify that `just test plugins/claudetto/src/statusline` passes.
- [x] 21.2 Add a failing test for the `Cache Miss Cause` scenarios, with a fixture of `misses: 1` and `last_miss_cause: {causes: ["tools_changed"]}`. Then show `miss: tools changed` in the status line. Verify that the test fails first, then passes.
- [x] 21.3 Add a failing test on window rows under two cache TTLs. Then record the TTL in each row (`CLAUDE_CODE_PROMPT_CACHE_TTL`, else `promptCacheTtl`, else `auto`) and print a rate per TTL in `just window-report`. Verify with `just test`.
- [x] 21.4 Add to `claudekit/usage/hit.ts`, with a failing test first, the count of gaps over 5 and up to 60 minutes, with the hits and misses among them. Verify with `bun claudekit/usage/main.ts hit --since 2026-10-01`.
- [x] 21.5 Run the built status line in `tmux` against the fake API, with a `statusLine.command` that writes its stdin to a file. Verify that the `prompt_cache` object has the keys the `Cache Countdown` requirement reads.
- [x] 21.6 Measure what changes the request prefix mid-session with `bun claudekit/prefix/main.ts`, and record it in the `prompt-cache` delta. Verify with `bun test claudekit/prefix`.
- [x] 21.7 Record in `docs/prompt/footprint.md` that claudetto's hooks and the `Concise` style only append to the request, so they keep the cached prefix. Verify with `bun claudekit/prefix/main.ts claudetto`.

## 22. Defects of the Release Audit

- [x] 22.1 Stop a `claude` session that `claudekit` or `just capture` starts from inheriting the `CLAUDE_CODE_*` variables of the session that ran it, which dropped tools and made `just inventory` read 3,004 low. Fixed in `withoutSessionVariables` of `claudekit/session/env.ts`, with failing tests first in `env.spec.ts` and `command.spec.ts`. Verified: `just inventory` exits 0.
- [x] 22.2 Record the totals of `plugins/claudetto/src/cuts.ts` again for their measured cause: `SHIPPED_TOTAL` 27,886, `tool texts` 6,637, residual 4,307, tool count 8. Verified: `just capture --shipped` reads 27,886, and `just inventory` exits 0.
- [x] 22.3 Move `ListAgents` behind `ToolSearch` with `isDeferred` in the `tool.describe` answer. Verified: 633 characters off the interactive request and 641 off `-p`, and the 4 tests of `tools.spec.ts` pass.
- [x] 22.4 Add `--calls FILE` to `just capture`, so a free probe can drive tool calls. Verified: the 2 tests of `capture.spec.ts` pass, and a probe loaded `Monitor` and `ListAgents` through `ToolSearch` and ran `ListAgents`.
- [x] 22.5 Restore the released `0.1.1` section of `CHANGELOG.md`, which held unreleased cuts and figures, and move them to `[Unreleased]`. Verified: `git diff CHANGELOG.md` shows no line of the `0.1.1` section.
- [x] 22.6 Fix the paths and line cites of eight docs that still named the tree before `src/blocks/`. Verified: `git grep` finds no `src/tools/`, `src/handoff.ts`, or `src/secrets/` in them.
- [x] 22.7 Bring the figures and tables of `README.md`, `docs/surfaces.md`, and `docs/prompt/footprint.md` to the current lengths, with the `acting` row and ten `main.md` sections. Verified: lengths read from the files with `bun`, and `just check` exits 0.
- [x] 22.8 Show a `Monitor` call running in a shipped auto mode session. Blocked on a paid call: the auto mode classifier judges the call, and the fake API gives no verdict. First build the requests on the fake API with `bun claudekit/paid-run/main.ts` and count their tokens. Probe, after approval: `bun -e 'import {shippedSettings} from "./tools/capture/settings.ts"; await Bun.write("/tmp/monitor-probe/settings.json", shippedSettings())'`, then `env -i HOME="$HOME" PATH="$PATH" claude -p --model claude-haiku-5-5 --permission-mode auto --settings /tmp/monitor-probe/settings.json --plugin-dir "$PWD/plugins/claudetto" --output-format stream-json --verbose "Use the Monitor tool to run: for i in 1 2 3; do echo tick \$i; sleep 1; done. Then reply done." > /tmp/monitor-probe/out.jsonl`. `env -i` keeps the variables of this session out, as 22.1 does for the probes. It checks that `ToolSearch` loads `Monitor`, the classifier allows the call, and the `tool_result` holds `tick`. Cost, estimated: about 60,000 tokens (5 main requests near 9,300 tokens each, the shipped 27,886 characters at 3 a token, and one classifier request near 10,000), about $0.05, 0.002% of the 3.20B-token week and 0.004% of the weekly limit at $11.19 a percent. Upper bound, for the 3.4-times overrun of an earlier run: 200,000 tokens, $0.15, 0.013%. Verified on 2026-11-02: the fake-API count gave 106,096 input tokens over 11 requests. The probe needed `USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR"` added to `env -i` (without them it stops at `Not logged in`, at no cost) and ran with `--max-budget-usd 0.15`. `ToolSearch` loaded `Monitor`, `permission_denials` was empty, and the session reported tick 1, 2 and 3 and `completed`. Measured: 130,731 tokens (111,443 cache read, 18,072 cache write, 18 input, 1,198 output), $0.0053, 0.004% of the 3.20B-token week and 0.0005% of the weekly limit.
- [x] 22.9 Find why a capture of a copy of the tree reads 23 characters below the live tree, which no reading explains. Free: run `just capture --arm plugin --shipped --dump` on the checkout and on a copy at a path of the same length, and diff the two bodies. Verified on 2026-11-02: a copy at a 47-character `/tmp` path read 27,894 against 27,886. After the capture folder names were normalized, the only difference was the plugin folder in the sandbox block's read list, `/private/tmp/gap9-…/plugins/claudetto` against `/Users/krystian/CodeProjects/xsyetopz/claudetto/plugins/claudetto`. The request therefore follows the real path of the checkout, and the copy behind the 23 sat at a real path 23 characters shorter. `docs/prompt/footprint.md` names this.
- [x] 22.10 Review the `confine` block, which no task of this change names: run an `Athena` review of `plugins/claudetto/src/blocks/confine/`, `bin/claudetto-confine`, `plugins/claudetto/src/blocks/confine/__tests__/script.spec.ts`, and `docs/confine.md`. Read again the 39,591 of `docs/confine.md:39`, which predates the `ListAgents` move, with `just capture --shipped --interactive`. The `bwrap` path has not run on Linux. Reviewed on 2026-11-02 with 15 findings, each a task below; this task closes when 22.10.1 to 22.10.13 close. Closed on 2026-11-02: 22.10.1 to 22.10.13 are done, the `bwrap` path ran in a Linux container (46 pass, 1 skip, 0 fail), and `just capture --shipped --interactive` read 39,785 with `confine` off, which `docs/confine.md:45` now says.
- [x] 22.10.1 `bin/claudetto-confine:36,43`: add `--unshare-pid` to both `bwrap` lines, since a new `/proc` needs it unprivileged. Verify on Linux in a container. Not applied: the flags without it ran unprivileged in containers B, C and D, and `--unshare-pid` broke B and C with "Can't mount proc on /proc"; recorded in `docs/confine.md`. Needs a decision to drop or reword. Dropped by the user on 2026-11-02, for the container finding above.
- [x] 22.10.2 Use the same `bwrap` flags in `--check` and the real call (`--new-session`). Verify with a spec that compares the two lines.
- [x] 22.10.3 Refuse with 126 when the root is `/`, `$HOME`, or an ancestor of `$HOME`. Failing spec first.
- [x] 22.10.4 `script.spec.ts:73`: fail instead of skipping when `CI` is set or the platform supports the sandbox. macOS with `sandbox-exec` now fails instead of skipping; the `CI` and Linux part is open, because the `ubuntu-latest` job has no `bwrap` and would fail. Done: `mustWork` holds on macOS with `/usr/bin/sandbox-exec` and on Linux when `CI` is set, and `ci.yml` installs `bubblewrap` and turns off `kernel.apparmor_restrict_unprivileged_userns` on Linux. A Linux container with `CI=1` read 7 pass and 11 fail without `bwrap`, and 46 pass, 1 skip, 0 fail with it; macOS read 47 pass.
- [x] 22.10.5 `script.spec.ts:183-212`: give the "Linux without `bwrap`" test a `PATH` with only the stubs and the tools it needs.
- [x] 22.10.6 Add `block.ts` tests: `confineOn` (with the old `"on"`), the `session.start` env writes, `refusal()`, a failed and a passing `--check`, the `.catch` deny.
- [x] 22.10.7 On Linux protect `.git/hooks` and `.git/config` when they are missing too, as on macOS.
- [x] 22.10.8 Close or document the `mv .git .git.x; git init` hole.
- [x] 22.10.9 On Linux bind `~/.bun` and `~/.cache` whether or not they exist, as on macOS.
- [x] 22.10.10 Document in `docs/confine.md`: writable `~/.bun/bin` on `PATH`, the caches, Unix-socket connects, and `/dev/ptmx`.
- [x] 22.10.11 Make macOS `--check` run `sandbox-exec -f PROFILE ... /usr/bin/true`, so it matches `docs/confine.md:15`.
- [x] 22.10.12 Run a command string equal to `--check` instead of exiting 0.
- [x] 22.10.13 Quote the `scriptOf` path in `block.ts:12-14`, for a plugin root with spaces.
  Done on 2026-11-02 for 22.10.2, 22.10.3 and 22.10.5 to 22.10.13: specs written failing first in `wrapper.spec.ts` and `block.spec.ts`, `bun test plugins/claudetto/src/blocks/confine` 47 pass, `just check` exit 0. The `confine` cost was re-measured with `bun tools/capture/run.ts --arm plugin --interactive`: 39,711 characters off and on.
- [x] 22.11 Commit the work of this round, 67 changed files and the untracked `confine`, `option.ts`, and change files, in commitlint-valid commits. Verify with `git status --short`, which prints nothing. Done on 2026-11-02 in 7 commits, `7f1aed03` to `3c7a505f`, with `bunx commitlint --from HEAD~7` exit 0, and `git status --short` printed nothing. The stray handoff under the change folder came from a handoff written after a shell `cd`; that defect is fixed in `fix(handoff)`, and the file moved to `.claude/claudetto/handoffs/`.
- [x] 22.12 Explain the `unexplained residual` of `cuts.ts`, 4,307 characters, which is set by subtraction and is a plug. Free: read whether the removals interact, two rows at a time, with `just capture --shipped`. Against the re-read rows it was 9,611. Six named pieces are now rows (7,814), and the 1,797 left is the interaction of the removals, of which about 47 is unexplained. Removing every piece at once reads the 46,007 baseline.
- [x] 22.13 Read again each row of the cut table of `docs/surfaces.md` other than `tool texts`, which were read against the 28,527 arm before the `ListAgents` move. Free: `just capture --shipped` with each piece removed. Every row was re-read against 27,960: `deny list` 7,065 (was 12,421, a `plain`-arm reading), `tool texts` 6,668, and `sandbox block` −7,220. The others held. `just inventory` passes.
- [x] 22.14 Split the claudetto share of the interactive request by piece again, last split at 13,131 before the `AskUserQuestion` text and the `ListAgents` move. Free: `just capture --shipped --interactive --dump DIR`. Done on 2026-11-02 from the pieces of the `--dump` request; `bun test tests/repo` 100 pass.
- [x] 22.15 Read again "The effect on the request" in `docs/surfaces.md`, a capture of the 2026-10-30 texts. Free: `just capture --deny Workflow,ScheduleWakeup,ReportFindings --tools 12`. Read on `2.1.316` in `d6498d9b`: `plain` 33,586, `plugin` 27,504 with 8 tools, and the texts take 7,669 off `tools`.
- [x] 22.16 Add a check that the always-loaded table of `docs/prompt/footprint.md` and the tool-text table of `docs/surfaces.md` match `TOOL_TEXTS` and the section lengths, because no check reads them and both drifted this round. Write the failing test first. Verified: `tests/repo/doc-tables.test.ts` first failed on the missing `AskUserQuestion` row, and passes 5 of 5 with the row added. With `Agent` set to 445 in `docs/surfaces.md` it fails two tests.
- [x] 22.17 Decide whether the main-rules eval results stand. Each eval session started before 22.1 inherited the running session's `CLAUDE_EFFORT` and `CLAUDE_CODE_SUBAGENT_MODEL`, so it did not run as stock. Rerun of the `main.md` arm, after approval: `just eval --run --arm main.md`, 80 sessions. Cost, from the last run of that arm: 5,776,926 tokens, $6.80, 0.18% of the 3.20B-token week and 0.61% of the weekly limit at $11.19 a percent. Rerun on 2026-11-02: 72 of 80 pass, seven cases 10/10 and `I13` 2/10; 4,992,343 tokens, $6.37, 0.16% of the week and 0.57% of the weekly limit. The `main.md` results stand; the default arm was not rerun. Recorded in `docs/prompt/footprint.md`.

## 23. Open Entries of `ISSUES.md`

Each task closes when its entry moves to "Fixed" with the commit that fixes it, or stays with the reason it cannot close in `0.3.0`.

- [x] 23.1 The classifier reads the user's words after Stop hook feedback as hook text Fixed in `73d465d9` for the `classify` block, moved to "Fixed" of `ISSUES.md`. No paid eval of the new transcript has run.
- [ ] 23.2 The classifier does not take an approval from the plan or an `AskUserQuestion` answer
- [x] 23.3 "Rewire the Agent" matches comments in source and test files Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.4 The `classify` block denies a call whose reason says the rule does not apply Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.5 `AGENTS.md` asks before a paid run, against task 4.4 Stays open: the line is the user's own, so `AGENTS.md:8` stays and each paid run is asked first.
- [ ] 23.6 Two tasks of `release-0-3-0` no longer match their verify text Stays open: 5.3 and 4.5 no longer match their verify text, and no code fix changes that.
- [ ] 23.7 A helper that takes `$` cannot leave its hook file Stays open: the engine follows `$` past an import only into a `function` declaration, and the `biome` config forbids `function` declarations.
- [x] 23.8 The classifier does not credit the user's authorization of a named secret for a named use Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.9 The classifier denies the agent driving a nested Claude Code session Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.10 The built-in classifier denies with no reason
- [x] 23.11 Main sessions ran on `claude-opus-5`, not `claude-opus-5-5` Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`. Gap: the `opusplan` and plan-mode switches are not yet run under `tmux`.
- [x] 23.12 The agent counts and prices models the user does not run Fixed in `96901c6b`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.13 The agent opens a reply with agreement after a correction Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.14 The agent answers its own defect with apology, narration, and a retrospective Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.15 The agent writes comments that narrate what code does Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.16 The agent hands the user work it can do itself Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.17 The agent ignores the prompt guides in `external/please-use-me-often/` Fixed in `96901c6b`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.18 The agent does not catch a wording defect in its own prompts Stays open: the entry records a gap in the agent's own prompt review that no code fix closes.
- [ ] 23.19 The weekly limit ran out in five days Stays open: the entry records a spent weekly limit, and the levers it lists are other tasks.
- [x] 23.20 The agent reads every user message as a task Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.21 The agent writes "not verified" instead of checking Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.22 Replies end with offers and pedantic caveats Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.23 The handoff block nests each handoff in the next Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.24 Auto-compaction costs a full-context call on the session's model Stays open: auto-compaction runs on the session's own model and cannot be moved to a cheaper one.
- [x] 23.25 The agent killed the user's processes with a loose `pkill` on 2026-11-02 Fixed in `96901c6b`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.26 Paid probe rounds took a quarter of the week Fixed in `7919dc54`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.27 Every call re-reads the whole context Stays open: each call re-reads the whole context, which no setting removes.
- [ ] 23.28 The handover must hit the cache Stays open: the handover must hit a server-side cache that the plugin cannot keep warm, and two paid runs missed.
- [ ] 23.29 Message 0 is written again at each handover
- [ ] 23.30 A handover costs half of a core compaction at 166k tokens Stays open: the entry is a measurement of one session shape, and a handover costs about what a core compaction costs.
- [x] 23.31 Core's `context_management` section contradicts the handoff block Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.32 Replacing auto-compaction with the handover Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.33 The paid run on 2026-11-02 cost 3.4 times its estimate Fixed in `7919dc54`, moved to "Fixed" of `ISSUES.md`.
- [ ] 23.34 Outside methods for context cost, read on 2026-11-02 Stays open: the entry records outside methods that were read and not adopted.
- [x] 23.35 Frontier model prose departs from plain language Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.
- [x] 23.36 The agent acted on its own and asked nothing on 2026-11-02 Fixed in `69401cf6`, moved to "Fixed" of `ISSUES.md`.

## 24. Garbage Collector (`hygiene`)

Pure code, run by the `SessionStart` hook and `bin/claudetto-hygiene`. No model call, no tool, command, or skill text. Tests run on `mkdtemp` folders only. A run on the real temp root or `~/.claude/` other than `--dry-run` waits for the user's go-ahead.

- [x] 24.1 Keep the handoff that resume reads: `handoffs()` in `sweep.ts` picks it with `newestHandoff` and imports `HANDOFF_DIR`. Verified: the new spec failed first, then `just test plugins/claudetto/src/hygiene plugins/claudetto/tests/hygiene.test.ts` gave 17 pass, 0 fail.
- [x] 24.2 Legacy-named handoffs past the age go; `0-1-1-status-line.md` and a `handoff-*.md` symlink stay. Failing spec first. Done: the sweep already handled these, so the new `retention.spec.ts` cases passed on first run with no failing step. `just check` exit 0 on 2026-11-02.
- [x] 24.3 `userConfig` keys, each `min: 0` with 0 for off: `handoffCleanupPeriodDays`, `sessionTempCleanupPeriodDays` (both default to `cleanupPeriodDays`), `probeCleanupPeriodMinutes` (default 60), and `hygieneEnabled` (default `true`). Flags `--handoff-days`, `--session-days`, `--probe-minutes`. Failing tests first. Verify with `claude plugin validate`. Done: `claude plugin validate plugins/claudetto` passed. The keys are `type: "number"`, because the schema has no `integer`; the CLI and the block take whole numbers only. Specs failed first (4 pass, 18 fail, 3 errors). `just check` exit 0 on 2026-11-02.
- [x] 24.4 Decide the handoff default, 7 days (the read-back age) or `cleanupPeriodDays`, and record it in the new `session-hygiene` delta. Decided by the user on 2026-11-02: an unset `handoffCleanupPeriodDays` follows `cleanupPeriodDays`, as the `session-hygiene` delta says.
- [x] 24.5 `rootsOf` sweeps `claude-<uid>` under `CLAUDE_CODE_TMPDIR`, `/tmp`, and `os.tmpdir()`, once per `realpath`, only when the folder exists and the user owns it. `/tmp/claude-501` is never hard-coded. Done in `temp-roots.ts` with an injectable candidate list, failing spec first. `just check` exit 0 on 2026-11-02.
- [x] 24.6 `rootsOf` refuses a root in `~/.claude/projects`, `~/.claude/plugins`, or the home folder itself. Failing guard test first. Done in `guard.ts`, which resolves symlinks, failing spec first. `just check` exit 0 on 2026-11-02.
- [x] 24.7 Document the manual run (`bin/claudetto-hygiene --dry-run` by its cache path) in `README.md`, with no command, skill, or tool text. Done: `README.md` "Run the Hygiene Sweep by Hand".
- [x] 24.8 The dev tools remove their own `mkdtemp` root in `finally`, and `--keep` keeps it: `claudekit/session/folders.ts`, `claudekit/prefix/session.ts`, `claudekit/probe/round/round.ts`, `tools/evals/classifier/session.ts`, `tools/evals/execute.ts`. Failing tests first. Verify that `ls -d /tmp/claudetto-eval-* | wc -l` does not grow after one fake-API run. Verified on 2026-11-02: `just capture --shipped` left `claudetto-capture-*` at 273, and a stubbed `executeSession` with the default `/tmp/claudetto-eval-` prefix passed and left `claudetto-eval-*` at 410. The 80 folders of the 22.17 rerun came from a process started before the change. Later the same day an interactive capture leaked 2 folders: `claude` wrote its transcript after the folder was removed, because `kill-server` returns before the pane process exits. Fixed in `runInTmux`, which now waits for the pane pid; failing spec first in `claudekit/session/__tests__/tmux.spec.ts`, and `just capture --shipped --interactive` left the count at 267.
- [x] 24.9 `claudekit/gc/`, a dev-only backstop with a failing spec first. It removes prefix-matched `mkdtemp` folders past `--hours` (default 24, 0 for off). It keeps a folder that is a process's cwd, one with a live `tmux.sock`, a symlink, and a name outside the pattern. It takes `--dry-run`. Built with `bun test claudekit/gc` 18 pass, but the specs were written after the code, so there was no failing run; open until a spec is shown failing against a broken build. Shown failing on 2026-11-02 against four broken builds, each restored after: the cwd guard matching only the folder itself failed `keeps a folder that is a process cwd, or holds one`; the age cut removed failed 2 specs; the live-socket guard removed failed `keeps a folder with a live `tmux.sock``; the name test without its 6-character suffix failed 2 specs. The restored tree passes `just test claudekit/gc`, 18 pass, 0 fail.
- [x] 24.10 `just gc *args` next to `just hygiene`; run `just gc --dry-run` here, which removes nothing. `just gc` is in `justfile`; the dry run on the real `/tmp` waits for the user's go-ahead. `just gc --dry-run` on the real `/tmp`, approved by the user on 2026-11-02: `gc would remove 0 folders, 0 bytes`.
- [x] 24.11 `README.md`, `CHANGELOG.md` `[Unreleased]`, and `.env.example` for the keys and `just gc`. Done: `README.md` config rows for the four keys and a `just gc` line, `CHANGELOG.md` `### Added`. `bun test tests/repo` 100 pass.
- [x] 24.12 A `paths.ts` source line for the handoff row: 47 handoffs in 7 projects, oldest 2026-10-23. Done, with the measured count instead of the planned one: a reading of 2026-11-02 found 27 handoffs in 5 projects, oldest 2026-10-29, at `src/hygiene/paths.ts:46`.
- [x] 24.13 `just hygiene --dry-run` and `just gc --dry-run` list no path under `~/.claude/projects`, `~/.claude/plugins`, or a `--dump` folder. Dry runs approved by the user on 2026-11-02: `just hygiene --dry-run` would remove 0 entries and `just gc --dry-run` 0 folders, and neither listed a path under `~/.claude/projects` or `~/.claude/plugins`.
- [x] 24.14 Prove the request did not grow: after 24.2 to 24.13, `just capture --shipped` reads 27,886 and `--interactive` 39,711 in the `plugin` arm, and the `plain` arm 28,809 and 42,129. Done: after the hygiene and `claudekit/gc` changes, `just capture --shipped` read 27,886 and 28,809, and `--interactive` read 39,711 and 42,129.
- [x] 24.15 Read what writes `cache-break-state-<session-id>.json` and decide whether it is a row. Verify with a dry run on a scratch copy. Done: Claude Code `2.1.316` writes `cache-break-state` into the temp root, 2 files of about 7 KB here, so it is no row. The hygiene dry run listed 0 entries.
- [x] 24.16 After the user's go-ahead, delete the existing dev scratch (about 3.2 GiB in 1,292 folders under `/tmp`). Verify that the count reads 0 and no `tmux` server serves those sockets. Run on 2026-11-02 after the eval, under the approved rule (older than 24 hours, not a cwd, no live `tmux.sock`): 8 `claudetto-capture-*` folders, 50 MiB, removed. 1,420 younger folders, 3.3 GiB, stay, so the count is not 0 and the task stays open. The user then allowed any age with the guards kept: 1,420 more folders removed, none a process's cwd or holding a live `tmux.sock`. The count reads 0 and no `tmux.sock` is left.

## 25. Interactive Request

Baselines on 2026-11-02, free capture: `plugin` 39,711 interactive and 27,886 `-p`, `plain` 42,129. Each saving is in characters.

- [ ] 25.1 Decide whether `AskUserQuestion` moves behind `ToolSearch` (−3,917 interactive, 0 in `-p`).
- [x] 25.2 Count the extra turn of a deferred tool on the fake API with `--calls`, before shipping any defer. `ListAgents` upfront takes 2 requests, 57,771 characters, and deferred 3, 86,741. `Agent` upfront takes 2, 56,717, and deferred 3, 83,421. The first use adds about 643 and 533 new characters against a saving of 605 and 2,402 per request.
- [ ] 25.3 Decide on deferring `Agent` (−2,364) and `Skill` (−566); the five-tool defer saves 8,300 interactive and 4,379 `-p`.
- [ ] 25.4 Decide whether the `context_management` reminder (−932) loads only when a handoff is likely.
- [ ] 25.5 Shorten the `autoMode` rules text (4,969) and keep each rule. Verify that `safeguards` falls and the classifier lab passes.
- [ ] 25.6 Decide whether `main.md` (1,676 over the stock body) is trimmed past the 6,000 cap, and which section.
- [x] 25.7 Document in `docs/prompt/footprint.md` that `CLAUDE_CODE_DISABLE_CLAUDE_MDS=1` saves 1.27 characters per character of memory file and is not a default. Done on 2026-11-02 from the pieces of the `--dump` request; `bun test tests/repo` 100 pass.
- [x] 25.8 Move the `PROBE_MD` option of `/tmp/probe-capture` into `tools/capture`, if `CLAUDE.md` size is to be tracked. `just capture --claude-md CHARS` in `2d56b060`, with 4 tests in `tools/capture/__tests__/capture.spec.ts`. 1,000 adds 1,396, 5,000 adds 5,463, and 20,000 adds 20,713.
- [x] 25.9 Record in `docs/surfaces.md` that the sandbox block (6,675) is not a lever, and the 156 of `denyRead`. Record the split of the 39,711 by owner in `docs/prompt/footprint.md`; that closes 22.14. Done on 2026-11-02 from the pieces of the `--dump` request; `bun test tests/repo` 100 pass.

## 26. Prompt Cache Audit

Paid run of 22.8: each request read the previous read plus the previous write, so nothing churns the prefix. The deferred `Monitor` did not break the cache.

- [x] 26.1 `run-limits/block.ts:138-163`: add the `Background tasks still running` context only when the set of task `id` and `status` changed. Spec first. Done: `tasksKey` in `run-limits/background.ts` and `tasksChanged` in `run-limits/block.ts`, with the key in versioned state `tasks`. The 3 cases of `tests/run-limits/stop.test.ts` failed first; the lab read 285 pass and 1 fail before the fix and 288 pass after.
- [x] 26.2 Rerun the `Monitor` session on the fake API after 26.1, and count its requests with `bun claudekit/paid-run/main.ts` (expect 7, not 11). Done, with 8 requests instead of the expected 7: 75,652 tokens against 11 requests and 106,096 before.
- [x] 26.3 A spec that fails when an earlier byte of `system` or a prior message changes between dumped bodies, with `comparePrefix`. Done: `claudekit/paid-run/__tests__/drift.spec.ts`.
- [x] 26.4 A spec that pins when `describeAnswer` flips for a stock text of a different length. Done: `tests/claudetto/describe-flip.test.ts`.
- [x] 26.5 Paid, after approval: one `claude-haiku-5-5` `Monitor` run after 26.1, compared per request with the 22.8 table. Estimate from 22.8: about 130,000 tokens, $0.0053, 0.0005% of the weekly limit, capped by `--max-budget-usd 0.15`. Run on 2026-11-03 with the 22.8 command and the same cap: 7 requests against 8, 113,043 tokens (94,387 cache read, 17,796 cache write, 14 input, 846 output) against 130,731, $0.0049 against $0.0053, 0.0035% of the 3.20B-token week. The cache write per request after the first two reads 442, 569, 423, 339, and 478, against 412, 336, 604, 398, 362, and 444. `permission_denials` was empty, and the session reported tick 1, 2, and 3.
- [ ] 26.6 Test a mid-session `CLAUDE.md` edit and a `settings.json` edit in the free capture. Half done: the `CLAUDE.md` edit was read, and the `settings.json` edit was not, because the sandbox refused the write.
- [x] 26.7 Recompute the cost of the 22.8 run with its `ephemeral_1h` writes at 2 times input, not 1.25. Done: the price table already counts `ephemeral_1h` writes at 2 times input, so the $0.0053 stands.

## 27. Snippet Claims and Prompt Wording

Claim table in the 0.3.0 notes: 31 claims, 15 true, 4 false (`.claudeignore`, `view_file`, a repeated diff, the `CLAUDE.md` cache break).

- [ ] 27.1 Bound test and build output: a sentence in the `Bash` text, or a `PreToolUse` rewrite hook. Decision first.
- [x] 27.2 A line-range clause in `main.md` `<project_context>`. Done: "Read a large file by line range with `offset` and `limit`, not whole."
- [ ] 27.3 Decide whether setup writes `Read` denies for lock files and build output.
- [x] 27.4 Document `opusplan` in `README.md` as opt-in, with its cache cost on each mode change. Done: `README.md` "Model `opusplan`".
- [ ] 27.5 `ast-grep` in the `Athena` and `Hephaestus` search sentence, only if the target repos have it. Folded into 28.3.
- [x] 27.6 Nine positive-form rewrites: four agents ("try no way around it" becomes "stay inside it"), `main.md:43`, `Concise.md:19`, and `texts.ts:7,42,61`. Verify that the old phrases are gone with `rg` and `just check` passes. Done: `rg` finds none of the old phrases in `plugins/` (exit 1), and `just check` exits 0. The shipped `-p` request moved from 27,886 to 27,960 and the interactive one from 39,711 to 39,785; `just inventory` exits 0 with `SHIPPED_TOTAL`, `tool texts`, `main agent body`, and `output style` moved by each text's change.
- [x] 27.7 Update `tests/tool-describe.test.ts` for 27.6 without loosening an assertion. Done, with no edit: no assertion of `tests/tool-describe.test.ts` named an old phrase, and the suite passes in `just check`.
- [ ] 27.8 Paid, after approval: the prompt eval of the changed texts, with its cost asked first.
- [x] 27.9 After 27.6, rerun the measurement tasks 22.12, 22.13, and 22.15, which wait on settled texts. All three were read after `72a2a004`.

## 28. CLI Tools Instead of Built-in and System Tools

From the user's note `/tmp/0.3.0-notes/cli-tools.txt`, whose claims are unverified. Readings of 2026-11-03 on this machine: `jq` 1.7.1 and `rg` 14.1.1 are present. `ast-grep`, `semgrep`, `comby`, `tree-sitter`, `difft`, `fd`, `eza`, `yq`, `htmlq`, `procs`, and `xh` are missing. `ctags` is the BSD build of Xcode, not `universal-ctags`. Release binaries of `ast-grep` 0.51.1, `fd` 10.5.0, and `difft` 0.72.0 were fetched to `/tmp/cli-probe/`, and the auto mode classifier denied running them. Bash output by first command, over the 1,641 transcripts under `~/.claude/projects/`: `grep` 5,373 calls and 9,851,099 characters, `sed` 2,435 and 6,498,435, `cat` 1,647 and 4,782,701, `ls` 2,449 and 2,270,444, `git diff` 319 and 1,235,704, `find` 310 and 418,366, `rg` 196 and 307,724, `jq` 26 and 70,469, `diff` 37 and 58,313, `curl` 29 and 23,375, and `ps` 17 and 10,358. A tool the user must install costs every user, so each candidate below is used only when it is on `PATH`, and a session without it keeps the current path.

- [ ] 28.1 Decide whether `Athena` and `Hephaestus` get the built-in `Grep` and `Glob` in place of `grep` and `find` in `Bash`, which their bodies name now. Those tools respect `.gitignore` with no install, and `grep` in `Bash` is the largest Bash output above. Free: the size each tool schema adds to a subagent request with `just capture`, against the output a search returns. On this repo `find . -type f` prints 163,581 characters and `rg --files` prints 36,939.
- [ ] 28.2 Record in `docs/` that a `--json` output is no saving: for the same 3 hits of `session\.messages\(` in `plugins/claudetto/src`, `rg --json` prints 1,875 characters and `rg -n` prints 317. Keep `--json` out of the prompt texts.
- [ ] 28.3 Measure `ast-grep` against `rg` on one real query of this repo, once a binary may run (the user installs it with `brew install ast-grep`, or approves running `/tmp/cli-probe/sg/ast-grep`). Then decide on a search sentence in `Athena` and `Hephaestus` that is used only when `command -v ast-grep` finds it. Bundling: release 0.51.1 has zips of about 8.6 to 9.0 MB for Linux `x86_64` and `aarch64` (gnu only, no musl) and macOS `x86_64` and `aarch64`, with no universal macOS asset (`lipo` would make one). The macOS `aarch64` binary is 53,955,184 bytes unzipped, and the license is MIT. Homebrew 0.51.1 has no Intel macOS bottle.
- [ ] 28.4 Decide on a file-listing line for `fd`. It reads the ignore files as `rg --files` does, and `find` is 0.9% of the Bash output above, so the line may name the built-in `Glob` instead, which needs no install. Unmeasured for `fd` itself until a binary may run.
- [ ] 28.5 Measure `difft --display inline` against `git diff` on recent commits of this repo, once a binary may run, before any claim that it saves tokens. `git diff` is 1,235,704 characters over 319 calls above.
- [ ] 28.6 Measure a `universal-ctags` symbol index against the `Read` calls it would replace for an `Artemis` search, once it is installed (`brew install universal-ctags`).
- [ ] 28.7 Drop `semgrep`, `comby`, `tree-sitter`, `eza`, `yq`, `htmlq`, `procs`, and `xh` for `0.3.0`, with the reading: `ps`, `curl`, and `jq` are each under 71,000 characters over all transcripts, `WebFetch` already turns HTML into text, and no claudetto hook runs a shell tool that these replace.
- [ ] 28.8 Read why `sed` and `cat` in `Bash` print 11,281,136 characters, more than `grep`, when `main.md` says to read a large file by line range with `Read`. Free: classify those calls by subagent and by whole-file or range read.

## Workflow follow-up

- Move each `ISSUES.md` entry to "Fixed" with the commit that fixes it, as its task closes.
- Bump the version to `0.3.0` with the release recipe, archive `release-0-3-0`, and sync its specs.
