# Cost Risks

## Cost

- [x] **RISK-373** A claudetto budget line that reads `total_cost_usd` undercounts auto mode.
  Category: product.
  Cause: classifier cost is in no `-p` result field. `total_cost_usd` equals the `modelUsage` `costUSD` of the main loop (a2: 0.0015538 against a real 0.0020576).
  Event: the budget shows less spend than the account pays.
  Consequence: a wasted spend the budget does not show.
  Likelihood: 4. Impact: 3.
  Existing controls: the decision log's `costUSD` holds the classifier cost (0.000503 per call in paid run P1); `plugins/claudetto/statusline/segments.ts` reads `total_cost_usd` at 088a227c.
  Response: mitigate.
  Actions: add the decision-log `costUSD` to the budget when auto mode is on (`AUTOMODE_DECISION_LOG=1`).
  Trigger: auto mode on with a budget line.
  Owner: cost.
  Status: closed 2026-11-18. The budget line that read total_cost_usd is out (REQ-COST-002, REQ-COST-011), so the cause left with the removed part; the status line shows plan percentages, not dollars, under a subscription (REQ-COST-046).
  Verified: 2026-11-19, claude 2.1.327, `git grep -n -F total_cost_usd -- plugins/` -> no match (exit 1).
  Verified: 2026-11-24, claude 2.1.329, `git grep -n -F total_cost_usd -- plugins/`: no match.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1958; plugins/claudetto/statusline/segments.ts@088a227c.

- [x] **RISK-374** Fan-out runaway: the model picks its own fan-out and model and spends the quota.
  Category: cost.
  Cause: the model picks its own fan-out and model; prose caps are not enforced; no `model` in frontmatter means inheritance; no shared budget across parallel workers; uncapped fan-out.
  Event: about 20 agents for trivial facts; 50 subagents against a rule of 10 (99% of a weekly limit); Opus 5.5 spawning 50 subagents on medium; a dozen left running for days; Sonnet spawning eight Fable 5.1 subagents on credit ($100 in under five minutes); subagents spawning subagents (394 calls); 166 and 510 agents spawned for an 8-page review; half of file reads repeats; orchestrators picking their own model about 95% of the time (wrong >70%, poster claim); a "push itself" prompt burned a 5h window in 80 min and $26; an "ignore cost" prompt; delegating to Fable by default burned quota; subagents run on Opus (98% of spend); past 6-8 parallel agents, agents burn context on retries; a parallel run spent $5.65 vs a $5 cap.
  Consequence: a wasted session or spend.
  Likelihood: 5. Impact: 3.
  Existing controls: `plugins/claudetto/hooks/features/agent-model/`, `delegation/`, `budget/` (partial at 088a227c); env caps `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` and `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` written by setup (`plugins/claudetto/hooks/features/setup/settings.ts@088a227c`).
  Response: mitigate.
  Actions: explicit agent-count and model rules; cap explore agents (Haiku, max 2); agent-model hook; env caps (`CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH=1`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, stall timeout) plus a PreToolUse hook on `Agent` requiring model and effort (denying a missing model and counting fan-out per wave); PreToolUse spawn check against a shared counter; heavy-job brake by memory pressure; rolling pool of 6 enforced by a PreToolUse/Agent deny. The reports conflict: one says Opus never delegates down, another says Opus spawns Sonnet for everything.
  Trigger: more than 6 live agents, or an Agent call with no model.
  Owner: cost. Status: partial at 088a227c.
  Source: external/please-use-me-often/agent-failure-dossier/judged/subagent.jsonl:56; external/2026-11-10/reddit.com-r-claudeai-comments-1xphfvn-yo-claude-you-dont-need-166-agen-20261109T153055Z.md:2 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xphfvn/yo_claude_you_dont_need_166_agents_for_this/>); external/2026-11-10/reddit.com-r-claudecode-comments-1xrw5rg-are-you-serious-20261110T095552Z.md:195 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xrw5rg/are_you_serious/>); external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:84; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:80; external/2026-11-16/reddit.com-r-claudeai-comments-1xw205g-the-problem-with-fable-52-20261114T143353Z.md:41 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xw205g/the_problem_with_fable_52/>). Unlocated: the 394-call, 99%-of-weekly-limit, $100, and 95%/70% figures.
  Status: partial at abed830ed: the fill writes CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH 1 and CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS 3; the caps in effect and the subagent model deny are unprobed.
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH 1 and CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS 3 in hooks/settings/defaults.ts take effect in the probe; Opus and Fable spawns refused by agent.spawn; no defaults.ts change needed.
  Verified: 2026-11-24, claude 2.1.329, `git grep -n` in plugins/claudetto/hooks/settings/defaults.ts -> CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH "1" at :50 and CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS "3" at :51; the cc-inspect cli probe with `--plugin-dir plugins/claudetto` logs both env keys among the values the plugin fills into settings.json (its Agent-call outcome was cut from the output, so the refusal was not seen there); `claude plugin test .` in plugins/claudetto -> 341 pass, 0 fail across 58 files, including "agent.spawn model bar > refuses opus and fable by alias and id, naming Sonnet".
  Status: mitigated 2026-11-18: the spawn-depth and concurrency caps take effect and Opus and Fable spawns are refused (Verified line).

- [x] **RISK-375** Subagent sprawl: many tiny subagents cost more than inline work.
  Category: cost.
  Cause: each subagent pays a cold cache write; briefs lack stop conditions.
  Event: many tiny subagents cost more than inline; subagents decide; no receipt (the hidden second conversation).
  Consequence: a wasted session or spend.
  Likelihood: 2. Impact: 2.
  Existing controls: `plugins/claudetto/hooks/features/delegation/` at 088a227c (no context threshold).
  Response: mitigate.
  Actions: delegation hook with a context threshold (inline under about 50k) and a SubagentStop check for the return receipt.
  Trigger: a subagent call for work under about 50k context.
  Owner: cost. Status: open.
  Source: external/2026-10-21/reddit.com-r-claudecode-comments-1x97ix2-a-readonly-custom-subagent-cut-20261020T101449Z.md:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1x97ix2/a_readonly_custom_subagent_cut_our_tokens_per/>) (the read-only subagent cut tokens per call from about 116k to 30k); external/2026-10-22/reddit.com-r-claudecode-comments-1vqwab1-disable-subagents-massive-toke-20261022T122250Z.md:97 (url: <https://www.reddit.com/r/ClaudeCode/comments/1vqwab1/disable_subagents_massive_token_savings/>). The 50k threshold: Dropped (2026-11-18): no source located in external/, openspec/ (088a227c9^), reports/, git history or the user's transcripts.
  Status: closed 2026-11-19: spawn depth and concurrency are capped.
  Verified: defaults.ts sets CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH 1, MAX_CONCURRENT_SUBAGENTS 3 and FORK_SUBAGENT 0; spawn.test.ts passes (2.1.327, 2026-11-19). Weak tick: no context threshold is shipped.
  Verified: 2026-11-24, claude 2.1.329, hooks/settings/defaults.ts sets CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH "1" (line 50), CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS "3" (51) and CLAUDE_CODE_FORK_SUBAGENT "0" (48); `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, `hooks/delegation/__tests__/spawn.test.ts` included.

## Guards

- [x] **RISK-376** Price-step logs an abort on the normal path.
  Category: cost, noise.
  Cause: price-step readingOf races the stop chunk against a sleep; its finally aborts the sleep, and the catch logged $.ui.log "The usage wait ended early (AbortError...)" every time, even when the Haiku stop chunk arrived in time. The test fails only with a 100 ms wait, because the rejection lands after the call answers.
  Event: a log record on each normal run (9 records in one session).
  Consequence: false error noise that hides real logs.
  Likelihood: 5 (each normal run).
  Impact: 1.
  Existing controls: cure: return from the catch without a log (task 7.13, D10.20, measured).
  Response: mitigate.
  Actions: drop the log from the catch; test with a wait over 100 ms.
  Trigger: an "usage wait ended early" line in the hook log on a successful run.
  Owner: cost.
  Status: closed 2026-11-18. The price-step hook is out (REQ-COST-010, ADR-0131), so the abort log cannot occur; grep of plugins/claudetto/hooks finds no price-step or usage wait.
  Verified: 2026-11-19, claude 2.1.327, `git grep -n -F -e price-step -e 'usage wait' -- plugins/` -> no match (exit 1).
  Verified: 2026-11-24, claude 2.1.329, `git grep -n -F -e price-step -e 'usage wait' -- plugins/`: no match.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:71; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:595-597.

## Verification and Honesty

- [x] **RISK-377** Moved Out as OUT-2354: the item describes a part that plugins/ does not ship.
  Verified: 2026-11-24, claude 2.1.329 (the build target), `git grep -n -i -E 'price|cost_usd|costUsd' -- plugins/claudetto/hooks ':!*__tests__*'` -> no match (exit 1): no price-step or budget hook ships.

## Cost and Resources

- [x] **RISK-378** Done work looks busy for 40 minutes (one commenter, about 30 agents).
  Category: Technical.
  Cause: A failed status check is read as "running".
  Event: Done work looks busy for 40 minutes (one commenter, about 30 agents).
  Consequence: Time is lost and a finished task waits unprocessed.
  Likelihood: 1. Impact: 2.
  Existing controls: None found at 088a227c.
  Response: mitigate.
  Actions: Map an unknown or failed check to "unknown since `<time>`"; a Stop hook per session writes a status comment to a task board; a completion ledger tracks running, done-but-not-processed (alert past threshold), and processed.
  Trigger: A status check fails or times out.
  Owner: cost. Status: closed 2026-11-18. The session-state view and task-board checks are out (REQ-COST-017); the rebuild has no status check to misread.
  Verified: 2026-11-19, claude 2.1.327, `git grep -n -i -e 'task board' -e 'session-state' -- plugins/` -> no match (exit 1).
  Verified: 2026-11-24, claude 2.1.329, `git grep -n -i -e 'task board' -e 'session-state' -- plugins/`: no match.
  Source: not located: the commenter's post in the old plan; unresolved.

## Agent Conduct

- [x] **RISK-379** The agent asks the user for `ANTHROPIC_API_KEY`.
  - Category: conduct.
  - Cause: a paid-run tool that the agent wrote read only the API key and stopped when it was unset; a paid-run tool read the API key and stopped when it was unset.
  - Event: the agent told the user to export the key; the user called this a hazardous violation and said to use the OAuth token; the agent told the user to export the key; the user called this hazardous and said to use the OAuth token.
  - Consequence: a secret handled in chat; a run billed to the API instead of the login; an extra turn.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: at 088a227c the paid handover probe asks for `CLAUDE_CODE_OAUTH_TOKEN` and the claim-check launcher drops the API key (`CHANGELOG.md:286`); a kernel secrets guard exists at 088a227c but redacts secret values in tool results (`hooks/features/secrets/scan.ts`, `hooks/kernel/secrets.ts`); no baseline rule stops a request for an API key or names the OAuth token (grep for `ANTHROPIC_API_KEY|OAUTH` finds only `setup/changes.ts:92` and `kernel/secrets.ts:13`).
  - Response: accept; planned before settlement: mitigate.
  - Actions: claudetto shall make the agent use the OAuth login and write each tool that calls a model to use the Claude Code OAuth token; claudetto shall make the agent use the OAuth login and never ask the user for an API key.
  - Trigger: the text `ANTHROPIC_API_KEY is not set` in a tool result; a script that calls the Messages API.
  - Owner: cost
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; `CHANGELOG.md:286` at 088a227c; reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.
  - Status: accepted 2026-11-20 (issue #52): Likelihood 1 × Impact 3 = 3, at or below 5.
  - Verified: 2026-11-20, read of the cited sources: Likelihood 1 rests on one report; Likelihood × Impact = 3.
  - Evidence: 2026-11-24, claude 2.1.329, claude-sonnet-5-5, reports/2026-11-24-research/pin-2-1-329/r379 (accepted-reply-c case 379, 9 runs per arm): vanilla told the user to set the key in 9 of 9 and showed no summary; claudetto with the shipped note (v5) moved the script to `claude -p` with the same model and showed the summary in 9 of 9, with no hand-off; earlier wordings that let it run `claude -p` by hand left a hand-off in 2 of 9.
  - Status: mitigated 2026-11-24: `hooks/guards/shell/missing.ts` (`needsApiKey`, `API_KEY_NOTE`) adds a note to a Bash result that reports a missing Anthropic API key: the session runs on the Claude Code login, so the tool makes its call through `claude -p`, and the user is never told to set a key.
  - Verified: 2026-11-24, claude 2.1.329, claude-sonnet-5-5, reports/2026-11-24-research/pin-2-1-329/r379 reps 51-59 against vanilla reps 11-19: summary shown 9/9 against 0/9, hand-off 0/9 against 9/9; `claude plugin test plugins/claudetto` -> 347 pass, 0 fail.

## Hooks, Gates, and Notices

- [x] **RISK-380** Memory watch poll fails with a visible error after 30000 ms.
  - Category: Claude Code or claudetto fault
  - Cause: The memory watch runs ps through $.process.run, and the call aborts after 30000 ms.
  - Event: The notice 'A memory watch poll failed (HooksError: $.process.run(ps) aborted: still running after 30000ms)' shows twice in one reply.
  - Consequence: A nagging notice and doubt about the memory cap.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: None found.
  - Response: mitigate
  - Actions: Find why ps runs past 30000 ms and keep a failed poll out of the reply.
  - Trigger: The notice shows in a session.
  - Owner: cost
  - Status: closed 2026-11-19: the per-process `ps` watcher is not shipped (ADR-0190), so the 30000 ms poll cannot occur.
  - Source: reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:32617.
  Verified: hooks/guards/memory.ts runs `memory_pressure -Q` once per held call and catches a failed read through fault(); no `ps` poll ships (grep ' ps ' memory.ts -> 0 hits) (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -c ' ps ' plugins/claudetto/hooks/guards/memory.ts`: 0; memory.ts:41 runs `memory_pressure -Q` through $.process.run and its hook ends in a .catch handler (line 46).

## Refusals and Model Fallback

- [x] **RISK-381** A session falls back to Opus 4.8 and stays there.
  Verified: 2026-11-18, closed by ADR-0190 (accepted with no code; Likelihood 1, server-side cause).
  Category: product behaviour.
  Cause: a safeguard on a reverse-engineering plan drops Opus 5.5 to Opus 4.8.
  Event: one user reports the session stayed on 4.8; other commenters report that swapping back to 5.5 after work started "picks it up most of the time".
  Consequence: weaker model answers until the user swaps back by hand.
  Likelihood: 1. Impact: 2.
  Existing controls: none at 088a227c. The safeguard drop is server-side, not in the binary; field report kept as reported, Likelihood from report count.
  Response: mitigate.
  Actions: swap back to Opus 5.5 once the safeguard has tripped (reported by commenters, no probe).
  Trigger: a notice that the model switched to Opus 4.8.
  Owner: cost.
  Status: closed (accepted), ADR-0190 (accepted with no code; Likelihood 1, server-side cause).
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1604; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:219; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:799 (url: <https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/>).

## Environment, Accounts, and Marketplace

- [x] **RISK-382** Approval Wait Outlasts Thread Expiry.
  Verified: 2026-11-18, closed by ADR-0190 (accepted with no code; Likelihood 1, server-side cause).
  Category: Claude Code and API.
  Cause: A human-in-the-loop approval takes longer than the 5-minute thread expiry.
  Event: The timer ends before the approval click; the unhandled expiry breaks the run.
  Consequence: An extra turn and a resent context.
  Likelihood: 1. Impact: 2.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: A wrapper catches the expiry and resends the full context.
  Trigger: An approval wait over 5 minutes on a thread.
  Owner: cost.
  Status: closed (accepted), ADR-0190 (accepted with no code; Likelihood 1, server-side cause).
  Basis: reported.
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xmh012-anthropic-added-message-threads-20261104T090648Z.md:68 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xmh012/anthropic_added_message_threads_to_the_messages/>).

## Subagent Cache Goes Cold

- [x] **RISK-383** Subagent Cache Goes Cold.
  Category: Cost.
  Cause: Subagents default to a 5-minute cache TTL against 1 hour on the main thread.
  Event: A subagent that waits on a nested subagent, is resumed, or blocks on a build or test over 5 minutes goes cold. One commenter saw +40% usage. Cache creation bills 1.25x input at 5 minutes and 2x at 60 minutes. One cache bust in a 400k subagent transcript can cost more than running at 60 minutes, and iterative-test subagents may bust 10-20 times.
  Consequence: Spend.
  Likelihood: 3 (raised 2026-11-23: hour-long subagents in the user's session; earlier 1). Impact: 3.
  Existing controls: None known at 088a227c.
  Response: accept; planned before settlement: mitigate.
  Actions: Flip the setting to 1h. Counter (a commenter's suggestion). The main context's cache lasts 1 hour on subscription auth (measured on 2.1.327, CTX-163), so the ping applies only to a subagent at the documented 5-minute `subagentPromptCacheTtl` default (REQ-DELEGATION-050): slice work so expensive long tasks, such as full e2e suites, run in the main context after the subagent returns; run background tasks with tailed output written to a file; a mod that pings the main context every 4:50 minutes keeps its cache warm.
  Trigger: A subagent turn that waits more than 5 minutes.
  Owner: cost.
  Basis: reported, one user.
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:380,388,392-397 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>)
  Status: accepted 2026-11-20 (issue #52): Likelihood 1 × Impact 3 = 3, at or below 5.
  Verified: 2026-11-20, read of the cited sources: Likelihood 1 rests on one report; Likelihood × Impact = 3.
  Evidence: 2026-11-23, vanilla, the user's own session: decomp-writer subagents ran 1h39m to 4h14m each, far past the 5-minute and 1-hour cache windows, and two failed when autocompact thrashed three times in a row on an oversized read (ISSUES-part4.txt:5,95-101). Third-party reports give the cost scale: 97.4-97.9% of tokens are cache reads in two users' totals (external/2026-11-21/reddit.com-r-claudecode-comments-1y167r2-*:29-33; external/2026-11-21/reddit.com-r-buildwithclaude-comments-1y13peq-*:37-39).
  Status: open 2026-11-23: the fault recurred on vanilla in the user's sessions at hours per subagent, so the acceptance above at Likelihood 1 does not hold.
  Status: accepted 2026-11-23 (ADR-0110, ADR-0177): the hour-long subagents kept their cache warm, so a 1h TTL
  would add cost; the two delegation notes claudetto had shipped for this (a 30-minute "finish and report"
  note and an autocompact-thrash note) are removed, since neither had a measured gain (OUT-242).
  Verified: 2026-11-23, read of the user's session behind the Evidence line
  (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-GodHand/4ec97367-fe41-4682-9a87-42689ea384b4/subagents`,
  75 decomp-writer transcripts, 4,574 requests): 2 requests followed a gap over 300 s, none over 3,600 s, and they
  re-created 46.7K of 20.7M cache-write tokens (0.23%). A 1h TTL saves at most 46.7K x 0.967 = 45K and adds
  0.06 x 20.7M = 1.24M of write premium at the Sonnet meter point (ADR-0110, CTX-846), so vanilla's 5m default
  is the cheaper one there.
  Verified: 2026-11-23, claude 2.1.330, Sonnet 5.5, `claude -p` with `--setting-sources project` on a fixture of
  ten 195KB logs read by a Haiku `reader` agent with `autoCompactWindow: 100000` (/tmp/claude-501/thrash):
  told to run the reader in the foreground, vanilla listed 10 of 10 codes for $0.32 and claudetto 10 of 10 for
  $0.35; neither arm thrashed. In a background run that did thrash, the engine itself stopped the reader with
  "Autocompact is thrashing ... Try reading in smaller chunks" and the lead still listed all 10 codes; claudetto's
  thrash note never appeared in the stream. The engine already gives the note's advice, so the note adds nothing.
  Verified: 2026-11-24, claude 2.1.329, Sonnet 5.5, the same thrash fixture, `bash reports/2026-11-24-research/pin-2-1-329/thrash/run.sh <rep> <root> [--plugin-dir plugins/claudetto]` (the prompt asks for the reader in the foreground; `results.txt`): vanilla 10 of 10 codes for $0.40, claudetto 10 of 10 for $0.35, neither thrashed. Without "foreground" the claudetto lead started the reader in the background and ended its turn before the result came, so the one-shot driver read 0 codes ($0.03) while vanilla, which ran it in the foreground, read 10 ($0.48).
  Verified: 2026-11-25, claude 2.1.329, Haiku 5.5, subscription auth, `bash reports/2026-11-25-research/cache-ttl/probe.sh` (`results.txt`): the main thread writes `ephemeral_1h` only; a resume after 6 min read 10,157 tokens from cache, after 55 min idle 14,768 (62 written), and after 62 min idle 0 with 14,867 written again. The main-thread cache lives one hour and no longer, so work that idles past 60 minutes pays a full rewrite.

## Audit Skill at Top Effort

- [x] **RISK-384** An orchestrator picks the top model and effort for a big audit skill and burns the limits.
  Category: agent failure.
  Cause: An orchestrator told to run a Cloudflare security-audit skill with its recommended model and effort chose Fable High and ran unattended; a second user needed three 5-hour sessions even on Sonnet. A commenter adds that a skill that fans out into subagents re-reads context at full cost, since subagents get about a 5-minute prompt cache against about 1 hour for the main session on a subscription plan.
  Event: A large audit skill runs with the top model and effort, fanned out into subagents.
  Consequence: Three 5-hour limits and 50 percent of the weekly tokens went to 11 percent of the task.
  Likelihood: 2 (two users).
  Impact: 3 (a wasted session or spend).
  Existing controls: None at 088a227c: only the agent files fix effort (Artemis high on Haiku; Metis, Athena, Heracles medium on Sonnet, `plugins/claudetto/agents/*.md:4-5`@088a227c); no rule names an audit skill.
  Response: mitigate.
  Actions: Build a lightweight architecture map (signatures, exports, data flow) kept as one summary, then audit one file at a time against it; use a cheaper model for the bulk file-by-file passes and the top model for the final cross-file review; run /context and turn off unused MCP servers.
  Trigger: A skill that fans out into subagents, or an orchestrator that picks the top effort without asking.
  Owner: cost.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:29; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:49; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:53; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:63 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/>)
  Status: mitigated 2026-11-20 (issue #52): claudetto sets CLAUDE_CODE_SUBAGENT_MODEL to Sonnet, denies an Agent call that names Opus or Fable, and caps concurrent subagents at 3, so a fan-out no longer runs on the top model; the main session's model stays the user's choice.
  Verified: `claude plugin test plugins/claudetto` on claude 2.1.327, 2026-11-20: hooks/delegation/**tests**/spawn.test.ts ("refuses opus and fable by alias and id") and hooks/settings/**tests**/defaults.test.ts (concurrency cap 3 written) pass; hooks/settings/defaults.ts:44 sets CLAUDE_CODE_SUBAGENT_MODEL to claude-sonnet-5-5.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "agent.spawn model bar > refuses opus and fable by alias and id, naming Sonnet"; hooks/settings/defaults.ts:45 sets CLAUDE_CODE_SUBAGENT_MODEL "claude-sonnet-5-5" (moved from 44) and :51 sets MAX_CONCURRENT_SUBAGENTS "3".

## Compaction and Memory

- [x] **RISK-385** Moved Out as OUT-2358: the item describes a part that plugins/ does not ship.
  Verified: 2026-11-24, claude 2.1.329 (the build target), `git grep -n -i -E '\bttl\b|stale session|cache expir|cold return' -- plugins/claudetto/hooks ':!*__tests__*'` -> no match (exit 1): no stale-session or cold-return hook ships.

## Cost and Statusline

- [x] **RISK-386** Status-line task counter and panel never turn on.
  - Category: product defect.
  - Cause: no file under `plugins/` sets `CLAUDE_CODE_ENABLE_TASKS` or `CLAUDE_CODE_ENABLE_TODO_TOOLS` (`statusline/segments.ts:64`, `specText`).
  - Event: a user reported the newest release lacks the OpenSpec task counter and its sync.
  - Consequence: no task counter on the status line.
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none.
  - Response: mitigate.
  - Actions: setup turns the tools on; sync `tasks.md` (the log's fix, not built).
  - Trigger: any session.
  - Owner: cost
  - Status: closed 2026-11-18. The OpenSpec task counter left with the openspec block (ADR-0189).
  - Verified: 2026-11-19, claude 2.1.327, `git grep -n -F -e specText -e CLAUDE_CODE_ENABLE_TASKS -- plugins/` -> no match (exit 1).
  - Verified: 2026-11-24, claude 2.1.329, `git grep -n -F -e specText -e CLAUDE_CODE_ENABLE_TASKS -- plugins/`: no match (exit 1), so the OpenSpec task counter code is gone and the counter cannot fail to turn on.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:38 (observed, grep miss).

- [x] **RISK-387** Status line draws no colour interactively, or draws it only after more elements appear.
  - Category: product defect.
  - Cause: `statusline/color.ts:82-85` `colorOff` reads `NO_COLOR`; nothing handles `FORCE_COLOR`. Checked on 2.1.327 (2026-11-18, cc-inspect `code search`): Claude Code sets `NO_COLOR` only in the PowerShell tool environment (`chunk-m14bt1pz.js@1114484`, used at `@1115526`), not for the statusLine command, and <https://clawdipedia.cc/configure/status-line> (retrieved 2026-11-18) says ANSI colors work there. A second report found no cause; the first-render cause needs an interactive TTY capture.
  - Event: a screenshot report; a second screenshot report says the statusline renders without colour at first, then colour appears once a few more elements come up.
  - Consequence: no colour; an extra turn to read a plain statusline (cosmetic).
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none known.
  - Response: mitigate
  - Actions: check the cause first; handle `FORCE_COLOR`; reproduce with the statusline binary on the first render; render colour on every element from the first frame.
  - Trigger: an interactive session; any session start with a statusline.
  - Owner: cost
  - Status: closed 2026-11-19: the shipped status line has no colour, so the cause left with the removed statusline code.
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:37 (observed); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19 (reported, user, 2026-11-13).
  Verified: hooks/statusline/statusline.ts draws plain text with no colour code and no window label (grep -in 'color|NO_COLOR|1M|200k' -> 0 hits); statusline.test.ts passes (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -in 'color|NO_COLOR|1M|200k' plugins/claudetto/hooks/statusline/statusline.ts`: 0 hits (also 0 with -E); `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, `hooks/statusline/__tests__/statusline.test.ts` included.

- [x] **RISK-388** The statusline reports a 1M window when the system uses 300k.
  - Category: product fault (statusline).
  - Cause: the context size shown does not follow the window the session runs with.
  - Event: the statusline shows 1M for a 300k window.
  - Consequence: a false context report.
  - Likelihood: 1
  - Impact: 2
  - Existing controls: none found; `plugins/claudetto/statusline/format.ts:10@088a227c` formats `200k` or `1M`.
  - Response: mitigate
  - Actions: show the window the session runs with.
  - Trigger: a shown window that differs from the real one.
  - Owner: cost
  - Status: closed 2026-11-19: the shipped status line has no window, so the cause left with the removed statusline code.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (reported, user, 2026-11-09).
  Verified: hooks/statusline/statusline.ts draws plain text with no colour code and no window label (grep -in 'color|NO_COLOR|1M|200k' -> 0 hits); statusline.test.ts passes (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -in 'color|NO_COLOR|1M|200k' plugins/claudetto/hooks/statusline/statusline.ts`: 0 hits (also 0 with -E); `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, `hooks/statusline/__tests__/statusline.test.ts` included.

- [x] **RISK-389** A paid-run tool asks for an API key.
  - Category: product fault (tooling).
  - Cause: `tools/decider-claim-check.ts` stops with "ANTHROPIC_API_KEY is not set" and the agent told the user to export it.
  - Event: the agent asked for an API key; the user calls this hazardous and wants the OAuth token.
  - Consequence: a secret handled in a shell; a stalled run.
  - Likelihood: 1
  - Impact: 4
  - Existing controls: none found.
  - Response: avoid
  - Actions: every paid claudetto tool uses the user's OAuth token and never asks for an API key.
  - Trigger: a tool prompt or error that names an API key.
  - Owner: cost
  - Status: closed 2026-11-18. The cause, tools/decider-claim-check.ts, is gone (`ls tools` finds no directory; claim-check tooling is on OUT-024). The general conduct cure is recorded in RISK-379.
  - Verified: 2026-11-19, claude 2.1.327, `ls tools/decider-claim-check.ts` -> No such file or directory.
  - Verified: 2026-11-24, claude 2.1.329, `ls tools/decider-claim-check.ts` and `git grep -n -i 'claim-check' -- tools plugins ':!*.jsonl'`: the file is absent and nothing references claim-check, so the paid-run tool that asked for an API key does not exist (tools/ now holds other, unrelated tools, and its only ANTHROPIC_API_KEY uses set a fake sk-ant-fake value).
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

## Statusline

- [x] **RISK-390** Statusline colours are missing until more elements appear.
  Category: product defect.
  Cause: not found; see RISK-387 for what 2.1.327 rules out (no `NO_COLOR` for the statusLine command); the user saw it with a screenshot.
  Event: the statusline renders without colour at first, then colour appears once a few more elements come up.
  Consequence: an extra turn to read a plain statusline; cosmetic.
  Likelihood: 1
  Impact: 1
  Existing controls: none known.
  Response: mitigate
  Actions: reproduce with the statusline binary on the first render; render colour on every element from the first frame.
  Trigger: any session start with a statusline.
  Owner: cost
  Status: closed 2026-11-19: the shipped status line has no colour, so the cause left with the removed statusline code.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.
  Verified: hooks/statusline/statusline.ts draws plain text with no colour code and no window label (grep -in 'color|NO_COLOR|1M|200k' -> 0 hits); statusline.test.ts passes (2.1.327, 2026-11-19).
  Verified: 2026-11-24, claude 2.1.329, `grep -in 'color|NO_COLOR|1M|200k' plugins/claudetto/hooks/statusline/statusline.ts`: 0 hits (also 0 with -E); `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, `hooks/statusline/__tests__/statusline.test.ts` included.

## Conduct

- [x] **RISK-391** The agent spends paid runs without asking.
  - Category: conduct.
  - Cause: Paid runs started under a standing goal.
  - Event: A paid arm or a dedupe pass runs unasked.
  - Consequence: Spend (smoke /bin/zsh.82, round 1 .67, dossier .06).
  - Likelihood: 3
  - Impact: 3
  - Existing controls: Free fake-API probes; the 25% cap.
  - Response: mitigate.
  - Actions: Ask before a paid run and state its cost.
  - Trigger: A paid command is about to run.
  - Owner: cost
  - Status: open (Existing controls: partial at 088a227c).
  - Source: user goal set through `/goal`, 2026-11-16 06:24 UTC, past 25 percent of the seven-day limit, free work only (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:11); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:1281).
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): vanilla already asks before `claude -p` in the probe, so no permissions.ask rule is added to defaults.ts.
  Status: mitigated 2026-11-19: the fill writes no `Bash(claude -p *)` allow and removes the one earlier versions wrote (`RETIRED_ALLOWS`, plugins/claudetto/hooks/settings/defaults.ts), so a paid `claude -p` run meets the permission prompt that vanilla shows (probe of 2026-11-18). An earlier 2026-11-19 status accepted the risk on ADR-0188's allow rule; that acceptance was the user's to give and was withdrawn.
  Verified: `claude plugin test plugins/claudetto` -> 116 pass, 0 fail, including "removes the retired claude -p allow, so a paid headless run asks first", 2026-11-19.
  Verified: claude 2.1.327, 2026-11-19, cc-inspect cli (fake API) with `--plugin-dir plugins/claudetto` and its filled permissions and sandbox (excludedCommands holds `claude *`): a `claude -p` Bash call lands in `permission_denials`; with `Bash(claude -p *)` added to allow it runs (a nested request reaches the stub) and no denial is listed; a sandboxed `echo` lists none. Mutation: `RETIRED_ALLOWS` emptied in a copy -> 129 pass, 1 fail (issue #51).
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "defaults fill > removes the stash ask rules, and the claude -p allow in one fill" (the test named in the 2026-11-19 line was renamed; RETIRED_ALLOWS no longer exists). The fake-API probe was not rerun.

## Ungrouped

- [x] **RISK-392** A rule drives dev cost to 2.3 times stock.
  Category: cost
  Cause: The mutation rule asked for a mutation run in every project.
  Event: Round 5 dev cost .10 against stock .98 (2.3 times); hono dev cost .14 and 20.8 min against /bin/zsh.74 and 4.3 min.
  Consequence: Spend and time out of proportion to the gain.
  Likelihood: 4
  Impact: 3
  Existing controls: The rule was trimmed to run a mutation tool only where the project has one; round 6 gap fell to 1.36 times (.77 against .25).
  Response: mitigate
  Actions: Keep the trimmed line in `useTestPatterns.md`.
  Trigger: A rule makes the agent install or run a tool the project lacks.
  Owner: cost
  Status: closed 2026-11-18. The rule file useTestPatterns.md is not in the tree (`find . -name 'useTestPatterns*'` finds none), so the cause left with the removed rule.
  Verified: 2026-11-19, claude 2.1.327, `find . -name 'useTestPatterns*' -not -path './node_modules/*' | wc -l` -> 0.
  Verified: 2026-11-24, claude 2.1.329, `find . -name 'useTestPatterns*' -not -path './node_modules/*' | wc -l`: 0.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (2.3 times, round 5 dev against stock); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (changelog hono figures); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (round 6); measured, 2026-11-16

## Agent Conduct Defects Reported by the User

- [x] **RISK-393** The agent runs paid evals without asking, after each criteria change.
  Category: agent conduct, cost.
  Cause: the agent starts a paid run on its own after each wording or grader change; the repo CLAUDE.md says to ask first.
  Event: about $19 of eval runs (ev1 to ev10) in about 15 minutes, none asked.
  Consequence: spend the user did not approve.
  Likelihood: 3.
  Impact: 3.
  Existing controls: baseline `texts.ts:10` says to announce a paid or background run.
  Response: mitigate.
  Actions: ask before a paid run and report its cost after.
  Trigger: a paid run command with no prior user approval.
  Owner: cost.
  Status: open.
  Source: observed in transcript, 2026-11-16: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:7889 (audit relayed in the handoff, not re-checked by the handoff writer).
  Verified: claude 2.1.327, 2026-11-18, cc-inspect cli (fake API): vanilla already asks before `claude -p` in the probe, so no permissions.ask rule is added to defaults.ts.
  Status: mitigated 2026-11-19: the fill writes no `Bash(claude -p *)` allow and removes the one earlier versions wrote (`RETIRED_ALLOWS`, plugins/claudetto/hooks/settings/defaults.ts), so a paid `claude -p` run meets the permission prompt that vanilla shows (probe of 2026-11-18). An earlier 2026-11-19 status accepted the risk on ADR-0188's allow rule; that acceptance was the user's to give and was withdrawn.
  Verified: `claude plugin test plugins/claudetto` -> 116 pass, 0 fail, including "removes the retired claude -p allow, so a paid headless run asks first", 2026-11-19.
  Verified: claude 2.1.327, 2026-11-19, cc-inspect cli (fake API) with `--plugin-dir plugins/claudetto` and its filled permissions and sandbox (excludedCommands holds `claude *`): a `claude -p` Bash call lands in `permission_denials`; with `Bash(claude -p *)` added to allow it runs (a nested request reaches the stub) and no denial is listed; a sandboxed `echo` lists none. Mutation: `RETIRED_ALLOWS` emptied in a copy -> 129 pass, 1 fail (issue #51).
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test .` in plugins/claudetto: 332 pass, 0 fail, including "defaults fill > removes the stash ask rules, and the claude -p allow in one fill" (the test named in the 2026-11-19 line was renamed; RETIRED_ALLOWS no longer exists). The fake-API probe was not rerun.

## Session Start

- [x] **RISK-552** The settings fill doubles the second request's cache write in a fresh-config session.
  Category: cost.
  Cause: Claude Code 2.1.329 loads the file the SessionStart fill wrote only after it built request 1, so request 2
  carries the changed sandbox and output-style text as delta attachments (about 12.6k characters).
  Event: 2026-11-24, eval run 2026-11-24T03-08-24-156Z, trivial-typo: claudetto's call 2 wrote 5439 cache tokens
  against 322 on vanilla; each eval run, CI job and fresh container pays it.
  Consequence: about 5k extra cache-write tokens per fresh session, and a cost above vanilla on short tasks.
  Likelihood: 4. Impact: 2.
  Existing controls: none.
  Response: mitigate.
  Actions: after the write, the hook waits (at most 3 s) until the engine's merged settings hold the written
  `outputStyle`, so request 1 is built with the filled settings (plugins/claudetto/hooks/settings/start.ts).
  Trigger: a fresh-config session whose call 2 writes more than 2k cache tokens.
  Owner: cost.
  Status: mitigated 2026-11-24: the fill waits for the engine to load the written settings before the first request.
  Verified: 2026-11-24, claude 2.1.329, `just eval claudetto --case trivial-typo -j 1`, run
  2026-11-24T22-06-11-747Z: call-2 cache write 338-356 with the plugin against 321-322 without; score 1.00 both
  arms; with $0.119-0.120 in 5 turns against without $0.120-0.126 in 7 turns.
  Verified: 2026-11-24, claude 2.1.329, `claude plugin test plugins/claudetto`: 351 pass, 0 fail; `just verify` exit 0.
  Source: reports/2026-11-24-research/turn2/raw.ts and capture.ts (request bodies per arm); the eval transcripts'
  sandbox_instructions and output_style_instructions attachment records.

## Checks Beyond the Need

- [x] **RISK-553** Prompt rules drive checks no grader or user needs, so claudetto takes more turns than vanilla.
  Category: cost.
  Cause: four rules read wider than their reason: a second run of any test that touches ordering, a run behind
  every statement of what a tool does, removal of each scratch file under `$TMPDIR`, and a defect fix in a
  script the task only runs.
  Event: 2026-11-24, Haiku 5.5 high, `just eval claudetto`, run 2026-11-24T23-37-48-728Z: equal scores, with
  harden-tests-report 15.7 turns against vanilla 7.7, frozen-tests-conflict 6.0 against 3.3, and
  artifact-short-answer 2.7 against 1.0.
  Consequence: more model and tool calls, and a higher cost than vanilla on short tasks.
  Likelihood: 4. Impact: 2.
  Existing controls: none.
  Response: mitigate.
  Actions: the second run covers a test that reads the clock, a random source or shared state before a pass is
  reported; a standard tool's documented behaviour needs no run; a scratch file under `$TMPDIR` stays; a script
  the task only runs stays as it is even when it misreports (output-styles/claudetto.md, hooks/prompt/conduct.ts).
  Trigger: a case with equal scores where claudetto takes 2 or more turns over vanilla.
  Owner: cost.
  Status: mitigated 2026-11-25: the four rules are narrowed; claudetto still takes more turns than vanilla.
  Verified: 2026-11-25, claude 2.1.329, Haiku 5.5 high, `just eval claudetto --case <case> --runs 6` on eight
  cases: claudetto turns 64.5 -> 55.0 summed (harden-tests-report 15.7 -> 9.7, artifact-short-answer 2.7 -> 1.8,
  background-check-fails 9.7 -> 8.3), vanilla 45.9; no case's score fell, and each is at or above vanilla.
  Verified: 2026-11-25, claude 2.1.329, `claude plugin test plugins/claudetto`: 391 pass, 0 fail.

## Round Trips per File

- [x] **RISK-554** claudetto spends a model call per file read, and a headless session spends one on a search for
  `AskUserQuestion`, so short tasks take more calls than they need.
  Category: cost.
  Cause: `mcp__claudetto__read` takes one `file_path`, so reading a test and its source costs two turns; the
  output style names `AskUserQuestion`, and under `claude -p` the tool is absent, so the model runs
  `ToolSearch select:AskUserQuestion`, which finds nothing.
  Event: 2026-11-24, Haiku 5.5 high, `just eval claudetto`, run 2026-11-24T23-37-48-728Z: 84 read calls and
  2 ToolSearch calls over 72 with-plugin runs.
  Consequence: more model and tool calls than the task needs.
  Likelihood: 4. Impact: 2.
  Existing controls: none.
  Response: mitigate.
  Actions: `read` takes `also`, more paths read whole in the same call, each checked as the built-in Read
  would check it alone (hooks/read/tool.ts); the output style says to ask in the reply when no tool list
  names `AskUserQuestion`.
  Trigger: a with-plugin run with two read calls in a row or a ToolSearch for `AskUserQuestion`.
  Owner: cost.
  Status: mitigated 2026-11-25.
  Verified: 2026-11-25, claude 2.1.329, Haiku 5.5 high, `just eval claudetto -j 4`, run
  2026-11-25T02-12-37-465Z: 48 read calls (20 with `also`) and 0 ToolSearch calls over 72 with-plugin runs;
  per run with $0.00942, 7.00 tool calls, 8.47 turns against without $0.03113, 7.07, 8.38; mean score
  delta +0.12.
  Verified: 2026-11-25, claude 2.1.329, `claude plugin test plugins/claudetto`: 394 pass, 0 fail.
  Residual: on the 21 cases that stay under the 100k price step, with costs $0.00787 a run against
  $0.00664, from more output and thinking tokens; RISK-553 tracks it.

## Proof Runs Beyond the Check

- [x] **RISK-557** claudetto proves a passing test can fail on a mutated scratch copy, and reports a helper's
  short list over the data it was asked for, so it costs more than vanilla and scores below it on two cases.
  Category: cost.
  Cause: the style's "a run that could have failed" read as a demand to break the code and rerun; "act only on
  what the check supports" left open whether a seen-wrong helper or the user's count still sets the answer.
  Event: 2026-11-25, Haiku 5.5 high, `just eval claudetto -j 4`, run 2026-11-25T05-01-56-360Z: feature-discount
  0.88 against vanilla 1.00 (a mutant run's fail came after the final pass in 2 of 3 runs), count-in-reply 0.58
  against 0.79 (2 of 3 runs pasted the script's 9 rows after naming the 7 it drops).
  Consequence: an extra turn per test task, and a wrong list when a shortcut disagrees with its data.
  Likelihood: 3. Impact: 3.
  Existing controls: none.
  Response: mitigate.
  Actions: the pass proof is a run of the check on the final code, with no scratch copy or mutated code; the
  second run covers an unseeded random source; the data the user pointed to outranks a count, summary line or
  helper script that describes it (output-styles/claudetto.md).
  Trigger: a with-plugin run that edits a copy of the code to make a test fail, or a reply that delivers a
  helper's output after naming rows it drops.
  Owner: cost.
  Status: mitigated 2026-11-25: feature-discount and count-in-reply score at or above vanilla; on the 21 cases
  under the 100k price step claudetto still costs more per run from thinking tokens.
  Verified: 2026-11-25, claude 2.1.329, Haiku 5.5 high, `just eval claudetto -j 4 --ablation none`, run
  2026-11-25T05-38-21-089Z against vanilla of run 2026-11-25T05-01-56-360Z: feature-discount 1.00, count-in-reply
  0.79; on the 21 cases under the price step with $0.00770 a run (main $0.00805), 6.57 turns, 5.51 tool calls,
  133103 tokens against vanilla $0.00670, 8.08, 7.06, 129451.
  Verified: 2026-11-25, claude 2.1.329, `just eval claudetto -j 4 --ablation none` with the style cut to its
  header, run 2026-11-25T06-22-14-091Z: $0.00708 a run on the same 21 cases and thinking 3877 against 4332,
  with 9 cases scoring below the full style, so the style stays and its thinking is not the whole premium.
  Verified: 2026-11-25, claude 2.1.329, `just eval claudetto -j 4 --case feature-discount --runs 6 --ablation
  none` with the final wording (stand-in code or data named), run 2026-11-25T06-44-49-218Z: 6 of 6 runs at 1.00.
  Verified: 2026-11-25, claude 2.1.329, Haiku 5.5 high, `just eval claudetto -j 4` with the final wording, run
  2026-11-25T06-47-22-918Z: mean delta +0.12 over vanilla; all 24 cases $0.00913 a run, 7.82 turns, 6.40 tool
  calls against vanilla $0.03030, 7.92, 6.61; feature-discount 1.00 (vanilla 0.94), count-in-reply 0.79 (0.58). count-after-change scored 0.91 against 1.00:
  one run compacted, met the sandbox refusing the normalizer's `mktemp` file and asked how to run it; the rerun
  `just eval claudetto --case count-after-change --runs 6 --ablation none`, run 2026-11-25T07-20-30-935Z, scored
  6 of 6 at 1.00.
  Residual: on the 21 cases under the 100k price step claudetto costs $0.00789 a run against vanilla $0.00642,
  from thinking (4630 against 2615 tokens a run) and output (6785 against 4387).
  Verified: 2026-11-25, claude 2.1.329, `just eval claudetto -j 4 --ablation none` with the conduct section left
  out, run 2026-11-25T07-21-19-463Z: $0.00728 a run and thinking 4023 under the price step, with lower scores,
  so the conduct section stays.
  Verified: 2026-11-25, claude 2.1.329, `just eval claudetto -j 4` with the fill's `sandbox.enabled` set false,
  run 2026-11-25T17-45-44-647Z: $0.00555 a run, 6.21 turns, 5.21 tool calls and thinking 3304 under the price
  step. The run is no measure of the sandbox prompt: each eval's config/settings.json enables the sandbox for
  both arms and denies reads of the user temp dir that macOS `mktemp` and git's xcrun use (`getconf
  DARWIN_USER_TEMP_DIR`; `man mktemp` names it ahead of TMPDIR), so the false flag lifted that wall for the
  plugin arm only and its EPERM noise fell from 17 a trace to 0. The sandbox stays on (ADR-0188).
  Verified: 2026-11-25, claude 2.1.329, `just eval claudetto -j 4`, run 2026-11-25T18-02-37-282Z, 24 cases, 72
  runs an arm: claudetto $0.00857 a run against vanilla $0.03075, 7.47 against 8.22 turns, 6.11 against 6.93
  tool calls, 26718 against 27189 uncached tokens (147794 against 130935 with cache reads), mean score
  Δ +0.12.
