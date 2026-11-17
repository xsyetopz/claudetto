# Handover Requirements

## Post-Compaction Check

- [ ] **REQ-HANDOVER-001** claudetto shall have the agent say back the goal and the last finished item after a handover or compaction.
  Acceptance: A slightly wrong answer is read as a dropped detail and the handover is corrected. The check takes about ten seconds. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c (git grep for say back found none; the plan holds a restate-the-goal phrase only as a user power phrase).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:307 (url: https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/).

## Review State

- [ ] **REQ-HANDOVER-002** claudetto shall keep durable review state keyed to a commit SHA: files reviewed, findings with file:line, and the next item, updated at each batch boundary.
  Acceptance: An entry is invalidated when its code changes mid-review; a fresh session skips files marked reviewed at the same SHA and does not skip a hard file silently. Verification: test.
  Basis: reported. Status: missing at 088a227c (the plan uses a commit SHA only for worktree reports).
  Source: external/2026-11-13/reddit.com-r-claudecode-comments-1xubp1v-is-compacting-still-bad-practi-20261113T000651Z.md:295 (url: https://www.reddit.com/r/ClaudeCode/comments/1xubp1v/is_compacting_still_bad_practice/).

## Handoff File

- [ ] **REQ-HANDOVER-003** claudetto shall write one handoff file per task with a slug name (`task-01.md`), at most 25 lines, holding the latest accomplished task and the next task from `plan.md`.
  Acceptance: The next fresh session reads only that file, not older handoffs. A counter-claim says a fixed line cap can drop state, decisions, files, and next steps (reported, no measure), so the cap is checked by the post-compaction say-back. Verification: test.
  Basis: reported. Status: partial at 088a227c (`features/compaction/handoff.ts` writes a handoff; git grep found no 25-line cap or slug naming).
  Source: external/2026-11-16/reddit.com-r-claudecode-comments-1xuiwi6-minimize-token-usage-20261116T052542Z.md:40,110,120 (url: https://www.reddit.com/r/ClaudeCode/comments/1xuiwi6/minimize_token_usage/); external/2026-11-13/reddit.com-r-claudeai-comments-1xuiun7-minimize-token-usage-20261112T231514Z.md:50 (url: https://www.reddit.com/r/ClaudeAI/comments/1xuiun7/minimize_token_usage/).

- [ ] **REQ-HANDOVER-004** claudetto shall keep each handoff small and structured, split into permanent facts (always-loaded file plus memory index), one state file with fixed sections (done or current state, in progress, decisions, gotchas, next), and a lean handoff that names which docs to read and what is open.
  Acceptance: A handoff holds the fixed sections and stays short; long ones get skimmed and drift out of date. A checkpoint is capped at 300 lines with append-only logs; the handoff is pruned when the task is done; it is written while the cache is warm, kept current as a living file, and refreshed before any long pause; decisions are written at close because recovery after a lost session rebuilds the what from git diff, not the why. Reading a whole handoff up front can cost 20k+ tokens; one reached about 150k tokens; reported start about 43k tokens. The sections are Goal, Standing instructions, Decisions log, Current state, In progress, Next steps, Key files and symbols, Gotchas and dead ends, Open questions, and the line "None given." for an empty one. Verification: test.
  Basis: reported, one user for the short four-section form. Status: missing at 088a227c (no size cap, no hot/history split).
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xigw3d-im-not-a-developer-and-i-run-sev-20261029T115821Z.md:50 (url: https://www.reddit.com/r/ClaudeAI/comments/1xigw3d/im_not_a_developer_and_i_run_several_claude_code/); external/2026-11-16/reddit.com-r-claudecode-comments-1xvr4ob-i-grouped-18629-claude-code-re-20261116T051613Z.md:65 (url: https://www.reddit.com/r/ClaudeCode/comments/1xvr4ob/i_grouped_18629_claude_code_requests_by_session/); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl (the 150k case; not located under a dated external/ folder); external/export-If your usage runs out quickly.jsonl:7 (url: https://www.reddit.com/r/ClaudeCode/comments/1wgf3sv/if_your_usage_runs_out_quickly/); observed in transcript, 2026-11-09 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/60a81b6a-7024-4fb4-9f19-6d79c0fd6d65.jsonl:11); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/638670c4-640d-44ab-83a2-436d1d918089.jsonl:11).

## Decision File Reinjection

- [ ] **REQ-HANDOVER-005** claudetto shall keep how-to-work rules in CLAUDE.md or a skill and each decision in its own small plain file (status in frontmatter, a ruled-out section for what was decided against and why, each entry dated, the old file flipped to superseded in the same change that adds its replacement), and shall print those files back with a SessionStart hook on the compact matcher (source "compact") after every compaction.
  Acceptance: After a compaction the decision file text is in context and a superseded decision stops showing up. A hook on SessionStart with source "compact" prints its stdout straight into the new context. A handoff doc read mid-session is treated as notes; standing rules in CLAUDE.md or a skill are treated as instructions. A wrong line in a decisions file is worse than a forgotten one, since the agent follows it without question; the notes file holds state (done, open, next step) and is rewritten each session, never appended to. The poster adopted the cat-back. Verification: test.
  Basis: reported, commenters. Status: missing at 088a227c (plugins/claudetto/scripts/session-start.ts:1-17@088a227c holds lock-file logic, no decision file).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:180 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/); external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xbq7zc-how-do-you-maintain-project-cont-20261102T084111Z.md:78,80,82,86,89,97 (url: https://www.reddit.com/r/ClaudeAI/comments/1xbq7zc/how_do_you_maintain_project_context_across_claude/).

## Reinjection Size Cap

- [ ] **REQ-HANDOVER-006** claudetto shall keep re-injected decisions under the size cap: newest at the end so the cap eats the oldest, one line per decision (date, what, why), a quote replaced by a pointer, replaced decisions marked closed and dropped from the cat but kept in an archive that can be grep-ed on demand.
  Acceptance: A re-injected file under the cap keeps every open decision. A poster's 9k-char cap cut the tail of 24 decisions on the first real compaction; closing the wrong card happens. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbfly6-60-compactions-into-one-claude-20261022T003216Z.md:193 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbfly6/60_compactions_into_one_claude_code_session_the/).

## Return Overview

- [ ] **REQ-HANDOVER-007** claudetto shall keep a board with one card per task, each in its own worktree ending as a draft PR so waiting work is the list of open PRs; each card keeps a short handoff note; each work block ends with a file of done, half-done, next, awaiting-decision, read first on return (30 s); one-line next action per project.
  Acceptance: The file exists at the end of each work block and the next session reads it. Verification: demonstration.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbkgjm-what-matters-most-to-you-when-20261022T005215Z.md:62 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbkgjm/what_matters_most_to_you_when_working_with_claude/).

## Lesson Upkeep

- [ ] **REQ-HANDOVER-008** claudetto shall append one dated line to `memory/lessons.md` on each user correction, read at session start, each line ending with what the mistake cost; a nightly job shall propose add, update, or delete of single lines that a script applies, so the model never rewrites the whole file; the same correction twice rewrites the line more specific; weekly, lessons in 2+ agents move to a shared imported file.
  Acceptance: The model never writes the lessons file whole and does not author its own harness rules; the file is capped at 10 KB per agent with merge or archive; a repo `MISTAKES.md` line (expected, actual, wrong mental model, one-line prevention) is appended in the same commit as the fix. Poster results: 19 shared rules, zero removed in 3 weeks (one report); 15 agents, 247 lines after a month, 19 rules promoted to a shared file in 3 weeks, 0 removed, about 3.5k tokens cached per agent (measured, one poster). Verification: test.
  Basis: measured (one poster). Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`; corrections-log feature missing).
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbnwcw-a-month-of-my-claude-code-agen-20261022T044334Z.md:44,48 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbnwcw/a_month_of_my_claude_code_agents_writing_down/); external/2026-10-28/reddit.com-r-claudeai-comments-1xh0zpx-token-maxxing-a-guide-to-running-20261028T060441Z.md:79 (url: https://www.reddit.com/r/ClaudeAI/comments/1xh0zpx/token_maxxing_a_guide_to_running_unlimited_agents/); external/2026-10-22/reddit.com-r-claudecode-comments-1xbyxeo-how-do-i-structure-my-monorepo-20261022T010218Z.md:84 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbyxeo/how_do_i_structure_my_monorepo_and_workflow_to/); external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:103.

## Memory Store Schema

- [ ] **REQ-HANDOVER-009** claudetto shall store memory as one fact per file with typed frontmatter (user, feedback, project, reference); a stale_after date on aging facts (versions, IPs, prices, owners) that a SessionStart hook flags to re-check before use; status deprecated instead of deletion; "verified: by human" outranking model-inferred; a hook that validates each memory write, fixes links, and regenerates the index; TRAP entries (command exits 0 but does nothing); a version-controlled store.
  Acceptance: A fact past stale_after is listed at session start with an instruction to re-check it. Entries marked TRAP are reported as the most valuable. Git grep for stale_after in plugins at 088a227c finds none. Verification: test.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-22/reddit.com-r-claudecode-comments-1xbxoza-my-claude-code-setup-it-runs-l-20261022T005342Z.md:409 (url: https://www.reddit.com/r/ClaudeCode/comments/1xbxoza/my_claude_code_setup_it_runs_like_a_small/).

## Handoff Side Behaviors

- [ ] **REQ-HANDOVER-010** claudetto shall copy a misnamed Claude-written handoff to a valid name with one line naming both files, shall name a 7-day stale handoff once and not inject it, shall drop the engine's `context_management` section from the first message, and shall use the whole transcript, not the last 12 turns.
  Acceptance: `hooks/handoff.test.ts`: a misnamed handoff is copied to a valid name and one line names both files; the handoff block is the only one added and `context_management` is left out; a typed /clear takes no handoff in; a resume reads the newest fresh handoff back once. The last-12-turns rule changed to the whole transcript (task 5.19). Verification: test.
  Basis: cited. Status: missing at 088a227c (git grep misnamed and context_management: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:370.

## Handover Threshold

- [ ] **REQ-HANDOVER-011** claudetto shall default the handover threshold to the lesser of 400,000 tokens and half the window, and shall let `handoverThresholdTokens` set it when it is a positive number.
  Acceptance: `hooks/handoff/handover.test.ts`: the handover threshold defaults to the lesser of 400,000 and half the window. `HANDOFF_TRIGGER_TOKENS` 140,000 was the autocompact trigger, not a handover threshold: three separate values, order set by measurement. Verification: test.
  Basis: cited. Status: partial at 088a227c (plugins/claudetto/hooks/features/memory/hold.ts:237 holds `heavyContextTokens` 400_000; git grep handoverThresholdTokens: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/parity.md:341.

## Handover Result

- [ ] **REQ-HANDOVER-012** claudetto shall keep the session's first message ahead of the handoff in a handover's compaction result.
  Acceptance: The result holds the first message, an assistant line, and the handoff, in that order, so the cached prefix up to that message can be read (`hooks/handoff/handover.test.ts`: "the compaction keeps the first message, an assistant line, and the handoff"). Verification: test.
  Basis: cited. Status: missing at 088a227c (git grep first message in plugins: no hit).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:58; openspec/changes/archive/2026-11-09-release-2-1-319/specs/compaction-path/spec.md:62.

## Lesson Extraction

- [ ] **REQ-HANDOVER-013** claudetto shall drop a lesson drawn from a session unless it carries a word-for-word session quote that a second model confirms supports it.
  Acceptance: a lesson with no quote, or with a quote the second model rejects, is not written. Verification: test.
  Basis: reported; the author has 111 lessons waiting on human approval, a manual bottleneck. Status: missing at 088a227c (no lesson feature under memory or compaction).
  Source: external/2026-10-25/reddit.com-r-claudeai-comments-1xcjrzg-my-one-rule-for-claude-no-number-20261024T061809Z.md:61 (url: https://www.reddit.com/r/ClaudeAI/comments/1xcjrzg/my_one_rule_for_claude_no_number_goes_in_unless/).

## Context File Drift

- [ ] **REQ-HANDOVER-014** claudetto shall keep derivable facts and decisions apart in the context file and gate edits to it.
  Acceptance: the context file splits into derivable facts (paths, commands, structure; CI checks that referenced paths and commands exist) and decisions (dated, status durable or superseded, with a promotion step); edits pass through a script or skill with size validation; a hook blocks direct edits and points at the skill; entries are per-entry files tied to commits. Consequence if absent: decisions rot silently, and nothing in the repo changes when one dies. An instruction to update CLAUDE.md if anything changed did not help. Memory hygiene: verbose memory with history, and a different model's rewrite removed 157 lines across 4 AGENTS.md files. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`).
  Source: external/export-Tired of people complaining about usage. Here's a guide to conserve usage.jsonl:21 (url: https://www.reddit.com/r/ClaudeCode/comments/1wa9aya/tired_of_people_complaining_about_usage_heres_a/). The 157-line figure: source unresolved, the grep match for "157 lines" did not hold it.

## Knowledge Pages Written by Agents

- [ ] **REQ-HANDOVER-015** claudetto shall keep one page per topic (about 50) that every agent reads before a job and proposes edits to after it, each edit approved like a PR; one thing per file with an index; explicit external state in files and not only in the conversation.
  Acceptance: the memory feature lists pages by topic with an index file; an agent report carries a proposed edit. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/`).
  Source: external/2026-10-07_p2/export-I let ~35 Claude Code agents build my product for 8 weeks, each on its own cloud machine. ~1,200 mer.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x01vg3/i_let_35_claude_code_agents_build_my_product_for/); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:41.

## Package Manager Detection at SessionStart

- [ ] **REQ-HANDOVER-016** claudetto shall detect the package manager at SessionStart: the `packageManager` field wins (`pnpm@9.0.0` beats `bun.lock`), then a lock file (`yarn.lock` gives yarn), then any manager; it shall have no Bun prompt line, `BUN_FACT`, `bunRuleEnabled`, or npm deny table. It derives state and does not describe it: a SessionStart or UserPromptSubmit hook prints `git branch --show-current`, `git describe --tags --abbrev=0`, `openspec list`, the package version, lockfile framework versions, manifests, and `uname`; a PreToolUse hook on CHANGELOG.md enforces "the version comes from the branch, not `[Unreleased]`".
  Acceptance: a repo with `packageManager: pnpm@9.0.0` and `bun.lock` reports pnpm; the session context holds the branch, the latest tag, manifests, and lockfile names. Subagent briefs built from AGENTS.md inherit wrong rules ("CHANGELOG under `[Unreleased]`") and plan tasks can carry the wrong instruction; plan and bug-log files that grew to about 290 KB and 280 KB sent every agent 200k tokens before work, so targeted greps and an index replace a full read. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/scripts/session-start.ts:36` reads `packageManager`; git grep for describe, branch, uname in plugins found none, so the branch, describe, and changelog guard are missing).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xm5lz3-what-toolsplugins-do-you-use-wit-20261109T152902Z.md:72 (url: https://www.reddit.com/r/ClaudeAI/comments/1xm5lz3/what_toolsplugins_do_you_use_with_claude_code_to/); openspec/changes/archive/2026-11-16-2-1-323/design.md:158; plugins/claudetto/scripts/session-start.ts:36@088a227c; external/please-use-me-often/agent-terms/TERMS-OF-SERVICE.md:49.

## State Across Clear

- [ ] **REQ-HANDOVER-017** claudetto shall carry state across `/clear` through SessionStart and PreCompact (a user pause was forgotten after `/clear` and the agent began implementing; "71% context left" is no trigger; a session fanned out to a hard stop).
  Acceptance: After `/clear` a recorded pause still holds in the next session. Verification: test.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/hooks.json `PreCompact`; plugins/claudetto/hooks/features/compaction).
  Source: plugins/claudetto/hooks/hooks.json (`PreCompact`)@088a227c; plugins/claudetto/hooks/features/compaction@088a227c; claude 2.1.326: `SessionStart` and `PreCompact` are in the hook event list (code search for "PreCompact", chunk-m33vdkhs.js@5226, 2.1.326). The old tag for the source of the pause report was not located.

## Cycle Trigger

- [ ] **REQ-HANDOVER-018** claudetto shall check at main-loop `turn.complete` (`e.agentId === undefined`) whether context size is over a threshold, and also at `prompt.submit` whether the time since the last request start is the TTL or more, because a cold prefix makes a cycle cost least. It shall never trigger on session age.
  Acceptance: a main-loop turn that ends over the threshold starts a cycle; a prompt that arrives TTL or more after the last request start starts one; a warm session under the threshold and older than 59 minutes starts none. The threshold is read from `$.session.usage()` and `session.measure`, the idle and sleep timers from `$.clock.after` and `$.clock.every`, the cold prefix from `$.clock.now` at `prompt.submit`; a headless run relies on the threshold and cold checks, because timers do not outlive the process; probe G shows `after(150)` firing at 254 ms and `every(100)` reaching 3 ticks at 433 ms. Verification: test.
  Basis: inferred from the cache fact (cited) and the probes (measured). Status: partial (age trigger only, handoff.ts:67-80) at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712); plugins/claudetto/hooks/features/compaction/handoff.ts:67-80@088a227c; platform docs prompt-caching page, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352); probe G, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

- [ ] **REQ-HANDOVER-019** claudetto shall keep the handoff and retry at the next `turn.complete` when the clear rejects because a prompt is queued.
  Acceptance: a clear that rejects with "the command was removed from the queue before it ran" leaves the handoff stored and a later turn.complete retries the clear. Verification: test.
  Basis: measured. Status: missing at 088a227c.
  Source: session-cycle probe, claude 2.1.325, 2026-11-16, cc-inspect cli with a --plugin-dir module, one stream-json prompt (recorded in plans/rebuild-curation.md at commit dc499712).

## Manual Clear Handover

- [ ] **REQ-HANDOVER-020** claudetto shall write a handover on a typed `/clear` through a `command.run` hook on `{command:'clear'}`, keep it, then return `next(e)` so the clear runs unchanged, and inject it through a `prompt.context` block into the first request after the clear, with no extra request.
  Acceptance: after `/clear`, request 2 opens with the handover block, holds no earlier text, and the clear ran unchanged; the fork is the only extra request. The fork runs with effort low; the handover goes out on a `prompt.context` pass once per compaction and not again, since the pass fires again after a compaction and a re-sent filler cost $0.24 in one probe. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); probe A, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); live probe F, Haiku 5.5, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

- [ ] **REQ-HANDOVER-021** claudetto shall show a toast through `$.ui.notify` while the fork runs, because the clear waits on it: 2.4 s on Haiku 5.5 over a 67k-token cached prefix. Hook time stops during `$` calls, so the 10 s hook budget does not cut the fork.
  Acceptance: a toast shows from the start of the fork until it returns; a fork of 2.4 s completes inside the hook. The pending handover is kept in `$.store`, because module state is lost on reload. Verification: probe.
  Basis: measured. Status: missing at 088a227c.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); observed in transcript, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297).

## Handover Writer

- [ ] **REQ-HANDOVER-022** claudetto shall fall back to a `$.session.messages()` extract, at zero model cost, when the fork returns `reason:'nothing-to-fork'`, throws, or returns empty text.
  Acceptance: a handover is written from `$.session.messages()` rows `{role,text,toolUses}` in each of the three cases and no fork cost is billed for the fallback. A clear whose origin is plugin is skipped; an API error from the fork also takes the fallback. Verification: test.
  Basis: measured (probe B for the extract); the three trigger cases are the old plan's design. Status: partial (handoff.ts:44-56 returns undefined on a failed fork and takes the built-in summary instead) at 088a227c.
  Source: handover probe B, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-56@088a227c; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); probe B, `claude` 2.1.325, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738).

## Core Auto Compaction

- [ ] **REQ-HANDOVER-023** claudetto shall write the handoff by fork and answer a `session.compact` hook with trigger `auto` or `precompute` (or a compaction claudetto starts) and no `agentId` as `{messages:[handover]}`, never as `{skip}`, because a skip on a prompt-too-long leaves the context full and the turn fails. The hook writes the handoff with `$.model.fork` from the live transcript (cached prefix) and answers with it as the one message in the same step, followed by `git rev-parse --short HEAD` and `git status --short` read at that moment; it appends no user message, skips no compaction and writes no file. The `precompute` pass writes the fork ahead of the threshold, so its latency is hidden. A fork failure (throws or no text), a subagent compaction (`agentId` set), trigger `manual` (a user `/compact`), and handover off go to the built-in through `next(e)`. A manual `/clear` writes a handover first. The tail lists the last three tool-using assistant steps (a replayed fork lacked the last two). 2.1.326 release notes: automatic compaction in plan mode uses the model answering the user, so it can cost more.
  Acceptance: an auto compaction with handover on gets the handover as its one message; a hook that answers with its own `messages` makes no summarizer request and keeps the cached prefix; a subagent compaction, a manual one, and one with handover off take the built-in path. The old file handoff interrupted work, went stale and ended the turn after writing the file (8 injections in one session). The handover fork lists each tool call that ran after the request it replays, each result cut to 500 characters; the built-in compaction takes over when the fork fails or is empty (observed in transcript, 2026-11-16). Verification: test.
  Basis: measured (code read of the compaction module, chunk-wqb2b4v0.js in 2.1.325, chunk-4h798pp0.js in 2.1.326); probe D could not reach it on the fake API. Status: partial at 088a227c (hooks/features/compaction/handoff.ts:48 calls `$.model.fork`; handoff.ts:87-100 answers auto and plugin triggers; precompute is excluded from the clock only, not answered; read of handoff.ts at 088a227c: the `{ messages: [handoff] }` answer sits behind the auto or plugin check).
  Source: chunk-4h798pp0.js@2581634 (claude 2.1.326, checked location); chunk-4h798pp0.js@2583254, @2582776, @2954679 (claude 2.1.326; moved from @2499078, @2498600, @2871600 of 2.1.325 by a relocate and a read that shows the hook's `replaced` messages, the `precompute` path, and the `skipped` branch); handover probe D, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-56,87-100@088a227c; openspec/specs/compaction-path/spec.md:10; openspec/changes/2-1-325-rearchitecture/design.md:63; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:618; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes); `chunk-wqb2b4v0.js:2497458`, `:2499078`, `:2498600`, `:2871600` (claude 2.1.325 binary) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Compaction tail fix; commit 563c5fcc).

## Handover Knobs

- [ ] **REQ-HANDOVER-024** claudetto shall read knob settings keys through `$.settings.read()` and env through `$.env.get`. `CLAUDETTO_DISABLE_HANDOVER` shall turn off every handover path; `CLAUDETTO_DISABLE_AUTO_HANDOVER` shall keep the manual `/clear` handover.
  Acceptance: with `CLAUDETTO_DISABLE_HANDOVER` set, no path writes a handover; with `CLAUDETTO_DISABLE_AUTO_HANDOVER` set, only `/clear` does. Each Claude Code compaction knob has a handover mirror, "handover" for "compact" and `CLAUDETTO_*` for `CLAUDE_CODE_*`: settings `autoHandoverEnabled`, `autoHandoverWindow`, `idleHandover`, `precomputeHandoverEnabled`; env `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE`, `CLAUDETTO_AUTO_HANDOVER_WINDOW`, `CLAUDETTO_IDLE_HANDOVER_MIN_TOKENS`, `CLAUDETTO_SLEEP_HANDOVER`, `CLAUDETTO_SLEEP_HANDOVER_AFTER_MS`, `CLAUDETTO_DISABLE_AUTO_HANDOVER`, `CLAUDETTO_DISABLE_HANDOVER`; `$.settings.read()` returns the custom keys and `$.env.get` (async, literal names) reads each env name (probe C and G, claude 2.1.325, fake API, 2026-11-16). Verification: test.
  Basis: measured (probe C). Status: missing (no CLAUDETTO_ knob in plugins/claudetto/hooks at 088a227c).
  Source: handover probe C, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); `settings.read` and `env.get` are in the 2.1.326 capability list (chunk-qg227pzf.js@3609); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); probe C and G, `claude` 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).

## Goal Restore After Clear

- [ ] **REQ-HANDOVER-025** claudetto shall set the user's `/goal` again after the clear of a handoff, before the submit, with a `command.run` hook on `goal` recording the condition. 2.1.326 release notes: a `/goal clear` or a new `/goal` typed while Stop hooks ran and background work was in progress now sticks.
  Acceptance: `handoff.test.ts` passes "a handoff sets the user's goal again after the clear", "a handoff after /goal clear sets no goal" and "the last goal the user set is the one set again"; `handoff/call.test.ts` passes "an active goal is set again after the clear and before the submit", "no goal is set after a clear when none was active" and "a goal the engine refuses is named, and the handoff is still sent"; a real session after `/goal all tests pass` and a handoff tool call showed `Goal: all tests pass` (`evidence/tmp/probe-114/mk.ts`, run `evidence/tui/20261106-131528-67882f`; `/goal` from origin `plugin` was accepted and started no model turn before the read-back). Verification: test.
  Basis: measured. Status: missing at 088a227c (no `clearAndSubmit` or `/goal` hit in `git grep` of `plugins/`).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:240-241; plugins/claudetto/hooks/features/compaction/handoff.test.ts:77@088a227c; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Checked Handover

- [ ] **REQ-HANDOVER-026** claudetto shall write each handover from checked state: HEAD, git status, and branch read at write time, with facts and open items only, no order for the next session, and no verbatim user quote.
  Acceptance: a handover's stated HEAD and tree state equal `git rev-parse HEAD` and `git status` at write time; the file holds no standing order and no user quote. The handoff is presented to the next session as context, with its Next list not an order (user decision, 2026-11-16, recorded in the handover). Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4121; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4276; observed in transcript, 2026-11-16; user decision, 2026-11-16; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4204).
  Conflict: claudetto shall write the handoff as a schema, not a free summary.

## Handover Content

- [ ] **REQ-HANDOVER-027** claudetto shall leave the reasons for a decision in a handover to the user: the model records what was decided and its concrete reasons, and the user dictates or rewrites why they made the call.
  Acceptance: the handover prompt marks the why of a user decision as the user's to write. Verification: inspection.
  Basis: reported, two users (Claude smooths over the nuance of why). Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/texts.ts holds Decisions and Ruled out sections but does not hand the why to the user).
  Source: external/2026-10-25/reddit.com-r-claudecode-comments-1xco6yg-a-modern-ai-problem-with-a-cen-20261024T062321Z.md:107 (url: https://www.reddit.com/r/ClaudeCode/comments/1xco6yg/a_modern_ai_problem_with_a_centuryold_answer/).

- [ ] **REQ-HANDOVER-028** claudetto shall end each phase with a model-switch instruction and one paste line "<Project> - Phase <n> of <total>: <name> - START HERE <full handover path>", and name the new thread "<Project> - Phase <n>".
  Acceptance: the phase-end text holds the paste line with the full handover path. Verification: inspection.
  Basis: reported (prompt template). Status: missing at 088a227c (git grep for "START HERE" finds nothing).
  Source: external/2026-10-27/reddit.com-r-claudeai-comments-1xg2z2v-any-tips-to-avoid-using-so-much-20261027T071936Z.md:81 (url: https://www.reddit.com/r/ClaudeAI/comments/1xg2z2v/any_tips_to_avoid_using_so_much_usage/).

## Rules After Compaction

- [ ] **REQ-HANDOVER-029** claudetto shall re-inject a rule at each Edit or Write, with the same short reminder as a PreToolUse hook, and keep the on/off flag in a file and not in the conversation.
  Acceptance: after a compaction the next Edit shows the reminder; a flag set before compaction still holds after it. Verification: probe (check that PreToolUse hook output reaches context).
  Basis: reported, inferred (a SessionStart(compact) hook gives one shot and the rule drifts again by turn 80); cost is context per edit. Status: missing at 088a227c (git grep for PreToolUse finds nothing).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:198 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/).

- [ ] **REQ-HANDOVER-030** claudetto shall print a 4-5 line rules file after compaction, not a canned reminder, and keep the opt-in skill flag in a session-id marker file.
  Acceptance: the post-compaction text is at most 5 lines; the marker file holds the session id. Verification: inspection.
  Basis: reported (longer text is summarised away again). Status: partial at 088a227c (PIN_COMPACT_KEEP in plugins/claudetto/hooks/features/compaction/texts.ts re-pins text; no size bound or marker file).
  Source: external/2026-10-28/reddit.com-r-claudeai-comments-1xfqg0c-how-do-you-keep-a-skill-active-a-20261028T060802Z.md:41 (url: https://www.reddit.com/r/ClaudeAI/comments/1xfqg0c/how_do_you_keep_a_skill_active_after_context/).

## Dated Rules And Mistakes File

- [ ] **REQ-HANDOVER-031** claudetto shall run a weekly roundup in which Claude reviews the past week for recurring faults, assesses current hooks and gates, and turns misses into coded hooks and checks, logging each miss in a per-project MISTAKES file; each rule carries a date, the old rule is deleted when it changes, and a second rule on one subject is refused.
  Acceptance: A rule file holds a date per rule and one rule per subject; each miss appears in the MISTAKES file. Verification: test.
  Basis: reported. Status: missing at 088a227c (git grep MISTAKES finds only plugins/claudetto/output-styles/Concise.md:11 "Own mistakes").
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrpkdt-what-even-is-the-point-of-workin-20261110T094812Z.md:37,137 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrpkdt/what_even_is_the_point_of_working_rules_lol/).

## Live Machine Facts

- [ ] **REQ-HANDOVER-032** claudetto shall inject hostname and kernel from a SessionStart hook, read live, so a session does not confuse which machine it is on.
  Acceptance: The session context holds the live hostname and kernel. Verification: test.
  Basis: reported (a memory note had failed to do this). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xrx9yj-what-rules-keep-your-agent-hon-20261110T100144Z.md:72 (url: https://www.reddit.com/r/ClaudeCode/comments/1xrx9yj/what_rules_keep_your_agent_honest/).

## Decisions Reachable By Every Agent

- [ ] **REQ-HANDOVER-033** claudetto shall keep the decisions file reachable by every agent (CLAUDE.md, AGENTS.md, and others point to one file or symlink).
  Acceptance: Each agent instruction file resolves to the one decisions file. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:86 (url: https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/).

## Decision At The Code

- [ ] **REQ-HANDOVER-034** claudetto shall put a decision as a one-line comment at the code it affects ("see DECISIONS.md#3") and shall turn a decision into a failing check (import-lint, architecture test, CI grep) so it cannot be quietly undone.
  Acceptance: A decision has a comment at its code and a check that fails when it is undone. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:87,46 (url: https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/).

## Quote Before Change

- [ ] **REQ-HANDOVER-035** claudetto shall require a session that changes a settled decision to quote the existing decision line and say what differs now.
  Acceptance: A decision change without the quoted line is rejected. Verification: test.
  Basis: reported (half the time the old constraint is gone, half it is re-litigation). Status: missing at 088a227c.
  Source: external/2026-11-10/reddit.com-r-claudecode-comments-1xryuvz-how-often-do-you-face-decision-20261110T095952Z.md:115 (url: https://www.reddit.com/r/ClaudeCode/comments/1xryuvz/how_often_do_you_face_decisions_getting_lost_in/).

## Cold Start From A Doc

- [ ] **REQ-HANDOVER-036** claudetto shall let a stronger model start on a fresh chat from a doc: the weaker model summarizes what was done and tried into a file, and the stronger model is pointed at that file.
  Acceptance: A handover file written by Opus is the only input a new Fable chat needs. Verification: demonstration.
  Basis: reported, one author. Status: missing at 088a227c.
  Source: external/2026-11-13/reddit.com-r-claudeai-comments-1xtdfma-is-fable-52-actually-worse-than-20261111T233520Z.md:252,244 (url: https://www.reddit.com/r/ClaudeAI/comments/1xtdfma/is_fable_52_actually_worse_than_opus_55_in_most/).

## Memory Write Gate

- [ ] **REQ-HANDOVER-037** claudetto shall ask the user before Claude writes a memory, or hold memory to what the repo cannot tell a future session (working preferences, corrections, outside pointers), never what is derivable from code or git; a saved note carries a date and what it was verified against.
  Acceptance: A write of a derivable memory is refused or asked about; a saved note shows date and verification. Verification: test.
  Basis: reported, n=3 (a ten-minute single-file debug made ten memories written as foundational). Status: missing at 088a227c (plugins/claudetto/hooks/features/memory guards machine RAM, not Claude memory).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlbuq6-forget-the-usual-claude-tips-w-20261102T184441Z.md:147,149,289 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlbuq6/forget_the_usual_claude_tips_what_are_the_strange/).

## State Note

- [ ] **REQ-HANDOVER-038** claudetto shall write a state note (done, waiting on the user, next) at session end and read it at start, with a dated decision log with reasons; start with one folder and add another only when two jobs mix.
  Acceptance: A new session starts from the note; the note holds the three lists. Verification: demonstration.
  Basis: reported, one user (preferred to chat plus compaction). Status: partial at 088a227c (handover and pre-compact scripts exist in plugins/claudetto/hooks/scripts; no done/waiting/next note found by git grep for STATE.md).
  Source: external/2026-11-10/reddit.com-r-claudeai-comments-1xrddd1-experienced-people-give-me-a-cou-20261110T093752Z.md:125-127 (url: https://www.reddit.com/r/ClaudeAI/comments/1xrddd1/experienced_people_give_me_a_couple_tips_please/).

## Command Syntax Memory

- [ ] **REQ-HANDOVER-039** claudetto shall have the agent write the fix to the memory file after each command-syntax error, so the error is not repeated and a round trip is saved.
  Acceptance: A command-syntax error is followed by a memory write that names the fix. Verification: demonstration.
  Basis: reported, one user. Status: missing at 088a227c.
  Source: external/2026-10-30/reddit.com-r-claudeai-comments-1xj6245-tips-to-save-usage-and-how-its-a-20261030T103246Z.md:61 (url: https://www.reddit.com/r/ClaudeAI/comments/1xj6245/tips_to_save_usage_and_how_its_actually_calculated/).

## Smart Compact Order

- [ ] **REQ-HANDOVER-040** claudetto shall write session state to files first and then print an in-chat summary that anchors what follows, with auto-compact off; state in files survives a compaction completely.
  Acceptance: The handover writes the state files before it prints the summary. Commenters report a /smart-compact command that updates the plan files, organizes where the session stands and drops it into the chat as a guide; with auto-compact off the context persists in the memory file even if compaction loses nuance. Verification: demonstration.
  Basis: reported, commenters. Status: missing at 088a227c (plugins/claudetto/scripts/pre-compact.ts:1-3@088a227c only prints a keep text and writes no state file).
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:85,91,121 (url: https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/).

## Never Compact

- [ ] **REQ-HANDOVER-041** claudetto shall tell agents to make a handoff after 150k tokens in place of compaction.
  Acceptance: A session past 150k tokens writes a handoff. One commenter's rule is never to use compact. Verification: demonstration.
  Basis: reported, one commenter. Status: partial at 088a227c (plugins/claudetto/scripts/pre-compact.ts:1-3@088a227c only prints a keep text; no handoff at 150k).
  Source: external/2026-11-03/reddit.com-r-claudecode-comments-1xlublc-how-do-you-survive-the-week-20261102T184526Z.md:89 (url: https://www.reddit.com/r/ClaudeCode/comments/1xlublc/how_do_you_survive_the_week/).

## Short Sessions

- [ ] **REQ-HANDOVER-042** claudetto shall support a short-session workflow: /clear between parts; persistent rules in the rules file and linked .md files with row limits, including a status file of current work, tidied of stale facts; a plan with steps in PLAN.md, then /clear and "do step 1", update the plan, /clear, "step 2"; and at a new project a handover.md that tells how to set up the same infrastructure.
  Acceptance: A plan survives a /clear in a file, and the status file holds current work within its row limit. Verification: demonstration.
  Basis: reported, one commenter. Status: missing at 088a227c.
  Source: external/2026-11-02_p2/reddit.com-r-claudeai-comments-1xkv0oo-the-3-kinds-of-claude-forgot-onl-20261102T083407Z.md:47,49,51 (url: https://www.reddit.com/r/ClaudeAI/comments/1xkv0oo/the_3_kinds_of_claude_forgot_only_the_first_is_a/).

## Decisions and Rationale Files

- [ ] **REQ-HANDOVER-043** claudetto shall keep one line per decision plus what was rejected, add new terms to a glossary in the same edit (a glossary term with its first use), not relitigate locked decisions without new evidence, and keep the reason or incident beside each rule; the compaction handoff keeps Decisions and Ruled out in a decisions log with dated one-line decisions, a superseded rule marked replaced on the spot, and a reverse condition and check command per rule so it can be pruned (one file grew from 434 to 1,554 lines in one day).
  Acceptance: the handoff text carries an active or replaced mark per decision; the propose skill carries a glossary line. Reported: without a rationale file 7 of 10 fresh sessions re-proposed an already-rejected simplification, with it 0 of 10 (Reddit post); another run 10 of 10 declined vs 3 of 10, median 18 s vs 43 s; a custom lean system prompt used `@lru_cache` 93% vs 53% default. Verification: test.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/texts.ts:9 holds "Ruled out"; git grep for glossary, replaced, superseded in hooks/features/compaction at 088a227c found none; the openspec design.md holds each reason).
  Source: external/2026-10-02/export-I ran 20 fresh Claude Code sessions on the same codebase- Without context, 7-10 recreated the same r.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1wv1ahs/i_ran_20_fresh_claude_code_sessions_on_the_same/); external/2026-10-02/export-I tested whether a custom system prompt for Claude Code makes a difference. 456 API calls later - he.jsonl:2 (url: https://www.reddit.com/r/ClaudeAI/comments/1shogc4/i_tested_whether_a_custom_system_prompt_for/); plugins/claudetto/hooks/features/compaction/texts.ts:9@088a227c; external/please-use-me-often/agent-failure-dossier/judged/prompt.jsonl:125.

## Unreadable Check Is Not a Pass

- [ ] **REQ-HANDOVER-044** claudetto shall reconcile the notes file against git, open PRs and running jobs at session start, and count silence as failure.
  Acceptance: A check that cannot be read is reported as not passed. A report mentions a `/session-start` command, a `/handoff` command, a lessons file, and old notes archived. Verification: test.
  Basis: reported. Status: partial at 088a227c (memory and compaction features).
  Source: unresolved: the old key names a worker input; the `/session-start` report was not found by grep in this pass.

## Long Jobs and Multi-Session Work

- [ ] **REQ-HANDOVER-045** claudetto shall start a long job with `nohup`/launchd, write a completion marker or exit-code file and poll it once; for multi-session work keep a short TASK.md (goal, decisions, next) read first, state tied to the task, one worktree per session, and a shared-folder note of inter-session agreement (what is needed and why).
  Acceptance: Reported: Remote Control kills background jobs after about 2 h and its monitor about every 30 min. Sessions are `.jsonl` under `~/.claude/projects` (grep to find which folder held a topic); a PM session per plan phase never brings a problem without a recommendation; cloud-to-local messaging is one-way. Verification: inspection.
  Basis: reported. Status: missing at 088a227c.
  Source: external/2026-10-07_p2/export-Engineers who write all their code with claude now- how do you do it-.jsonl:113 (url: https://www.reddit.com/r/ClaudeCode/comments/1wgm4si/engineers_who_write_all_their_code_with_claude/).

## Handoff Trigger

- [ ] **REQ-HANDOVER-046** claudetto shall start a handoff at 75% of context when compaction is off (`DISABLE_COMPACT=1`), and tie every compaction-disabled path to that self-imposed trigger, because with a 300k window 10 of 43 main sessions ended "Prompt is too long" (14 occurrences) and subagent hand-backs of 88k and 103k arrived into a full context. A user estimate is not a trigger. Subagents write notes to files, not inline; status lives in tasks.md and survives `/clear`.
  Acceptance: with compaction off, a session that reaches 75% of its window gets a handoff written before the next turn. Verification: test.
  Basis: measured. Status: missing at 088a227c (no 75% trigger exists in hooks/features/compaction).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:29; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:134; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:31; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:157.

- [ ] **REQ-HANDOVER-047** claudetto shall wind a session down on context share: finish the current unit, write the handoff (done, next, rejected plus why), end the session, and let the new session read it.
  Acceptance: a context hook that reads the window size tells the session to wait for subagents, write the handoff, and start a new one; reports span 15% left of 1M, 30%, 40-50%, 55%, 60-65%, 70-80%, and 150k/175k/250k/300k (variant: note at 50%, native auto-compact as backstop at 70%; author measured ~30% less re-read on replay of own sessions; 78 of last 82 auto-compactions landed mid-task; needs mods, 2.1.287+). The model cannot read its own context. Minority view: with OpenSpec holding the plan, auto-compact at 300k works. Verification: test.
  Basis: reported, consensus; some author-measured. Status: partial at 088a227c (`handoff.ts` fork writes handoff at auto-compaction and at 59 minutes of age; trigger by percent, task boundary, and hot-context split missing). Hook events PreCompact, PostCompact, SessionStart, and Stop are in the 2.1.326 event list (chunk-m33vdkhs.js@5226); `$.session.compact` is unverified in 2.1.326.
  Source: external/2026-10-25_p2/reddit.com-r-claudeai-comments-1x95lff-about-30-less-context-reread-cla-20261025T162138Z.md:67; external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:62 (url: https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature/); external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:29; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; merged with plan:1158 (handoff fork replaces the built-in summary, have).

- [ ] **REQ-HANDOVER-048** claudetto shall start a clean-break relaunch only when a relaunch file is armed, fresh (under 10 minutes), and under 10 hops, and shall refuse (exit 2) on an invalid handoff or running background tasks.
  Acceptance: a wrapper relaunches `claude --name` with seed "claim and continue handoff <path>"; a Stop hook arms it; a detached killer SIGTERMs only when idle (gives up in 30 s); handoff status goes open to claimed; a dead-man wakeup at about 150 s re-runs and notifies; never `--resume`. A hook writing progress to a `.md` at each compaction cut reread cost from 23% to about 8% of usage (one dashboard). Verification: test.
  Basis: reported, author-measured. Status: missing at 088a227c. The Stop hook and `$.process.spawn` are present in 2.1.326 (chunk-m33vdkhs.js@5226; chunk-qg227pzf.js@3609); `$.session.compact` and `$.session.send` are unverified in 2.1.326.
  Source: external/2026-10-27/reddit.com-r-claudecode-comments-1x776ms-auto-handoff-are-the-best-new-20261026T134539Z.md:62,83 (url: https://www.reddit.com/r/ClaudeCode/comments/1x776ms/auto_handoff_are_the_best_new_feature/); external/please-use-me-often/agent-failure-dossier/judged/hook.jsonl:8; external/please-use-me-often/agent-failure-dossier/04-engineering-delegation-and-cost.md:153.

- [ ] **REQ-HANDOVER-049** claudetto shall stop at a context ceiling and hand off: keep sessions about 250-400k tokens even with a 1M window; never walk away over an hour without a compact or handoff.
  Acceptance: a hook stops and hands off at about 250k context. Reports: no loss at about 500k, noticeable past about 700k, long text blocks at about 800k; orchestrator never past 50%, retired after about a day; main session takes notes and clears at 30%; relay at 200-300k. Conflict: one author measured 9,096 turns over 52 sessions with rule violations falling from 8.7% at 0-20% fill to 5.5% at 80-100% (odds ratio 1.01 per +10 points, p=0.43; setup re-injects rules every turn so it may not generalize) against reports of instructions dropped late; a claim of about 1 in 4 mid-window instructions lost at half context has no source. Verification: test.
  Basis: reported, anecdotal; one measured. Status: partial at 088a227c (`plugins/claudetto/hooks/features/repeat/repeat.ts`; ceiling gate missing). `/autocompact` is named in the 2.1.326 release notes; `/context` is unverified in 2.1.326.
  Source: external/2026-10-12/export-I measured rule-following against context fill across ~9,100 turns of my own Claude Code sessions. I.jsonl:2 (url: https://www.reddit.com/r/ClaudeCode/comments/1x2g2k2/i_measured_rulefollowing_against_context_fill/); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:139; external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:65; merged with plan:1159 (hook that auto-stops at about 250k, missing); https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Handoff Artifact

- [ ] **REQ-HANDOVER-050** claudetto shall write each handoff with these fields: current goal; state tagged done, in progress, stopped, reverted, or untrusted; files touched and git diff; decisions with reason; what failed and what not to retry; what is known true; verification command and result; exact artifact and log paths; next smallest action; commands that run; why it stopped (waiting on the user, on a decision, or blocked outside).
  Acceptance: a handoff omits old attempts and transcript history; keeps persistent repo rules apart from transient notes; marks a changed decision's predecessor `superseded`; holds facts only; the next session cross-checks it against the repository before editing. Shapes offered: fork variant (goal, state and proof, next step, decisions and why, ruled-out approaches, open questions, files and commits, verify command, last 10 prompts verbatim); 5W1H; decision matrix with a number per decision; a `verify` line the resumed session runs first. A handoff written mid-task has a non-empty In Progress section, a Next Steps section, the user's standing rules, and the path of the full transcript. Verification: test.
  Basis: reported, convergent. Status: partial at 088a227c (`handoff.ts` fork writes handoff; field list and superseded marking not verified).
  Source: external/please-use-me-often/agent-failure-dossier/judged/handoff.jsonl:44 (decision matrix); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c. The 5W1H and last-10-prompts wording was not located in external/; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:8710 (handoff of 2026-11-15: user complaint that a handoff came at random in the middle of work and an order to read the previous session); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:10 (In Progress: None given), 2026-11-12.

- [ ] **REQ-HANDOVER-051** claudetto shall pair a handoff writer with a pickup step, and the handoff shall be visible and editable.
  Acceptance: `/handoff` writes the file and reminds the user of the other two steps (`/clear`, then read the file); the user can inspect and edit the handoff before `/clear`; the handoff is scanned for side effects because `/clear` detaches background tasks and scratchpads. Plan lives in a file, one fresh session per SDLC step, one human checkpoint before commit. A sceptic: a handoff is compaction with more steps but visible. Verification: demonstration.
  Basis: reported, consensus. Status: partial at 088a227c (`handoff.ts`, fork variant only; pickup step missing). Commands in 2.1.326: `/export` (chunk-4h798pp0.js@2485683) and `/btw` (chunk-4h798pp0.js@2113520) found by code search; `/clear` and `/compact` are named in the release notes; `/rewind` is unverified in 2.1.326.
  Source: external/2026-11-02/reddit.com-r-claudeai-comments-1xd75g2-compactions-vs-handoffs-lets-set-20261102T070448Z.md:73 (url: https://www.reddit.com/r/ClaudeAI/comments/1xd75g2/compactions_vs_handoffs_lets_settle_this_right/); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; merged with plan:1149.

- [ ] **REQ-HANDOVER-052** claudetto shall flush state and plan to memory in a PreCompact hook and reload them after compaction, and shall re-read the durable "why" file as a required checkpoint after any compaction.
  Acceptance: plan-approval state survives a compaction; a SessionStart hook (fires on compact and resume) prints a file of about 4 bullets with the skill's key rules. Verification: test.
  Basis: reported. Status: partial at 088a227c (`plugins/claudetto/scripts/pre-compact.ts` via hooks.json; post-compact re-read gate missing). `SessionStart` and `PreCompact` are in the 2.1.326 hook event list (chunk-m33vdkhs.js@5226).
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:57; plugins/claudetto/hooks/hooks.json@088a227c; merged with plan:1155.

## Compaction Timing

- [ ] **REQ-HANDOVER-053** claudetto shall compact on the session model while the cache is warm and shall not switch the compaction model.
  Acceptance: a compaction on a cheaper model gets zero cache hits and re-reads history at fresh-input price (posted $0.25/M cache read against $1/M fresh; prices not checked); the rule is to compact before leaving, ask for a handoff before an expected absence, and compare when idle beyond the TTL. Measure by input, output, and cache_read right before, right after, and about 10 turns after a compact. Author measured over 187,978 API calls: all 134 compactions on warm cache against 30 of 121 before; median cold-resume re-read 493k to 255k; next-prompt-correction rate 5.5% against 6.1%; net about 4.7% of spend saved (range 1.8-13%); needs 2.1.284+. `/compact` cannot run mid-turn. 2.1.326 release notes: automatic compaction in plan mode uses the model answering the user, such as Opus with `opusplan`, so it can cost more. Verification: probe.
  Basis: reported / measured by tool author. Status: partial at 088a227c (59-minute age rule in `handoff.ts`; no cold-cache gate and no per-compaction cache measurement). In 2.1.326 code search finds `idleCompaction` (chunk-39ka6efv.js@823), `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` (chunk-07n5vvax.js@32522), `CLAUDE_CODE_COLD_COMPACT` (chunk-4h798pp0.js@2929663), `CLAUDE_CODE_SLEEP_COMPACT` and `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` (chunk-07n5vvax.js@37571), and `precomputeCompactionEnabled` (chunk-39ka6efv.js@875).
  Source: external/2026-10-25_p2/reddit.com-r-claudecode-comments-1x0omjh-i-built-conpact-claude-code-co-20261025T162222Z.md:42 (url: https://www.reddit.com/r/ClaudeCode/comments/1x0omjh/i_built_conpact_claude_code_compacts_its_own/); external/2026-10-17/export-Got into a debate work about why my token usage was so high yesterday.jsonl:7; external/2026-10-03/export-I fixed save-token-jev for Claude Code 2.1.283 — 70% context reduction in ~1.1s on a real coding ses.jsonl:22; https://github.com/anthropics/claude-code/releases/tag/v2.1.326 (release notes).

## Memory Guard

- [ ] **REQ-HANDOVER-054** claudetto shall hold a memory-guard that counts missed polls before going blind, covers background jobs a subagent leaves running past its turn, and keeps deny-with-actionable-reason, never an order to wait.
  Acceptance: a memory hold that misses polls reports the count; a deny carries a reason the model can act on. Verification: test.
  Basis: inferred. Status: partial at 088a227c (`plugins/claudetto/hooks/features/memory/hold.ts`).
  Source: plugins/claudetto/hooks/features/memory/hold.ts@088a227c.

## Compaction Instructions And Cache

- [ ] **REQ-HANDOVER-055** claudetto shall keep `/compact` on and visible: a manual `/compact` settles in about 5 s through `next()`, writes a `compact_boundary` with trigger manual, and survives `--resume`. The surface `OFF_COMMANDS` list had held `compact` against the spec, so the model said "/compact is off".
  Acceptance: after the fix a manual `/compact` completes and a resume in a second process keeps the state. Verification: test.
  Basis: inferred. Status: have at 088a227c (hooks/features/surface/surface.ts holds `OFF_COMMANDS`; the held-compact fix was not re-run).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:63; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:859.

- [ ] **REQ-HANDOVER-056** claudetto shall measure whether the summarizer request carries `cache_control` and its TTL before costing a compaction: run `/compact` against a fake API with `--debug-file`; the result settles `skipCacheWrite:true` (2.1.319 fork) against a 5 m write.
  Acceptance: the recorded result names the TTL; it is already measured (no ttl). Verification: probe.
  Basis: measured. Status: have at 088a227c (result recorded; the probe command was not re-run).
  Source: openspec/changes/2-1-325-rearchitecture/design.md:131.

## Session Boundary

- [ ] **REQ-HANDOVER-057** claudetto shall favour one task per session and move a session at a task or phase boundary, not at a percent: write handoff notes (goal, done, next, decisions) before the `/clear`, and start the next session from that file. Context stays 150-250k tokens (500k at most) and under about 150 turns; tasks are planned below 150k.
  Acceptance: a `/clear` between unrelated tasks follows a handoff file holding goal, done, next, decisions; the next session reads it; the handover flow can end a session at a task boundary and start the next with the handover. Verification: demonstration.
  Basis: measured (one author priced six months of transcripts: 56% of spend was context re-reads after the cache discount, about 20% useful work, almost half of calls above 200k tokens); reported (auto-compact capped at 350-400k gave about 30% more weekly use; a 250k-token cache miss cost about 18% of an hourly window on a $20 plan; user preference for one task per session with a handover at its end over long sessions). Status: partial at 088a227c (a fork writes a handoff at auto-compaction and at 59 minutes of age; the task-boundary trigger is missing).
  Source: external/export-I ran out of codex on chatgpt pro with 4 days left. how hard is it to actually kill max 20x with opu.jsonl:24 (url: https://www.reddit.com/r/ClaudeCode/comments/1wqjb89/i_ran_out_of_codex_on_chatgpt_pro_with_4_days/); plugins/claudetto/hooks/features/compaction/handoff.ts:67@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

## Handover Schema

- [ ] **REQ-HANDOVER-058** claudetto shall write the handoff as a schema, not a free summary: goal, state with proof, decisions and why, ruled-out approaches, verify command, files touched, last N user prompts verbatim; and shall trigger it near 75% of context ("This conversation is at 75% of its context"). The fork request carries only prompt and effort, no `maxTokens`; the cap is a word limit in the prompt (under 1,500 words); the classic PreCompact hook stays for `/compact`, subagent compaction, and fork failure; the fork prompt imports its keep text so one copy exists. Durable state on disk (progress.md, decisions/) is re-read by PostCompact and SessionStart hooks; each handoff decision is marked active or replaced; a file-based checkpoint (goal, completed and verified, live units, blockers, unsaved state, next exact command) is written near 180k or at batch end, a hook watches for it, and a pickup step reads the newest after `/clear`.
  Acceptance: a handoff holds all seven schema fields; one run at 75% context writes it before the window fills. Handoff template when leaving a chat: done, verified, open, what not to touch; stable facts go once into project instructions. Reset at task boundaries, not token counts: at task done write the handoff (done, next, red test), then `/clear` or compact; one harness resetting near 225K reported cost down 50-75%; compact manually above 300K at unit-of-work boundaries; a PreCompact hook at 350-380K performed like a `/handoff` skill. Measured counterpoint: auto-compact fired at 967k, 972k, 983k and kept 12k, 11k, 15k (about 1.3%). Verification: test.
  Basis: measured (one session log: handoff at 75% worked, session log c8c0cf57; subagents writing notes to files instead of inline returns, session log 157f1ff7; the counterpoint); the schema is a catalog recipe and a "handoff-compact" mod. Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/texts.ts` holds ruled-out and verify-command wording).
  Source: external/please-use-me-often/agent-failure-dossier/judged/context.jsonl:75; external/export-Are you manually compacting-handing off, or using auto compact with 5.5-.jsonl:25 (url: https://www.reddit.com/r/ClaudeCode/comments/1wp4ga1/are_you_manually_compactinghanding_off_or_using/); external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:153-158; external/please-use-me-often/agent-failure-dossier/01-grounding-and-memory.md:183 (thread url: https://www.reddit.com/r/ClaudeAI/comments/1wwk4y5/).
  Conflict: claudetto shall write each handover from checked state.
  Conflict: claudetto shall keep the handoff file free of the user's profanity.

## Idle Compaction

- [ ] **REQ-HANDOVER-059** claudetto shall write `idleCompaction: false`: from 2.1.290 a session idle about 54 minutes is compacted just before the 1-hour cache expires (warm and cheap, but a lossy summary and handover files are re-read), and the setting stops it (present in 2.1.326, default true; code search finds `idleCompaction` with default `!0` at chunk-39ka6efv.js@823). The posted env `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKEN` is absent from the build; the installed name `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` is present in 2.1.326 (chunk-07n5vvax.js@32522).
  Acceptance: the written settings hold `idleCompaction` false. Cost claim, inferred from pricing: warm reads at 0.05x against a rewrite at 1.25x (5 minutes) or 2x (1 hour). Verification: test.
  Basis: reported (the 2.1.299 release note); inferred (the cost claim). Status: have at 088a227c (plugins/claudetto/hooks/features/setup/groups.test.ts:101@088a227c).
  Source: external/2026-10-25_p2/reddit.com-r-claudecode-comments-1x0omjh-i-built-conpact-claude-code-co-20261025T162222Z.md:92 (url: https://www.reddit.com/r/ClaudeCode/comments/1x0omjh/i_built_conpact_claude_code_compacts_its_own/); plugins/claudetto/hooks/features/setup/groups.test.ts:101@088a227c.

## Handover Cost

- [ ] **REQ-HANDOVER-060** claudetto shall make the handover flow cost less than Claude Code's built-in compaction and auto-compaction, and write the handover so that it hits the prompt cache and costs half a core compaction.
  Acceptance: the handover rewrites message 0, a cache read follows it, and its cost is at most half the cost of one core compaction on the same session; a measured run of the same task costs fewer tokens with handover than with built-in compaction. Verification: probe.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; no measured comparison).
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/issues-2026-11-09.md:79; plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

## Handover In Place Of Compaction

- [ ] **REQ-HANDOVER-061** claudetto shall avoid core auto-compaction by default and keep each session under 59 minutes: write a handover, clear the session through the Mod API (no use of `$session.compact`), and send the handover as the first prompt of the new session as if it were a compact summary, so the agent resumes. The design may use a compact-like handover from external sources and papers or a light auto-compaction through Mod API compaction hooks, whichever a probe shows works.
  Acceptance: after the trigger, the new session's first prompt holds the handover and the old session's context is cleared; a long run produces a handover, a `/clear`, and a resume with no core auto-compaction and no single session of 60 minutes or more. The root may start a handover, or `/clear` with a handover into a new session, by itself with auto-compaction disabled, and Pre and PostCompact hooks are supported if needed; the user's own `/clear` stays unbroken. Verification: probe.
  Basis: reported. Status: partial at 088a227c (git grep for `.clear`, `session.clear`, `clearAndSubmit` in plugins/claudetto/hooks and scripts at 088a227c finds only `state.clear()` in features/repeat/repeat.ts:181, so no handover clear path; features/compaction/handoff.ts writes a fork handoff at auto-compaction; the 59-minute bound unchecked).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c; plugins/claudetto-you-should-know/hooks/register.ts:57@088a227c (a clear counter only); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints on auto-handover); [ADR-0143](../adr/0143-handover-replaces-auto-compaction.md).

- [ ] **REQ-HANDOVER-062** claudetto shall choose its handover design from cheap trial and error and probes, which include the cost of a long session's context re-send (up to 8 hours) and the mix of 0 to 2 compactions with a handover.
  Acceptance: a probe record compares the options and names the most effective and stable one. Verification: probe.
  Basis: reported. Status: missing at 088a227c.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09).

## Handover Currency

- [ ] **REQ-HANDOVER-063** claudetto shall write a handover that is current to the working tree and never interrupts ongoing work abruptly.
  Acceptance: a resumed agent finds committed and uncommitted state as it is; a handover does not cut a running task. Verification: test.
  Basis: reported. Status: partial at 088a227c.
  Source: reported, user, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:12); reported, user, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/65690c8a-827e-4fe5-888a-4269ee65dbd4.jsonl:8192); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:6530 (handoff turn; the user said the handoff abruptly interrupts ongoing work, as read in the earlier pass).

## Resume From An Earlier Session

- [ ] **REQ-HANDOVER-064** claudetto shall let a new session continue the work of a named earlier session from its handoff file.
  Acceptance: A new session started with an earlier session ID reads that session's handoff file and names what is done and what is open. Verification: demonstration.
  Basis: reported. Status: partial at 088a227c (plugins/claudetto/hooks/features/compaction/handoff.ts@088a227c writes a handoff; resume by session ID is not checked).
  Source: reported, user, 2026-11-12 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-JagFx/f562bb33-b072-47ed-a737-f1b3d070b642.jsonl:8`); reported, user, 2026-11-13 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/05884638-c1a2-4b41-83af-50464f374189.jsonl:17`); reported, user, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:2796`).

- [ ] **REQ-HANDOVER-065** claudetto shall keep the handoff file free of the user's profanity and make it hold the user's corrections in paraphrase.
  Acceptance: A handoff file written after a corrected turn holds the correction in the agent's words. Verification: inspection.
  Basis: observed in transcript. Status: partial at 088a227c.
  Source: observed in transcript, 2026-11-14 (`~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenJoystickDriver/92c2d0ed-d53e-44cb-8e0e-be2c127d057d.jsonl:5054`; the agent's note says the file holds the corrections word for word).
  Conflict: claudetto shall write the handoff as a schema, not a free summary.

## Conflicts With Settled Decisions

- [ ] **REQ-HANDOVER-066** claudetto shall carry decisions across handoff and compaction: a handoff that has a growing tail of the last three tool-using steps (have), an active or replaced mark per decision, the ledger and open-items list word for word, and the goal re-set after clear.
  Acceptance: after a `/clear` the new session shows the goal, the ledger, and the open items unchanged. A per-turn tool-output mask at compaction stays open (needs a paid eval; ask first). Verification: test.
  Basis: inferred. Status: partial at 088a227c.
  Source: unresolved: no matching line found in openspec/specs/compaction-path/spec.md or external/; kept because the user curated it.
  Conflicts with: The advisor tool stays disabled; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

- [ ] **REQ-HANDOVER-067** claudetto shall append "Keep the user's corrections, refusals, and consents word for word." after the existing instructions of each compaction, through `next({...e, instructions})` (the summarizer reads it as `Additional Instructions:` ending the request; the hook module has no `process`, so the text is a constant; a failing hook logs `session.compact hook skipped`), then stored constraints as `- ` lines. A classic `PreCompact` command hook prints one keep line (manual and automatic; no model call, no read of earlier messages). Keep verbatim: every user correction, every rejection or block (never retried), a consent with its named value, a user-owned value change (old, new, approved), open notices and unverified claims, running jobs with ID, log and lock, the Record or SOW path; never attribute to the user what only the assistant said.
  Acceptance: the compaction request ends with the instruction; the built-in summary keeps only security constraints verbatim and corrections only lossily, and one summary form caps at 2,000 words. Verification: test.
  Basis: measured (Claude Code 2.1.322). Status: have at 088a227c (hooks/hooks.json PreCompact; hooks/features/compaction/texts.ts "word for word").
  Source: openspec/specs/compaction-path/spec.md:83; openspec/changes/archive/2026-11-13-feat-2-1-321/specs/compaction-path/spec.md:5; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35.
  Conflicts with: The advisor tool stays disabled; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)). The spec line at openspec/specs/compaction-path/spec.md:83 adds the stored constraints from the constraint ledger.

- [ ] **REQ-HANDOVER-068** claudetto shall build the handoff content from prompts with `origin.kind == "human"` in the whole transcript, quote the last 100 verbatim under "Standing instructions" and "Decisions log" (none: neither section, no invention), date the git state, inject no handoff older than the resumed transcript on resume, redact the read-back through betterleaks, and carry the ledger text and open-items list word for word. A `/goal` survives a handoff clear: no typed interface exposes the active goal, so a `command.run` hook records the last `/goal <condition>` (`/goal clear` forgets it), and `clearAndSubmit` runs `$.command.run({command:"goal", args})` after the clear and before the read-back; a refused goal is named and the handoff is still sent. The handoff notice lists each open task as the model's own, the user's only a step the user alone can take, and continues in the same turn.
  Acceptance: a goal set before a handoff is set after it. Verification: test.
  Basis: measured. Status: partial at 088a227c ("Standing instructions" is absent; the goal restore is tested in hooks/features/compaction/handoff.test.ts:170).
  Source: openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-handoff/spec.md:149; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:618; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:35.
  Conflicts with: The advisor tool stays disabled; no constraint ledger (user decision, recorded in the 2026-11-17 handover (day of decision not recorded)).

## Handoff Content

- [ ] **REQ-HANDOVER-069** claudetto shall make each handoff cite its evidence, carry the user's words, and set no order, with the user's goal outranking it.
  Acceptance: a handoff holds a proof for each done piece, the user's latest prompts, and a note that the goal outranks the handoff; its Next section orders nothing the user ruled out. Verification: inspection.
  Basis: user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (`plugins/claudetto/hooks/features/compaction/texts.ts` asks for State with proof and User's words verbatim; no line says the goal outranks the handoff).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Handoff: fresh, cites evidence, quotes user, sets no order; the goal outranks it).

- [ ] **REQ-HANDOVER-070** claudetto shall make a handoff list each worker still running, with its task and worktree.
  Acceptance: a handoff written while a background worker runs names that worker in In Progress or State. Verification: test.
  Basis: observed in transcript, 2026-11-12. Status: missing at 088a227c (the handoff prompt names no section for running workers).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210 (the agent reply names four workers running in their worktrees while the handoff reads "None given" under In Progress).

- [ ] **REQ-HANDOVER-071** claudetto shall mark a task "user's only" only when the user alone can take it, and the agent shall take every other open task.
  Acceptance: a task the user said they cannot do is not marked user's only; the next session takes it or finds another way. Verification: inspection.
  Basis: reported, user, 2026-11-16 (date of the handoff that records it; day of decision not recorded). Status: partial at 088a227c (`texts.ts` carries the rule in the Next line; it did not hold).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:4057 (the user said they cannot score anything; the handoffs had marked holdout scoring user's only).
