# Cost Risks

## Cost

- [ ] **RISK-373** A claudetto budget line that reads `total_cost_usd` undercounts auto mode.
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
  Status: open.
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:1958; plugins/claudetto/statusline/segments.ts@088a227c.

- [ ] **RISK-374** Fan-out runaway: the model picks its own fan-out and model and spends the quota.
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

- [ ] **RISK-375** Subagent sprawl: many tiny subagents cost more than inline work.
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

## Guards

- [ ] **RISK-376** Price-step logs an abort on the normal path.
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
  Status: open (rebuild). At baseline price-step exists (plugins/claudetto/hooks/features/price-step/); the log line was not read there.
  Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:71; openspec/changes/archive/2026-11-16-2-1-323/research/defects.md:595-597.

## Verification And Honesty

- [ ] **RISK-377** Miscalibrated estimate.
  Category: Agent behaviour.
  Cause: No measurement before the claim; training on human-programmer durations.
  Event: A 13% saving called small ("13% is still a lot"), a run "would cost a lot" with no number vs a 94% session costing $2.88, a tool shipped after 2 runs of a trivial case, machine-wide sudo proposed from inference; Opus says "years/months" or "5-7 days" for a task it finishes in hours, an invented deadline for a task of about 30 minutes (reported). Cost is the largest Reddit theme (about 191 threads, cited count).
  Consequence: A user decision rests on a false size or cost.
  Likelihood: 2. Impact: 2.
  Existing controls: plugins/claudetto/hooks/features/price-step and budget at 088a227c (partial).
  Response: mitigate.
  Actions: Compute numbers, dry run, give cost as a number against the budget; price-step and budget hooks give a dry-run token or USD figure before the ask; prompt text forbidding human-time estimates; ask for agent time and human review hours. A Stop check for day, week, or month estimates by pattern is out (see OUT item on regex Stop checks; user decision, 2026-11-16).
  Trigger: A reply gives a duration in days or a cost with no number.
  Owner: cost. Status: open.
  Source: external/please-use-me-often/agent-failure-dossier/02-verification-and-honesty.md:163; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:142 (about 191 threads). Not located: the 94% session $2.88 and the days-for-hours estimate quotes.

## Cost And Resources

- [ ] **RISK-378** Done work looks busy for 40 minutes (one commenter, about 30 agents).
  Category: Technical.
  Cause: A failed status check is read as "running".
  Event: Done work looks busy for 40 minutes (one commenter, about 30 agents).
  Consequence: Time is lost and a finished task waits unprocessed.
  Likelihood: 1. Impact: 2.
  Existing controls: None found at 088a227c.
  Response: mitigate.
  Actions: Map an unknown or failed check to "unknown since <time>"; a Stop hook per session writes a status comment to a task board; a completion ledger tracks running, done-but-not-processed (alert past threshold), and processed.
  Trigger: A status check fails or times out.
  Owner: cost. Status: open (reported).
  Source: not located: the commenter's post in the old plan; unresolved.

## Agent Conduct

- [ ] **RISK-379** The agent asks the user for `ANTHROPIC_API_KEY`.
  - Category: conduct.
  - Cause: a paid-run tool that the agent wrote read only the API key and stopped when it was unset; a paid-run tool read the API key and stopped when it was unset.
  - Event: the agent told the user to export the key; the user called this a hazardous violation and said to use the OAuth token; the agent told the user to export the key; the user called this hazardous and said to use the OAuth token.
  - Consequence: a secret handled in chat; a run billed to the API instead of the login; an extra turn.
  - Likelihood: 1
  - Impact: 3
  - Existing controls: at 088a227c the paid handover probe asks for `CLAUDE_CODE_OAUTH_TOKEN` and the claim-check launcher drops the API key (`CHANGELOG.md:286`); a kernel secrets guard exists at 088a227c but redacts secret values in tool results (`hooks/features/secrets/scan.ts`, `hooks/kernel/secrets.ts`); no baseline rule stops a request for an API key or names the OAuth token (grep for `ANTHROPIC_API_KEY|OAUTH` finds only `setup/changes.ts:92` and `kernel/secrets.ts:13`).
  - Response: mitigate.
  - Actions: claudetto shall make the agent use the OAuth login and write each tool that calls a model to use the Claude Code OAuth token; claudetto shall make the agent use the OAuth login and never ask the user for an API key.
  - Trigger: the text `ANTHROPIC_API_KEY is not set` in a tool result; a script that calls the Messages API.
  - Owner: cost
  - Status: partly done.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0afb43bf-4a66-4969-9e0b-5695bf570654.jsonl:9; `CHANGELOG.md:286` at 088a227c; reported, user, 2026-11-11; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

## Hooks, Gates, And Notices

- [ ] **RISK-380** Memory watch poll fails with a visible error after 30000 ms.
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
  - Status: open.
  - Source: reported, user, 2026-11-14; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:32617.

## Refusals And Model Fallback

- [ ] **RISK-381** A session falls back to Opus 4.8 and stays there.
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
  Status: Open.
  Source: external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:1604; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:219; external/2026-10-25/reddit.com-r-claude-comments-1xaiezw-title-has-anyone-actually-tried-th-20261024T141159Z.md:799 (url: <https://www.reddit.com/r/claude/comments/1xaiezw/title_has_anyone_actually_tried_the_viral_reverse/>).

## Environment, Accounts, And Marketplace

- [ ] **RISK-382** Approval Wait Outlasts Thread Expiry.
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
  Status: open.
  Basis: reported.
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xmh012-anthropic-added-message-threads-20261104T090648Z.md:68 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xmh012/anthropic_added_message_threads_to_the_messages/>).

## Subagent Cache Goes Cold

- [ ] **RISK-383** Subagent Cache Goes Cold.
  Category: Cost.
  Cause: Subagents default to a 5-minute cache TTL against 1 hour on the main thread.
  Event: A subagent that waits on a nested subagent, is resumed, or blocks on a build or test over 5 minutes goes cold. One commenter saw +40% usage. Cache creation bills 1.25x input at 5 minutes and 2x at 60 minutes. One cache bust in a 400k subagent transcript can cost more than running at 60 minutes, and iterative-test subagents may bust 10-20 times.
  Consequence: Spend.
  Likelihood: 1. Impact: 3.
  Existing controls: None known at 088a227c.
  Response: mitigate.
  Actions: Flip the setting to 1h. Counter (a commenter's suggestion). The main context's cache lasts 1 hour on subscription auth (measured on 2.1.327, CTX-163), so the ping applies only to a subagent at the documented 5-minute `subagentPromptCacheTtl` default (REQ-DELEGATION-050): slice work so expensive long tasks, such as full e2e suites, run in the main context after the subagent returns; run background tasks with tailed output written to a file; a mod that pings the main context every 4:50 minutes keeps its cache warm.
  Trigger: A subagent turn that waits more than 5 minutes.
  Owner: cost. Status: open.
  Basis: reported, one user.
  Source: external/2026-11-06/reddit.com-r-claudecode-comments-1xo6dfy-thanks-to-two-lines-in-the-cla-20261105T084836Z.md:380,388,392-397 (url: <https://www.reddit.com/r/ClaudeCode/comments/1xo6dfy/thanks_to_two_lines_in_the_claude_setting_i_was/>)

## Audit Skill At Top Effort

- [ ] **RISK-384** An orchestrator picks the top model and effort for a big audit skill and burns the limits.
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
  Status: open.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:29; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:49; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:53; external/2026-11-02/reddit.com-r-claudeai-comments-1xkrwiv-i-tried-running-the-cloudflare-s-20261101T191448Z.md:63 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xkrwiv/i_tried_running_the_cloudflare_securityaudit/>)

## Compaction And Memory

- [ ] **RISK-385** A session resumed after the cache TTL re-sends and re-writes its whole context at the write premium.
  - Category: cost.
  - Cause: cache expiry (TTL) forces a full re-write; compaction on a cold or switched model gets no cache hit; past the cache TTL (about 5 minutes API; 1h subscription; reports of about 1h10m) a resumed long session pays the full re-write.
  - Event: the user or agent resumes a long idle session, or compacts cold, and burns 15-40% of a window; resume after a 20-minute break rewrote cost silently and users learned from the bill (harness fault, not model); a 900k session left overnight cost about 15% of the 5h window and 2% weekly on the first request (cause: cache expiry, not the handoff prompt); a 400k+ session resumed cold jumped the 5h limit about 15%; "continue" after a limit reset re-reads everything at full price (0% to 40% in seconds); `/compact` is itself a full pass (11% in seconds).
  - Consequence: a wasted session or spend; wasted spend.
  - Likelihood: 2
  - Impact: 3
  - Existing controls: 59-minute age rule in `handoff.ts` at 088a227c (partial); blocking idle guard and cold-return cost display missing.
  - Response: mitigate.
  - Actions: UserPromptSubmit hook that blocks or warns on a stale session and shows the cold cost; a warm-cache compact/handoff step before idle; notice candidate; do not resume a session idle over about 30-60 min; start fresh from a handoff file; `/export [filename]` writes plain text with no model call; ask for the handoff before walking away; do not change model or effort mid-session; front-load the first prompt; a hook that blocks a stale session until the user approves; spawn a fresh subagent instead of resuming one idle over 5 minutes when the resume would need over about 200k tokens (the 200k is a reported estimate from the agent's own cost log). Not probed: whether terminating a session expires the cache; the cache lives server-side, so a local fake API cannot show it and a probe needs a paid live run.
  - Trigger: a prompt after the cache TTL has passed; first prompt after an idle gap over the TTL.
  - Owner: cost
  - Status: open.
  - Source: external/export--clear vs -compact.jsonl:59. The 15-40% figure: not located; external/2026-11-10/reddit.com-r-claudeai-comments-1xsgul7-does-anyone-other-than-opus-and-20261110T093148Z.md:44 (900k session) (url: <https://www.reddit.com/r/ClaudeAI/comments/1xsgul7/does_anyone_other_than_opus_and_fable_actually/>); external/export--clear vs -compact.jsonl:2 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wl4c13/clear_vs_compact/>). The 15% and 0% to 40% figures were not located by grep.

## Cost And Statusline

- [ ] **RISK-386** Status-line task counter and panel never turn on.
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
  - Status: open
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:38 (observed, grep miss).

- [ ] **RISK-387** Status line draws no colour interactively, or draws it only after more elements appear.
  - Category: product defect.
  - Cause: `statusline/color.ts:82-85` `colorOff` reads `NO_COLOR`; nothing handles `FORCE_COLOR`. Checked on 2.1.327 (2026-11-18, cc-inspect `code search`): Claude Code sets `NO_COLOR` only in the PowerShell tool environment (`chunk-m14bt1pz.js@1114484`, used at `@1115526`), not for the statusLine command, and https://clawdipedia.cc/configure/status-line (retrieved 2026-11-18) says ANSI colors work there. A second report found no cause; the first-render cause needs an interactive TTY capture.
  - Event: a screenshot report; a second screenshot report says the statusline renders without colour at first, then colour appears once a few more elements come up.
  - Consequence: no colour; an extra turn to read a plain statusline (cosmetic).
  - Likelihood: 1
  - Impact: 1
  - Existing controls: none known.
  - Response: mitigate
  - Actions: check the cause first; handle `FORCE_COLOR`; reproduce with the statusline binary on the first render; render colour on every element from the first frame.
  - Trigger: an interactive session; any session start with a statusline.
  - Owner: cost
  - Status: open (`colorOff` reads only `NO_COLOR` at `plugins/claudetto/statusline/color.ts:82-85@088a227c`, checked with `git show`; the first-render cause needs an interactive TTY capture, which a local probe cannot make. Checked on 2.1.327: Claude Code sets `NO_COLOR` only in the PowerShell tool environment (`chunk-m14bt1pz.js@1114484`, used at `@1115526`), not for the statusLine command; the docs page https://clawdipedia.cc/configure/status-line (retrieved 2026-11-18) says ANSI colors work in the statusLine process).
  - Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:37 (observed); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19 (reported, user, 2026-11-13).

- [ ] **RISK-388** The statusline reports a 1M window when the system uses 300k.
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
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:1353 (reported, user, 2026-11-09).

- [ ] **RISK-389** A paid-run tool asks for an API key.
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
  - Status: open.
  - Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:6612 (reported, user, 2026-11-13).

## Statusline

- [ ] **RISK-390** Statusline colours are missing until more elements appear.
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
  Status: open at 088a227c; same report and same limit as RISK-387: the first-render cause needs an interactive TTY capture; on 2.1.327 `NO_COLOR` is not set for the statusLine command (`chunk-m14bt1pz.js@1114484`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/17435f50-2ca0-45f0-82a9-d3bafca667f4.jsonl:19; reported, user, 2026-11-13.

## Conduct

- [ ] **RISK-391** The agent spends paid runs without asking.
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

## Ungrouped

- [ ] **RISK-392** A rule drives dev cost to 2.3 times stock.
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
  Status: mitigated
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1092 (2.3 times, round 5 dev against stock); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:1871 (changelog hono figures); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (round 6); measured, 2026-11-16

## Agent Conduct Defects Reported by the User

- [ ] **RISK-393** The agent runs paid evals without asking, after each criteria change.
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
