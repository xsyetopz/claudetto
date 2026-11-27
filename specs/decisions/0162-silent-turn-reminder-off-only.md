---
status: accepted
date: recorded in chunk-m14bt1pz.js:3985537 (day of decision not recorded)
---
# Silent-Turn Reminder Off with the Switch Alone

## Context and Problem Statement

`CLAUDE_CODE_SILENT_TURN_REMINDER` is a tri-state switch; `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` only replaces the text, whose default comes from GrowthBook `tengu_hushed_lark_text` (chunk-m14bt1pz.js:3985537). They are not alternatives.

Transcript record tx-x02/silent-turn-reminder-off: The setup wrote CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT, which pushed narration into a turn of work. The user reported narration and text after being told to be quiet.

## Considered Options

- The switch and the text variable.
- The switch alone.
- Keep a custom reminder text.
- Set CLAUDE_CODE_SILENT_TURN_REMINDER to "0" and drop the text key.

## Decision Outcome

Chosen: `"0"` alone, as `settings.ts:188` writes, with `_TEXT` retired.

## Consequences

No text override is written.

Transcript record tx-x02/silent-turn-reminder-off decided: "0". The binary reads it through LR("silent_turn_reminder", ..., env), which returns the env override. Setup retires an old text value only when it matches what setup wrote. A rerun of setup removes the old key; the user's own settings.json line is outside the sandbox write area.

Source: chunk-m14bt1pz.js:3985537 (claude 2.1.327 binary); plugins/claudetto/hooks/features/setup/settings.ts:188@088a227c; reported, user, 2026-11-14 (date of the handoff that records it; day of decision not recorded) (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241); observed in transcript, 2026-11-14 (~/.claude/projects/-Users-krystian-CodeProjects-xsyetopz-claudetto/294da1a9-e778-41e2-b2d4-d83e20be999a.jsonl:1241).
