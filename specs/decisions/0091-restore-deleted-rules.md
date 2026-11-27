---
status: accepted
date: 2026-11-16
---
# Restore the Deleted Rules

## Context and Problem Statement

Commit 378782f3 deleted the rules noNarratingComments.md and useEdgeCaseReport.md without the user's consent. What happens to them?

Files of the baseline `088a227c` could be restored into the rebuild.

## Considered Options

- Leave them deleted.
- Ship both rules again, and make the setup stray-rule dialog never offer to delete them.
- Restore more files.
- Rebuild from the plan only.

## Decision Outcome

Earlier, superseded: ship noNarratingComments.md and useEdgeCaseReport.md again, and the setup stray-rule dialog shall not offer to delete them.

Chosen: restore no more files from `088a227c` (user decision, 2026-11-16).

Settled by the user decision of 2026-11-16: gap-09--restore-deleted-rules chose to ship noNarratingComments.md and useEdgeCaseReport.md again; plan-01--no-further-restore-from-baseline chose to restore no more files from 088a227c (user decision, 2026-11-16).

## Consequences

- At 088a227c useEdgeCaseReport.md is present and noNarratingComments.md is missing (git ls-tree and git grep).
- A user rule deletion needs the user's consent.

The baseline is a read-only source; the rebuild writes new code.

Source: openspec/changes/archive/2026-11-16-2-1-323/tasks.md:88 (task 8.7); user decision, 2026-11-16 (User Answers).
