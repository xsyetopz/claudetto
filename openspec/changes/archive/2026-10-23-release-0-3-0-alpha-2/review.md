## Agreement

- [x] Each capability of the proposal has a spec: 15 capabilities, 15 folders in `specs/`, and `reply-bubbles` is gone.
- [x] Each requirement has a scenario, and `minispec validate release-0-3-0-alpha-2 --strict` passes.
- [x] The design covers each spec: D1 and D3 `permission-gate`, D2 `settings-levers`, D4 and D16 `setup`, D11 `session-hygiene`, D5 and D7 `prompt-base`, D6 `agent-roster`, D14 `minispec`, D17 and D18 `release-evidence`, D9 `side-notes`, D10 `claim-grounding`, D19 `session-economy`, D8 `finish`, D7 `text-surfaces`, D15 `status-line`, D12 and D13 `handover`, D20 `setup` "Off or On for Each Item" and "OpenSpec Goes" and `minispec` "Sync without Archive", D21 `setup` "Global Memory File" and `settings-levers` "Built-In Agents Off", D22 `minispec` "Same Result as OpenSpec" and "Next Step", and D7 `text-surfaces` "Run the Free Check".
- [x] D16 (one model, least code), D23 (npm packages), and D24 (pinned levers) are rules of the work with no behavior of their own, so they have tasks (9.3, 9.10, 9.11) and no requirement.
- [x] No `[NEEDS CLARIFICATION` marker is open.

## PM

- [x] Each goal of `prd.md` has a requirement: G1 `permission-gate`, G2 `settings-levers` and `prompt-base`, G3 `side-notes`, G4 and G15 `agent-roster`, G5 `prompt-base`, G6 `setup`, G7 and G11 `session-hygiene`, G8 `release-evidence` and `claim-grounding`, G10 `session-economy` and `handover`, G12 and G13 `finish`, G14 `text-surfaces`, G16 `handover` and `status-line`, G17 `setup` and `release-evidence`, G18 `release-evidence`, G19 `setup` "Global Memory File" and task 9.6, and G20 `minispec` "Same Result as OpenSpec" and "Next Step".
- [x] G9 is gone with the bubbles, and no requirement names it.

## Architect

- [x] `design.md` follows `architecture.md`: A1 in task 1.1, A2 in D1, A3 in D9, A4 in D4, A5 in D4, A6 in task 11.5, A7 in D12, A8 in D16 and D22, A9 in D23, and A10 in D24.
- [x] Each migration is named: the archive of `0-3-0` (task 1.1), the dropped deny rules (task 3.1), `userConfig.plan` and the sensitive key (task 3.5), the ledger file (task 4.2), the option `compaction` (task 6.3), and the removed slices (task 9.3).

## QA

- [x] Each scenario can run as a free test: `bun test` and the hook lab cover groups 2 to 10.
- [x] Each probe comes before the code that needs it: tasks 2.5, 3.2, 3.5, 6.1, 7.4, 9.6 (`cc-inspect`), 9.8 (each parity case fails first), 9.10 (the mod runtime import), 10.3, and 10.8.
- [x] Each D20 choice that waits on a test has one: `Glob`, `EnterWorktree`, and `ExitWorktree` in task 11.8.
- [x] Each paid run is in group 11, after `just docker check`, in the one ask of task 11.3: the eval case of task 7.6 runs in 11.7, and the sandbox measure of task 9.6 is task 11.9.

## Gaps

- None open.
- Note for apply: `research/text-audit.md` comes from task 7.3.
- Note for apply: the path table of D12 starts at `handover` for each case, and task 11.6 sets its final values.
