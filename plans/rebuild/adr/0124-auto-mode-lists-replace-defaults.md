---
status: accepted
date: recorded in openspec/specs/low-hitl/spec.md:240 (day of decision not recorded)
---
# Automode user scope and list replace

## Context and Problem Statement

`autoMode` is read only from user settings, `--settings` and managed settings (project and local settings log `tengu_settings_auto_mode_untrusted_source_ignored`). User lists written without `"$defaults"` REPLACE the defaults (140,281 -> 63,413 chars); a `soft_deny` without `"$defaults"` first silently drops built-in rules including Irreversible Local Destruction.

A list without `"$defaults"` replaces the built-in rules; `"$defaults"` splices them in at its first position (`$defaults` handling, chunk-7bevdfan.js:435 (claude 2.1.326; `DZn` of 2.1.325 is renamed)). Two reports describe the same code. At `088a227c` setup writes `autoMode: AUTO_MODE` and says it replaces the built-in lists (`plugins/claudetto/hooks/features/setup/settings.ts:101-102`).

Transcript record tx-x02/automode-replace: The conflict list asked how setup should write `autoMode` against the `$defaults` semantics.

Transcript record tx-x03/write-auto-mode-group-and-keep-retired-entries: The agent asked, through AskUserQuestion, whether setup writes the Auto mode group, and whether to keep retired settings entries.

## Considered Options

- Write lists with `"$defaults"` first (source A)
- Write lists without it to shrink the classifier prompt (source C, measured)
- Replace the built-in lists (no `"$defaults"`).
- Splice them in with `"$defaults"`.
- Extend with `$defaults` (option text not in the summary).
- Skip the group.
- Write the group.

## Decision Outcome

Chosen: setup writes `autoMode` to user scope only and replaces the defaults; installing without setup leaves none and the report says so; verify with `claude auto-mode config`. The environment list holds project facts.

Same decision, other record: replace the built-in lists, to shrink the classifier prompt (user decision, 2026-11-16).

## Consequences

Good: classifier prompt 140,281 -> 63,413 chars. Bad: built-in rules are dropped unless each list restates them.

The classifier blocks only what the plugin lists.

Transcript record tx-x02/automode-replace decided: Chosen by the user through `AskUserQuestion`: "Replace". The summary does not give the question text; read as replacing the defaults.

Transcript record tx-x03/write-auto-mode-group-and-keep-retired-entries decided: Setup writes the group; retired entries stay; Jev's key lives in `.env`; the dev build is reinstalled. The user settings gain `defaultMode: auto` and `autoMode`.

Source: openspec/specs/low-hitl/spec.md:240; openspec/specs/low-hitl/spec.md:8; openspec/specs/low-hitl/spec.md:238; openspec/specs/low-hitl/spec.md:158; openspec/changes/archive/2026-11-09-release-2-1-319/tasks.md:150; user decision, 2026-11-16 (User Answers); chunk-7bevdfan.js:435 (claude 2.1.326 binary, relocated from chunk-sk365049.js:435 of 2.1.325; `$defaults` read in chunk-7bevdfan.js); plugins/claudetto/hooks/features/setup/settings.ts:101@088a227c; user decision, 2026-11-16 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:5807); ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/0342617c-e428-4c1f-ab72-4ddfcee1365a.jsonl:6352; ~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/85ceaa9f-457b-435c-a345-f6944c0e1a92.jsonl:9790 (handoff, User's words).
