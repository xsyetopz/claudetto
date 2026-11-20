---
status: accepted
date: 2026-11-16
---
# Handover Replaces Core Auto Compaction

## Context and Problem Statement

Age since session start does not cool the prompt cache; an idle gap does. A handover must start where the cache is cold, and manual `/clear` must write one first.

Core auto compaction drops cache and context at its own trigger. A self-managed session cycle can write a handoff, clear the session, and resume from it. A cache read refreshes the TTL, which runs from the start of each request (platform docs, prompt-caching, "How prompt caching works"), so a 3 h session with steady turns stays warm, and a gap of 1 h or more leaves the whole prefix cold. At `088a227c` the `compaction` feature writes a handoff in place of the core summary (`plugins/claudetto/hooks/features/compaction/handoff.ts`; status: partial).

Core auto compaction summarises the whole history with a model call and breaks the cached prefix. Claude Code 2.1.327 lets a `session.compact` hook answer `{messages}` (or `{skip: reason}` to leave the history alone; claude-code.d.ts@235691) and a `command.run` hook run before a slash command such as a clear (claude-code.d.ts@229024); verified on 2.1.327. claudetto needs a cheaper way to carry work across a clear or a compaction.

Users in the dossier report that compaction costs tokens and loses state. Some use two compactions plus a handover, some never compact, some set a low compaction window, some write Mods. What should claudetto do?

Auto-compaction costs tokens and long sessions degrade. How does claudetto keep context life under one hour?

The file handoff interrupted work, went stale and ended the turn after the file was written (8 injections in one session). D321 deleted the handoff and kept the built-in compaction plus one instruction, because the newest handoff file read "None found in the transcript" in 7 of 9 sections and 0 of 12 decisions were left after 62 compactions (measured); the repo still ships handoff.ts at 088a227c.

Reports disagree: "never compact" against "compact at 30-50% or 200-300k". For: compact keeps user messages and is cheaper per event; long agent loops (30-90 min, 272k window) need autocompact; some compact 2-3 times before a final handoff; compaction improved over recent months. Against: compaction is generic, lossy, tied to its session, a token sink; it can trip a reasoning-extraction safeguard (not user-controllable); after `/compact` state outside the transcript (scheduled jobs) can come back empty, so check it still exists.

Transcript record tx-x01b/handover-replaces-auto-compaction: The goal sets a target of no auto-compaction and no session of 59 minutes or more.

Transcript record tx-x02/handover-replaces-core-compaction: Handover and compaction are not the same. Many users avoid compaction, use handover, and clear sessions per task. Claude should invoke the clear and the resume itself, without breaking `/clear`.

Transcript record tx-x03/handover-replaces-auto-compaction: The user asked why auto-compaction exists, and said the root should invoke a handover or a cheap compaction itself, or use `/clear` with a handover in a new session. It matches the settled decision that handover replaces core auto compaction and manual `/clear` writes a handover first; this record supplies its date.

## Considered Options

- Handoff at 59 minutes of session age ([ADR-0160](0160-session-age-handoff.md)).
- A cycle keyed on the idle gap, with the fork handover answering `auto` and `precompute` triggers and a manual `/clear`.
- Keep core auto compaction.
- Replace it with a self-managed session cycle, on by default.
- Handover: a short fork-written note carries the work across a clear or a compaction; it replaces core auto compaction by default, and a manual `/clear` stays and writes a handover first.
- Keep built-in compaction.
- Two compactions plus a handover.
- Handover, a programmatic clear through the Mod API, and the handover as the new session's first prompt.
- A compact-like handover system from external sources and papers.
- A light auto-compaction through Mod API compaction hooks.
- Core auto-compaction.
- Handoff file written by the model, with `handoverThresholdTokens` (default min(400000, window/2)), `HANDOFF_TRIGGER_TOKENS` (140,000, Haiku 90,000) and `heavyContextTokens` 400,000 (C).
- Built-in compaction plus one instruction; no handoff.
- Handoff by fork: the `session.compact` hook answers with a `$.model.fork` handoff as the one message (B, rearchitecture).
- Never compact; handoff only.
- Compact at 30-50% or 200-300k.
- Clear between unrelated tasks, handoff file for multi-session, compact only mid-task with focus instructions (keep failing test names, files touched, decisions), compact before leaving while the cache is warm.
- Handover through the Mod API.
- A self-managed cycle: handover, clear, resume.
- Keep auto-compaction.
- Handover by the root, with auto-compaction disabled.

## Decision Outcome

Same decision, other record: the idle-gap cycle with the fork handover. Handover replaces core auto compaction by default.

Chosen: handover replaces core auto compaction, on by default. The agent writes a handoff, clears the session, and resumes from it, without breaking the user's own `/clear`. The trigger is a task boundary above the break-even context size ([ADR-0178](0178-renewal-at-task-boundaries.md)), never session age or an idle gap. A failed `/clear` fork falls back to a `$.session.messages()` extract. `compaction` handoff stays in `handoff.ts`.

Same decision, other record: handover. The agent writes a handoff, clears the session, and resumes from it. Handover extends the session cycle and supersedes its vanilla-`/clear` rule (see [ADR-0058](0058-clear-stays-vanilla.md)).

Handover replaces compaction. The handover is created, the session is cleared by a Mod API call, and the handover goes in as the first prompt, as if it were a compact summary. It must cost less than built-in compaction. The most effective and stable variant is found by cheap trial and error and by probes. This is spec work first; probes are allowed.

No core auto-compaction. The agent writes a handover at its handover window and a Mod API `/clear` starts fresh, or claudetto compacts itself through Mod API hooks, whichever a probe shows works. On 2.1.327 the interactive path is `$.session.compact` and the headless path is a driver-sent `/clear` ([ADR-0184](0184-headless-renewal-by-driver.md)). Matches the settled decision that handover replaces core auto-compaction and `/clear` stays. Supersedes none.

Same decision, other record: handoff by fork. The settled user decision applies: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first. Triggers `auto` and `precompute` answer the fork handover. The C file-handoff items and thresholds are superseded.

Same decision, other record: carry only the measurable rule, the third option. It fits the settled decisions: handover replaces core auto compaction by default; manual `/clear` stays and writes a handover first.

## Consequences

- Good: no full-price prefix is paid after a cold gap.
- Bad: the 75% trigger for a session with compaction off is still missing at 088a227c.

Manual `/clear` stays and writes a handover first. Settled with the knob ADR `[ADR-0069](0069-handover-knobs-mirror-compaction.md)`.

- A fork request is paid per handover (2401 ms and $0.0018 on Haiku 5.5 over a 67542-token cached prefix, measured).
- Only one plugin's `session.compact` answer wins, so handover lives in one module.

This matches the settled decision that handover replaces core auto compaction by default.

Each session writes a handover; claudetto needs a probe of the Mod API `/clear`.

- Good: no file, no stale handoff, the cached prefix is kept.
- Bad: a fork failure falls back to the built-in compaction.

Good: one rule that a test can check. Bad: the contested claims stay reported, not measured. 2.1.325: `/compact`, PreCompact, PostCompact present. Baseline: partial (`handoff.ts`).

Transcript record tx-x01b/handover-replaces-auto-compaction decided: No auto-compaction and no 59+ minute session; handover through the Mod API, and subagents hand off within the cache window. Matches the settled decision that handover replaces core auto compaction. Good: cache stays warm (root 98.6%, subagents 98.9% at 98% or more). Bad: subagent handoff happens only through the built-in summary.

Transcript record tx-x02/handover-replaces-core-compaction decided: replace compaction with a self-managed cycle. Later answers: "On by default"; knobs mirror Claude Code's compaction knobs with "handover" for "compact" and `CLAUDETTO_*` for `CLAUDE_CODE_*`; a manual `/clear` stays and writes a handover first. See `[ADR-0069](0069-handover-knobs-mirror-compaction.md)`, `[ADR-0068](0068-handover-clear-hook.md)`, `[ADR-0068](0068-handover-clear-hook.md)`.

Transcript record tx-x03/handover-replaces-auto-compaction decided: Handover replaces auto-compaction; it must be cheaper than compaction, use mod API or classic hooks, and support Pre and PostCompact hooks if needed. Compaction hooks stay available.

Source: openspec/changes/2-1-325-rearchitecture/design.md:316; openspec/changes/2-1-325-rearchitecture/items.json:55; user decision, 2026-11-16 (User Answers); platform docs, prompt-caching, "How prompt caching works" (cited by the old plan, not re-read); plugins/claudetto/hooks/features/compaction/handoff.ts:87@088a227c; user decision, 2026-11-16 (the old plan's User Answers); handover probe E, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); handover probe F, claude 2.1.325, 2026-11-16, live paid run, `claude -p` stream-json (recorded in plans/rebuild-curation.md at commit 0e987414); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/4c68767f-62e8-43f8-a3c5-95dcd42c18d8.jsonl:198 (user decision, 2026-11-09); user decision, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:10408); openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:618; openspec/changes/2-1-325-rearchitecture/design.md:63; openspec/specs/compaction-path/spec.md:10; external/2026-11-02/reddit.com-r-claudeai-comments-1pwt86e-pro-tip-disable-compacting-use-y-20261102T071016Z.md:85 (url: <https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/>) (<https://www.reddit.com/r/ClaudeAI/comments/1pwt86e/pro_tip_disable_compacting_use_your_own/>); external/2026-11-02/reddit.com-r-claudeai-comments-1xd75g2-compactions-vs-handoffs-lets-set-20261102T070448Z.md:73 (url: <https://www.reddit.com/r/ClaudeAI/comments/1xd75g2/compactions_vs_handoffs_lets_settle_this_right/>); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:490 (goal text, Targets); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:3175 (cache measure); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/f4b1442b-77c3-49d0-a21f-cc5ade61649a.jsonl:37070 (handoff, constraints).
