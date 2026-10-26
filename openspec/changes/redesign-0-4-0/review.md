## Agreement

- [x] Each capability of the proposal has a spec: 2 new and 8 modified capabilities, and `ls specs | wc -l` gives `10`.
- [x] Each requirement has a scenario, and `minispec validate redesign-0-4-0 --strict` passes.
- [x] The design covers each requirement: `plugin-architecture` "Capability Modules" D2 and D4, "Kernel Scope" D2, "Event Files" D3 and D4, "Rule Names Key the Hook Evals" D3, "State Owners" D5, "One Parser for Each Fact" D6, "Behavior Stays" D1 and D6, "Architecture Page" D1 step 10. `repo-tooling` "Dev Split" D8, "One Gate Script" D9, "No Unused Tool or Test" D8 and D9, "Generated Schemas" D1 step 9, "Tests Mirror the Modules" D4 and task 5.3. The 8 modified specs change only owners and paths, which D2 maps, and the `setup` delta follows D7.
- [x] No `[NEEDS CLARIFICATION` marker is open.

## PM

- [x] Each goal of `prd.md` has a requirement: G1 "One Parser for Each Fact", G2 "Capability Modules", "Kernel Scope", and "Architecture Page", G3 "State Owners", G4 "Event Files", G5 "No Unused Tool or Test" and "Generated Schemas", G6 "Dev Split", "One Gate Script", and "Tests Mirror the Modules", G7 "Behavior Stays".
- [x] Each requirement traces to a goal. "Rule Names Key the Hook Evals" traces to G4 and G5, and the `setup` delta for `find-docs` traces to G5, because the fold removes the manifests that tests held equal (A4).

## Architect

- [x] `design.md` follows `architecture.md`: A1 in D2 and D4, A2 in D3, A3 in D5, A4 in D7, A5 in D8 and D9, A6 in task 5.3 and D4, A7 in D8, A8 in task 9.1.
- [x] The module order of `architecture.md` has no cycle for each current kernel import of each slice, from the `grep` of 2026-10-25 that D2 names.
- [x] Each migration is named: the move of uncommitted work (task 1.1), the eval keys (D3, task 4.3), the Biome blocks (D4, task 6.2), the `claudetto-docs` users (D7, task 7.2), and the moved recipes (task 8.1).

## QA

- [x] Each scenario can run as a free test: `bun test`, `just typecheck`, `generate --check`, `tools/check.ts`, and the hook lab cover each group. No task needs a paid run.
- [x] Each risky step has a check before and after it: the old caller tests in each task of group 3, the order test of tasks 4.1 to 4.4, and the case counts of tasks 5.3 and 8.3.
- [x] Each error and edge case has a scenario: a deep import, a cycle, a kernel import, a rule outside an event file, a missing eval, a stale eval, shape drift, a string state key, an orphan tool, a test with 0 cases, a hand edit of a generated schema, a test in a module folder, and an old `claudetto-docs` install.

## Gaps

- None open.
- Note for apply: task 1.1 waits for the user, because the work tree holds uncommitted work of other sessions and the user.
- Note for apply: task 8.4 checks the `--reporter=junit` flag on the installed Bun before it uses it (D9).
- Note for apply: the hook eval values stay as measured on the old code. A new measure is a paid run that needs the approval of the user.
