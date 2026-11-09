# Tasks

## 1. Audit

- [ ] 1.1 Map each item of `ISSUES-2026-11-09-1422.md` to the spec in `openspec/specs/` and the code it touches, and record the map in `design.md`.
- [ ] 1.2 Re-audit each rule, gate, and hook against `openspec/specs/` (issue item 16), and list what no spec or issue keeps.
- [ ] 1.3 Write the spec deltas under `specs/<capability>/spec.md` and the fix tasks from 1.1 and 1.2, then validate the change.

## 2. Constraint Ledger

- [ ] 2.1 Make each ledger entry carry the person's words that set it, drop an entry with no such words, and lift an entry a later message allows, with a failing test first for each scenario in `specs/constraint-ledger/spec.md`.

## 3. Release

- [ ] 3.1 Add the release entry to `CHANGELOG.md` with the version string unchanged at `2.1.319`.
- [ ] 3.2 Delete `ISSUES-2026-11-09-1422.md` once each item is fixed or recorded as out of reach.
