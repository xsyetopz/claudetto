## Agreement

- [x] Each capability of the proposal has a spec: the 8 capabilities of `proposal.md` each have a folder in `specs/`.
- [x] Each requirement has a scenario: `bunx @fission-ai/openspec@1.14.3 validate 0-3-0` gives `Change '0-3-0' is valid`.
- [x] The design covers each requirement: D1 to D3 cover `agent-roster`, D4 covers `permission-gate`, D5 and D8 cover `settings-levers` and `prompt-base`, D6 and D7 cover `lean-surface`, D10 covers `minispec`, and `setup` maps to D3 and D5.
- [ ] No `[NEEDS CLARIFICATION` marker is open: `research/replace-matrix.md` has 17 (15 rows, the legend, and the list heading), down from 29 after batch 13, and no other artifact has one.

## PM

- [x] Each goal of `prd.md` has a requirement: goal 1 is `permission-gate`, goal 2 is `agent-roster`, goal 3 is `prompt-base` and `settings-levers`, goal 4 is `lean-surface`, goal 5 is `release-evidence` "Fault Has a Test", and goal 6 is `prompt-base` "Main Agent".
- [x] Each requirement traces to a goal or to a decision of the user that `design.md` quotes.

## Architect

- [x] `design.md` follows `architecture.md`: the guard component, the verdict of `spec`, and goal 1 of `prd.md` now use the bytes test of D4 and MiniSpec of D10.
- [x] Each dependency and migration is named: setup removes the 0.2.0 keys (task 7.3), the parity test needs `@fission-ai/openspec@1.14.3` as a test dependency only (task 8.1), and the change `0-3-0` stays on OpenSpec until MiniSpec lands (D10).

## QA

- [x] Each scenario can run as a test: the stub captures cover the request scenarios, `just lab` covers the hooks, and task 1.4 runs the dialog scenario of `settings-levers` in a terminal against the stub.
- [x] Each error and edge case has a scenario: a gate that throws (`permission-gate` "Gate Fails Closed"), mods off (`permission-gate` "Gate without Mods", `prompt-base` "Base without Mods"), and a lever that stops working (`settings-levers` "Pinned Effect").

## Gaps

- The 15 open rows of `research/replace-matrix.md` need a model that answers: the background requests, `nested_memory`, `edited_text_file`, `queued_command`, the commit texts, and the gated sections.
  The stub answers `done` only, so task 1.1 stays open, and the alpha test measures these rows with `just capture`.
- Batch 13 changed two decisions: a Mod API `command.run` hook answers `/goal`, because a plugin skill cannot replace it, and the Trash rewrite moves from `tool.check` to `tool.call`.
  The rows of `settings-levers` "Snippet from the Matrix" depend on them, so group 1 runs before group 7.
- 5 items of `design.md` are marked proposed: the D1 models and efforts (eval 10.2), the D3 tier names, the Trash rewrite of D4 (probe 1.3), the shell facts in `prompt.context` of D9, and the start cost of a user skill in D10 (probe 1.2).
- Q1 of `design.md` stays open until the alpha test (task 11.1), by design.
