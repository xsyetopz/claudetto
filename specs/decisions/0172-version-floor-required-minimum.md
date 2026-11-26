---
status: accepted
date: recorded in chunk-ja5z738t.js:285180 and :281644 (day of decision not recorded)
---
# Version Floor by requiredMinimumVersion

## Context and Problem Statement

`requiredMinimumVersion` makes an older Claude Code exit at startup (chunk-ja5z738t.js:285180); `minimumVersion` only blocks a downgrade on the stable channel (:281644). `settings.ts:146` writes `minimumVersion`, so the old floor never held.

## Considered Options

- `minimumVersion` (baseline).
- `requiredMinimumVersion`.

## Decision Outcome

Chosen: `requiredMinimumVersion` 2.1.325.

## Consequences

An older Claude Code exits at startup.

Source: chunk-ja5z738t.js:285180 (2.1.327) and :281644 (claude 2.1.325 binary); plugins/claudetto/hooks/features/setup/settings.ts:146@088a227c.
