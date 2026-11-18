# Handover

## Writer

- [ ] **RT-024** The handover writer calls `$.model.fork({prompt, effort:'low'})`, a tool-less completion over the cached prefix with a small output, then appends `git rev-parse --short HEAD` and `git status --short`. When the `session.compact` hook returns this handover, core sends no summarizer request, so the fork is the only model call of the renewal (CTX-843).
  Basis: measured on claude 2.1.325; holds on 2.1.327 (reports/2026-11-18-research/handover.md, RT status). Status: partial (handoff.ts:44-65 forks with no effort argument and appends both git commands) at 088a227c.
  Source: handover probe A, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); plugins/claudetto/hooks/features/compaction/handoff.ts:44-65@088a227c.

## Clear Hook

- [ ] **RT-025** Renewal splits by mode ([ADR-0184](../../adr/0184-headless-renewal-by-driver.md)). Interactive: the mod calls `$.session.compact({instructions})` between turns, and the `session.compact` hook returns the handover as the new messages. Headless (`-p`): the mod catches the rejection of `$.session.compact` and of a plugin-issued `/clear`, and the driver sends `/clear` or `/compact <instructions>` as a prompt.
  Acceptance: under `-p`, the mod logs the caught rejection and the driver's `/clear` runs; interactively, one live probe shows the `session.compact` hook with trigger `plugin` and the handover as the first message after it. Verification: probe.
  Basis: measured on claude 2.1.327 for `-p` (plugin clear discarded by `clearCommandQueue`, chunk-m14bt1pz.js@740648; `$.session.compact` rejected in headless, chunk-rap1tzf6.js@763945); the interactive path is probed: `$.session.compact` from `turn.complete` is accepted, the hook gets trigger `plugin`, and the handover becomes the first message (CTX-843). The 2.1.325 pass-through by `e.origin.kind === "plugin"` is refuted under `-p`. Status: missing at 088a227c.
  Source: handover probes A and F, claude 2.1.327, 2026-11-18, cc-inspect `code cli` with a repo plugin dir, stream-json prompts (reports/2026-11-18-research/handover-probes/probe-f/probe.log; reports/2026-11-18-research/handover.md Q2); handover probe H, claude 2.1.327, 2026-11-18, interactive TUI in tmux (reports/2026-11-18-research/handover-probes/probe-h/probe.log, run3/); session-cycle probe, claude 2.1.325, 2026-11-16 (recorded in plans/rebuild-curation.md at commit dc499712).

## Store

- [ ] **RT-026** The pending handover lives in `$.store`, not module memory, because `/reload-plugins` re-runs `register` and drops module state between the clear and the next prompt. It is cleared once `prompt.context` has injected it.
  Basis: measured on claude 2.1.325; holds on 2.1.327 after a user-typed clear (reports/2026-11-18-research/handover.md, RT status). Status: missing (handoff.ts keeps compactedAt in module state; no pending handover) at 088a227c.
  Source: handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); plugins/claudetto/hooks/features/compaction/handoff.ts:72-73@088a227c. The /reload-plugins reason is the old plan's inference; no probe in the source lines shows it.

## Reset Or Continue

- [ ] **RT-027** claudetto shall renew only at a task boundary (`TaskCompleted`, Stop with no open task, or `PostToolUse` on a Bash `git commit`) when the context P is above the break-even size ([ADR-0178](../../adr/0178-renewal-at-task-boundaries.md)). Break-even requests N = (P x read + H x output + Sr x read + (Sw + H) x write) / ((P - Sr - Sw - H) x read). The variables:

- Sr: the shared system-and-tools prefix that a new session reads from cache;
- Sw: the part a new session writes;
- H: the handover size.

N counts API requests, because every tool call re-reads the context. The default threshold is 70k tokens, where N equals the median task's 35 requests.

The renewal runs at Stop, between turns, because `$.session.compact` rejects while a turn runs and UserPromptSubmit fires inside one. It does not wait for known remaining work, because in an interactive session the next task is whatever the user types next. If the user never returns, the renewal cost only the fork, about P × read + H × output. If the user returns after the 1 h cache has expired, it saves a full rewrite of P. Idle time and session age never trigger renewal.
  Acceptance: `reports/2026-11-18-research/sessions-scripts/renewal.py` reproduces the threshold from the user's transcripts (2026-11-18: Sr = 32.7k read in 75% of 51 sessions; Sw = 9.5k; requests per typed prompt p25 7, p50 35, p90 73; H = 3k; threshold 71k for the median task, 54k with no handover; 89% of 156 prompt boundaries above 70k). A dogfood session renews only at a boundary above the threshold. Verification: probe.
  Signals (CTX-840): `TaskCompleted` gives only the finished task, so the mod calls TaskList for open tasks; the commit match reads `tool_input.command` and a non-interrupted `tool_response` (no exit code in the payload); a Stop with a non-empty `background_tasks` is not a boundary.
  Basis: modelled from published prices with Sr, Sw and requests per prompt measured on the user's transcripts (renewal.py); H = 3k is the RT-024 target size, not a measurement; the signal payloads are measured (CTX-840). Reported user heuristics (fresh session per task, restart on a changed goal or a repeated correction, a progress file at each checkpoint) agree with the boundary trigger; the orchestrator kanban and archiver agent they also describe are not built ([ADR-0177](../../adr/0177-pragmatism-gate.md)). Status: missing at 088a227c.
  Source: user decision, 2026-11-18 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/2cf55002-c3a4-457f-b01c-e854d76d621e.jsonl:272); reports/2026-11-18-research/handover.md:34-54 and :72-77; external/2026-10-04/export-are you still creating fresh sessions or work in the same thread-.jsonl:53 (url: <https://www.reddit.com/r/ClaudeCode/comments/1wvpffv/>); external/export-30+ years of coding, obsolete. But at least my workflow is now all in one place.jsonl:65 (kanban; url: <https://www.reddit.com/r/ClaudeAI/comments/1wndhjz/>).
