# Sessions

## Sessions and Handoff

- [ ] **CTX-416** What held: the agent refused a subagent's lowered bound from 190 to 180.
  Acceptance: Kept as a held behaviour. Verification: inspection.
  Basis: measured (session log 00bfd354).
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/06-autonomy-and-consent.md:94.

- [ ] **CTX-417** What held: the agent treated a 100% failure rate as a likely fixture bug and checked one run before blaming the model; it questioned an 89 s full-suite runtime instead of reporting success.
  Acceptance: Kept as held behaviours. Verification: inspection.
  Basis: measured (session logs d84dc11f, 7f324ada).
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/07-measurement-and-environment.md:45,46.

- [ ] **CTX-418** Deterministic layers (auto-mode classifier, built-in rm safety check, .env read deny, permission denials) held every time in the 43-session corpus; the failures sat beside them (work handed to the user, packaging around a filename deny, keystroke approval of a nested session).
  Acceptance: Kept beside the plan's counts. Verification: inspection.
  Basis: measured, one user, 3 days.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:56.

- [ ] **CTX-419** Fresh-context reviewers found real defects after green suites: 4 defects after 611 tests, 7 parser defects, 16 issues (some security-related) in work reported done.
  Acceptance: Kept as one corpus's count. Verification: inspection.
  Basis: reported, one corpus.
  Status: n/a (fact).
  Source: external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:64.

## Sessions and Handoff

- [ ] **CTX-420** Session audits (counted; corpus 43 main and 227 subagent transcripts, Claude Code 2.1.292-2.1.296, about 170 incidents, one power user): 191 What I Need sections with one bullet repeated 30 times; "files not committed" Stop blocks 44 in a row; HooksError spam of 319 lines in 12 minutes; compaction every 10 minutes; 65 Stop blocks about 10% of a session (inferred).
  Basis: measured (counted) and inferred. Status: not applicable.
  Source: openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:9.

- [ ] **CTX-421** In a 43-session dossier corpus "Prompt is too long" occurred 14 times in 10 sessions, subagent turn-limit 10 in 6, `handback-send-enforce` 9 in 7, subagent cap hit 2, classifier denials 24 (14 main, 10 subagent), built-in safety-check denials in subagents 10 in 8, `dangerouslyDisableSandbox: true` about 330 in 10, ugrep complexity errors 28 in 15, a nonexistent lowercase `bash` tool 6 in 5, rejected-then-retried 1; classifier reasons were Irreversible Local Destruction 6, Safety Bypass Flag 5, Credential Exploration 4, Create Unsafe Agents 3, Tmux Self Drive 2, one each Unverifiable Deletion Scope, Interfere With Workloads, Auto-Mode Bypass, Code from External.
  Acceptance: a recount of the corpus matches each number. Verification: inspection.
  Basis: measured; not re-run in this session (the old plan marks it unverified). Status: have at 088a227c (no code; a fact).
  Source: external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:31; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:33; external/please-use-me-often/agent-failure-dossier/08-session-log-corpus.md:43.

- [ ] **CTX-422** The 2.1.322 plugin had about 30 mods, a root prompt of 5,779 chars (the old plan said 6.3k), 21 rewritten tool descriptions, a Bash gate of about 2,600 lines, a two-model Stop grader and a per-prompt ledger. Session audits found 663 plugin denials in one project (569 in subagents; the no-work gate stopped 5 delegated agents), 191 and 102 "What I Need From You" sections, one `! git config` bullet repeated 46 times, 44 Stop blocks in a row asking to commit agent-worktree files, 1,818 `HooksError ... was not resolved` lines from `$.fs.stat` on non-path Bash operands, no status-line colour until the first measured turn, and compaction every 140-150k because setup halved the window.
  Acceptance: each count matches the audit text. Verification: inspection.
  Basis: measured (read of audits). Status: have at 088a227c (the old plugin is gone; this is history).
  Source: openspec/changes/archive/2026-11-16-2-1-323/proposal.md:7; openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:10; openspec/changes/archive/2026-11-16-2-1-323/research/sessions.md:73; openspec/changes/archive/2026-11-16-2-1-323/research/text-audit.md:43. Corrected: the 6.3k figure is 5,779 at text-audit.md:43.

## Sessions and Handoff

- [ ] **CTX-423** The reactive (prompt-too-long) path calls the `session.compact` hooks with `trigger:"auto"` and `agentId`; a hook's `{messages}` (`kind:"replaced"`) becomes the replacement; a `{skip}` returns `{result:null,hookBlocked:true}` with the notice "not compacted". The `precompute` pass takes a hook's `{messages}` as a ready replacement and logs "ready with a hook's N messages"; a `{skip}` records a veto. Re-read in 2.1.326: each of these statements is in the cited text.
  Basis: measured.
  Source: cc-inspect read, chunk-m14bt1pz.js@2628332 (2.1.327), @2582830, @2955174 (claude 2.1.326 binary; the 2.1.325 offsets @2499078, @2498600, @2871600 were replaced by @2955174 after a search for "ready with").

## Sessions and Handoff

- [ ] **CTX-424** Thread limits: max 4 cache_control breakpoints per thread request; a continue request with system or tools returns 400; no Message Batches, token counting, or compaction on a thread; not ZDR or HIPAA eligible. A thread expires 5 minutes after its last request and is deleted no more than an hour after.
  Basis: reported. Status: not applicable (outside fact).
  Source: external/2026-11-04/reddit.com-r-claudeai-comments-1xnc4ew-anthropic-shipped-message-thread-20261104T085756Z.md:35-36 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xnc4ew/anthropic_shipped_message_threads_beta_claude/>).

## Sessions and Handoff

- [ ] **CTX-425** claudetto delivers a handoff as a prompt the plugin submits between turns, opening "Context was reset from the handoff below. Continue from its next step, and take each open task yourself." and ending with "Git now" and the porcelain status; a file handoff (`.claude/claudetto/handoffs/handoff-<timestamp>.md`) is delivered with a notice to run `git status -sb` before reporting branch or push state.
  Acceptance: a session started from a handoff shows the opening line and the git state. Verification: demonstration.
  Basis: observed in transcript, 2026-11-12. Status: have at 088a227c (`plugins/claudetto/hooks/features/compaction/texts.ts`, HANDOFF_OPENING).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-OpenSAD/a106dac3-8014-4a19-a503-e4426f00617b.jsonl:210 (notice text); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (opening and Git now block).

## Sessions and Handoff

- [ ] **CTX-426** `$.model.fork` replays the last request of the main thread, so tool calls answered after that request are missing from what the fork sees.
  Acceptance: a handover fork prompt lists the calls that ran after the replayed request, each result cut to 500 characters. Verification: test.
  Basis: observed in transcript, 2026-11-16. Status: have at 088a227c (fix commit 563c5fcc is an ancestor of 088a227c; `plugins/claudetto/hooks/features/compaction/handoff.ts:5`@088a227c sets `RESULT_CHARS = 500`).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, State; probe: data2 marked uncommitted though commit 2d66d03 existed).

- [ ] **CTX-427** `/compact` run by hand gives the built-in summary and `compact_boundary` with trigger manual; an automatic compaction makes a fork handover with git state, and a failed or empty fork falls back to the built-in one.
  Acceptance: a real `-p` run shows `compact_boundary` trigger manual and the state recalled after. Verification: probe.
  Basis: measured, 2026-11-16. Status: unchecked.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, Done and Next step 4); `claude` 2.1.325.

- [ ] **CTX-428** `/usr/bin/grep` finds files in the gitignored `types/` folder that ugrep skips.
  Acceptance: `/usr/bin/grep -rl <name> types/` lists the file. Verification: demonstration.
  Basis: observed in transcript, 2026-11-16. Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Decisions).

- [ ] **CTX-429** The auto-mode classifier denied a read of a secret prefix and a read of old transcript content; a denial is not to be worked around.
  Acceptance: none; the denial stands. Verification: inspection.
  Basis: observed in transcript, 2026-11-16. Status: have.
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, Ruled out).

- [ ] **CTX-430** In `agent-browser`, a restore session named for the host holds the cookie `cf_clearance` after a person solves a Cloudflare challenge in a headed window; `web_fetch` then reads the page with the session through `--restore`.
  Acceptance: after a solve, `agent-browser --restore <host> cookies get` lists `cf_clearance`, and `read <url>` returns page text, not "Just a moment". Verification: probe.
  Basis: observed in transcript, 2026-11-16. Status: partial (the fix was checked against a real Cloudflare gate in `a5b203a1` and `2c9ddaf8`; the final solve was still open).
  Source: ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:8215 (handoff, CAPTCHA step); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790.

## External Sweep, 2026-11-18

- [ ] **CTX-882** The session transcript is one JSON object per line in an undocumented format that shifts between releases; one tool author lost a field between two patch releases. A line is a content block, not a message, so one turn spans several lines that repeat the same usage block (REQ-COST-014). Code that parses transcripts tolerates missing fields and names the version it was checked on.
  Basis: reported (third-party).
  Source: external/export-Six subagents on three different models in one turn. I built something to actually watch that happen.jsonl:9.

- [ ] **CTX-884** Review alone misses regressions: across 23 tasks and 183 runs, 38 agent patches passed review and then failed tests the writing agent never saw, mostly by breaking behaviour that used to pass. Prompting "check for regressions" did not help, because the reviewer had nothing concrete to check against; the fix that author uses is a writer that counts its tests per input category in the PR description and a reviewer that checks those counts against the real tests. Supports hidden or held-out tests over reviewer judgement (CTX-419).
  Basis: measured (third-party, one author, counts shown, no baseline).
  Source: external/2026-10-17/export-A clean AI-generated patch can still carry the wrong system assumptions.jsonl:7.

- [ ] **CTX-885** Reviewer placement, one 5-day build (136 PRs): the orchestrator reviewing code itself found 0.13 real bugs per round with its context full of other work, while a fresh reviewer session with an adversarial brief did far better; cross-family review found about 1.25 (Astra on Claude code) and about 1 (Fable on Opus code) per round, and an Astra audit of 31 Opus-built, Fable-approved merges found 7 real bugs in 6. Long sessions, not tests, burned the budget: 98% of the Codex input tokens were the model re-reading its own context. Consistent with fresh-context review (CTX-419) and renewal at task boundaries (ADR-0178); Fable is not a subagent model here (rule kept).
  Basis: reported (third-party, model-written summary of one team's build, numbers shown).
  Source: external/2026-09-29/export-Sonnet 5.5 has been out for an hour. Has anyone gotten a chance to stress test it-.jsonl:7.
