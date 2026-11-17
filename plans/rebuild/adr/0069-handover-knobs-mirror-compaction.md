---
status: accepted
date: 2026-11-16
---
# Handover Knobs Mirror Claude Code's Compaction Knobs

## Context and Problem Statement

Claude Code 2.1.325 (unverified in 2.1.326) exposes settings and env knobs for compaction. claudetto needs a knob for each part of handover.

Handover needs settings. The choice was the full mirror of Claude Code's compaction knobs when every part of compaction can be replaced, else a trimmed set. Every part was replaced in probes (Handover, probe G).

Transcript record tx-x02/handover-knob-mirror: The user asked that claudetto's handover mimic Claude Code's compaction env vars and settings, with "handover" for "compact" and `CLAUDETTO_*` for `CLAUDE_CODE_*`. The user's rule: full mirror if every part can be replaced by a mod, a trimmed set if not.

## Considered Options

- Invent new knob names.
- Mirror each Claude Code compaction knob, with "compact" read as "handover" and `CLAUDE_CODE_*` as `CLAUDETTO_*`; each default mirrors Claude Code's, and `idleCompaction` documents `true`.
- A trimmed set of knobs.
- The full mirror as `CLAUDETTO_*` knobs.
- Full mirror of the compaction surface.

## Decision Outcome

Chosen: mirror. Each part has a replacement on 2.1.325 (unverified in 2.1.326) (probe G).

| Claude Code | claudetto | Use |
| --- | --- | --- |
| `autoCompactEnabled` | `autoHandoverEnabled` | auto handover on or off |
| `autoCompactWindow` | `autoHandoverWindow` | window the threshold is measured against |
| `idleCompaction` | `idleHandover` | handover while idle |
| `precomputeCompactionEnabled` | `precomputeHandoverEnabled` | write the handover in the `precompute` pass |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE` | threshold percent |
| `CLAUDE_CODE_AUTO_COMPACT_WINDOW` | `CLAUDETTO_AUTO_HANDOVER_WINDOW` | window, accepts `k`/`M` |
| `CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS` | `CLAUDETTO_IDLE_HANDOVER_MIN_TOKENS` | idle floor |
| `CLAUDE_CODE_SLEEP_COMPACT` | `CLAUDETTO_SLEEP_HANDOVER` | timer at 0.9 of the cache TTL |
| `CLAUDE_CODE_SLEEP_COMPACT_AFTER_MS` | `CLAUDETTO_SLEEP_HANDOVER_AFTER_MS` | timer, clamped 60000-210000 |
| `CLAUDE_CODE_COLD_COMPACT` | `CLAUDETTO_COLD_HANDOVER` | handover when the prefix is cold |
| `DISABLE_AUTO_COMPACT` | `CLAUDETTO_DISABLE_AUTO_HANDOVER` | auto path off, manual `/clear` handover stays |
| `DISABLE_COMPACT` | `CLAUDETTO_DISABLE_HANDOVER` | all handover off |
| `CLAUDE_AFTER_LAST_COMPACT`, `CLAUDE_CODE_DISABLE_PRECOMPACT_SKIP`, `CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE` | none | core internals with no handover meaning |

Replacements: threshold and window read `session.measure` `context.percent` and `context.window`; idle and sleep use `$.clock.after` armed at main `turn.complete` and cancelled at `prompt.submit`; cold prefix is the time since the last request start read at `prompt.submit`; precompute is the `precompute` trigger; disables are knob checks.

Same decision, other record: the full mirror ships (user decision, 2026-11-16).

## Consequences

- The idle and sleep timers work only in a live process; a `-p` run exits before they fire, so headless relies on the threshold and cold checks.
- The table names are the old plan's; they are not checked against a shipped build because no `CLAUDETTO_` knob exists at 088a227c.

Every `CLAUDETTO_*` handover knob has a Claude Code compaction counterpart.

Transcript record tx-x02/handover-knob-mirror decided: full mirror. Probe G on 2.1.325 showed $.session.usage() gives the context fill, session.measure fires after each main turn, and the $clock timers fire, so every part is replaceable. Knobs: autoHandoverEnabled, autoHandoverWindow, idleHandover, precomputeHandoverEnabled, CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE, CLAUDETTO_AUTO_HANDOVER_WINDOW, CLAUDETTO_IDLE_HANDOVER_MIN_TOKENS, CLAUDETTO_SLEEP_HANDOVER, CLAUDETTO_SLEEP_HANDOVER_AFTER_MS, CLAUDETTO_DISABLE_AUTO_HANDOVER, CLAUDETTO_DISABLE_HANDOVER. Idle and sleep timers work only in a live process, so a headless run relies on the threshold and cold checks.

Source: user decision, 2026-11-16 (old plan's User Answers); cc-inspect `surface` `setting` and `env`, claude 2.1.325 (the Claude Code names were not re-read in this pass); handover probe G, claude 2.1.325, 2026-11-16, cc-inspect cli on a fake API, stream-json prompts `first one`, `/clear`, `after clear`, plugin under --plugin-dir (recorded in plans/rebuild-curation.md at commit 434bf4cb); user decision, 2026-11-16 (User Answers). Probe G is cited by the old plan under a Handover section absent from the input; not re-read; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6738); user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:7297); probe G, claude 2.1.325, fake API, 2026-11-16 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:8057).
