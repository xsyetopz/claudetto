---
status: accepted
date: recorded in chunk-m33vdkhs.js:282983 and :281644 (day of decision not recorded)
---
# Version Floor by requiredMinimumVersion

## Context and Problem Statement

`requiredMinimumVersion` makes an older Claude Code exit at startup (chunk-m33vdkhs.js:282983); `minimumVersion` only blocks a downgrade on the stable channel (:281644). `settings.ts:146` writes `minimumVersion`, so the old floor never held.

## Considered Options

- `minimumVersion` (baseline).
- `requiredMinimumVersion`.

## Decision Outcome

Chosen: `requiredMinimumVersion` 2.1.325.

## Consequences

An older Claude Code exits at startup.

Source: chunk-m33vdkhs.js:282983 and :281644 (claude 2.1.325 binary); plugins/claudetto/hooks/features/setup/settings.ts:146@088a227c.
