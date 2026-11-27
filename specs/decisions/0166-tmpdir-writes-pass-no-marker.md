---
status: accepted
date: recorded in openspec/specs/permission-policy/spec.md:262 (day of decision not recorded)
---
# Tmpdir Writes Pass No Marker

## Context and Problem Statement

Cleanup is allowed only for folders the session made. Source C used a `.created-by-<plugin>` marker holding the session id (`find -H` follows /private/tmp). D321 rejected the marker `.created-by-claudetto` (about 350 denials over 40 folders, no benefit).

Does the plugin mark a folder it made with `.created-by-claudetto`? The plan rejects the marker (about 350 denials over 40 folders, no benefit), lists it in a deletion list, and lists it among items the user approved on 2026-11-11 and 2026-11-12.

The idle-time temp rule needed a marker that 0 of 9,567 temp folders held. 48 agent worktrees held 95.1 GiB on a disk 70% full; a dry run with `--remote` found 26 temp entries (790,704 B), 28 worktrees (51.4 GB) and 10 branches.

## Considered Options

- Marker file holding the session id (C)
- A write or delete under `$TMPDIR` passes; a recursive delete outside project and `$TMPDIR` goes to Claude Code's permission flow
- Keep the marker: `ours.sh` lists only the folder whose marker holds this session's id (the mutant without the id check also lists other)
- Drop the marker
- Idle-time rule: remove an entry no process holds and nothing changed within `probeCleanupPeriodMinutes`.
- Per-session folders: probes write to `$TMPDIR/<project>/<session_id>/`, removed on `session.end`; at session start only folders no running session's `~/.claude/sessions/<pid>.json` names and whose pid and procStart no longer match go (task 7.7).

## Decision Outcome

Chosen: no marker; `$TMPDIR` writes pass.

Earlier, superseded: not chosen. The plan contradicts itself. Whichever is chosen, `find` needs `-H` because `/tmp` is a link to `/private/tmp` (without it the seven `/tmp/probe-*` folders are not listed).

Same decision, mechanism: per-session folders. D323 deletes the idle-time temp rule; setup adds `Edit(//tmp/claude-<uid>/**)` and `Edit(//private/tmp/claude-<uid>/**)` to `permissions.allow` (task 7.18).

gap-11--temp-folder-marker left the choice open (the plan rejected the marker and also listed it as approved removed); the later plan-09--tmpdir-writes-pass-no-marker settles it: no marker, `$TMPDIR` writes pass.

## Consequences

Good: no denials over temp folders. Bad: no per-session ownership record.

- Good, because the contradiction and the `find -H` fact are in one place.
- Bad, because the cleanup block waits for the choice.
- Good: a folder's owner is named by its path, not guessed from idleness.
- Bad: at 088a227c hygiene.ts still carries the old keys; the per-session folders were not found there.

Source: openspec/specs/permission-policy/spec.md:262; openspec/changes/archive/2026-11-10-release-2-1-319-1/specs/session-hygiene/spec.md:61; openspec/specs/session-hygiene/spec.md:77; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:253; openspec/changes/archive/2026-11-09-release-2-1-319/evidence/18-11/README.md:5-15 (measured 2026-11-07); openspec/changes/archive/2026-11-16-2-1-323/tasks.md:64; openspec/changes/archive/2026-11-16-2-1-323/tasks.md:75; openspec/changes/archive/2026-11-13-feat-2-1-321/design.md:619.
