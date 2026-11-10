# release-2-1-319-1

## Why

`ISSUES-2026-11-09-1422.md` lists the problems that held the agent back after `release-2-1-319`, and its item 16 sets a re-audit of all of claudetto, because many rules, gates, and hooks date from 0.3.0. This change is the next claudetto version on the same Claude Code v2.1.319 engine.

## What Changes

- The version string stays `2.1.319` in `package.json` and the plugin manifests. The work happens on branch `feat/2.1.319+1`; `+1` is SemVer build metadata and appears only in the branch name.
- Each open item of `ISSUES-2026-11-09-1422.md` (`## 2026-11-09` items 1-16 and the open items under `## 2026-11-02`) is fixed, or recorded as out of reach with its evidence.
- The items the person raised during the change (A to D in `design.md`) are fixed too; D limits a reply to one `!` command for the person at a time.
- The re-audit (item 16) checks each rule, gate, and hook against the specs in `openspec/specs/`, and removes what no spec or issue keeps.

## Capabilities

### New Capabilities

To be named during the re-audit.

### Modified Capabilities

To be named during the re-audit. Candidates from the issues file: `constraint-ledger` (items 3, 13), `permission-policy` (items 2, 4, 12), `session-hygiene` (items 7, 8), `claim-check` (item 9), `lean-openspec` (item 10), `session-handoff` (item 11).

## Impact

- Code: `plugins/claudetto/hooks/`, `plugins/claudetto-openspec/`, as the audit names them.
- Docs: `CHANGELOG.md` gets the release entry; `ISSUES-2026-11-09-1422.md` is deleted once each item is resolved.
- No change to the version string.
