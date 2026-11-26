---
status: superseded by the specs named in Source (no ADR holds the new wording)
date: recorded in openspec/specs/permission-policy/spec.md:50 (day of decision not recorded)
---

# Stale and Conflicting Statements Retired

## Context and Problem Statement

Four statements disagreed with later facts: the README said Athena runs on fable while `Athena.md` says sonnet-5-5; the old three-Stop-block counter; the permission-policy phrase "the exact rule to add"; spec task IDs and commit hashes in spec text.

## Considered Options

- Keep each old statement.
- Retire each: fix the README (Athena on sonnet-5-5); replace the counter by first-block-after-no-write; retire the phrase because allow rules do not lift gate denials; drop task IDs and commit hashes from spec text.

## Decision Outcome

Chosen option: retire each. The old statements are superseded; the replacement wording lives in the specs named in Source.

## Consequences

Good: one wording per fact. Bad: none known; the three-Stop-block counter wording was not located in openspec/ by grep.

Source: openspec/specs/permission-policy/spec.md:50; openspec/changes/2-1-325-rearchitecture/design.md:281 (Athena on Fable rejected); plugins/claudetto/agents/Athena.md@088a227c.
