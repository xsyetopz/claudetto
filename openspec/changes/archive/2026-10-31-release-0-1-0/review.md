## Agreement

- [x] Each capability of the proposal has a spec: 7 new and 4 modified, 11 files under `specs/`.
- [x] Each requirement has a scenario.
- [x] The design covers each requirement: setup, OpenSpec, status line, version floor, hygiene, finish, agents, docs lookup, auto mode, surfaces, version.
- [x] No `[NEEDS CLARIFICATION` marker is open (`grep` of the change returns none).

## PM

- [x] Each goal of `prd.md` has a requirement: G1 `tier-profiles` and `surface-trim`, G2 `openspec-init`, G3 `status-line`, G4 `session-hygiene`, `finish-loop`, `research-agent`, `docs-lookup`, G5 `version-floor`, G6 `prompt-footprint`, G7 the specs name only approved removals, G8 `low-hitl`.
- [x] Each requirement traces to a goal or a decision of `decisions.md`.

## Architect

- [x] `design.md` follows `architecture.md`: setup writes `settings.json` only (A2), the floor has two parts (A3), init needs the CLI (A4), nothing Jev-first is wired before the reading (A5), the status line is rebuilt (A6), and the trim is read for free first (A7).
- [x] Each dependency and migration is named: the `openspec` CLI, Context7, the mod API version source (task 4.1). No migration from an old install (non-goal).

## QA

- [x] Each scenario can run as a test: unit tests, the hook lab, `just capture`, or `just eval`.
- [x] Each error and edge case has a scenario: missing CLI, user values kept, bad status line input, unlisted hygiene path, a looping finish, a classifier error in arm C.

## Gaps

- The source of the running version in the mod API is unread (task 4.1). The design names a fallback.
- The `openspec` CLI is not on this machine's `PATH`, so scenario "CLI Present" runs against a stub until it is installed.
- The paid A/B (task 9.3) waits for the user's approval with its price.
