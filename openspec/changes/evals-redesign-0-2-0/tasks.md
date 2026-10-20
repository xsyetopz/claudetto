# Tasks

## 1. Diagnose

- [x] 1.1 Find the cause of the negative gaps of `missing-tool-is-a-step` (-0.47) and `scope-followup` (-0.18) in the kept traces of the hard run.

- [x] 1.2 Apply the rule changes that the user chose (2026-10-20): a fallback tool when the install of a missing tool cannot run (`doing-tasks.md`, `blocks.md`), and a different defect that was there before the task stays out of scope (`doing-tasks.md`).

## 2. Sets

- [x] 2.1 Restore the 11 cases of `a21b2ae1` as the `baseline` set, rename the hard cases to `<name>-hard` as the `rule-aware` set, and tag each case with `set:<name>`.
- [x] 2.2 Add a reference run and a no-op run check for each case, next to the bad runs.
- [x] 2.3 Write the `blind` cases from behavior descriptions only, in a folder outside the repository, with no access to the plugin.
- [x] 2.4 Write the `control` cases, where the plugin must not change the result.
- [x] 2.5 Review the `blind` and `control` cases: the reference run passes, the no-op run fails, and no grader is brittle.

- [x] 2.6 Anchor each `Bash` `input_match` of each case to the `command` field, because the `description` field of a real call also matches, and add a case check for it.

## 3. Statistics

- [x] 3.1 Add `tools/stats.ts` and `just eval-stats`: pass counts, Fisher exact p, and a Newcombe CI for each case, a bootstrap CI over the cases of each set, and the agreement of the judge votes.

## 4. Runs and Evidence

- [x] 4.1 Ask the user, with the cost, and run the `baseline`, `blind`, and `control` sets on Claude Code 2.1.304 at 10 runs for each arm (paid). Run the `rule-aware` set again too, because `0a213a22` changed the prompt after its run, and that change was tuned on it, so only the `blind` set measures the change without bias. Each eval runs on 2.1.304 only (the user, 2026-10-20).
- [x] 4.2 Write the evidence page with each set apart and with CIs, and mark the `rule-aware` results as biased by the method and as "tuned on" for `0a213a22`. Base each claim on the `blind` and `control` sets that ran after `0a213a22`. State the limit of the `blind` set: the author saw no plugin text (claudetto was not loaded in the session, only `--plugin-dir ~/.claude/mods/handoff`, and `Concise` is a built-in style of Claude Code 2.1.304), but the one-line behavior descriptions came from the main agent, which knows the rules.
- [ ] 4.3 Grade the kept traces of the published runs again offline, with the graders before and after `d84afa12`, and count the verdicts that flip. Result (2026-10-20): 0 of 504 `Bash` grader verdicts of the published runs flip, and the offline grade agrees with the engine in 504 of 504 (`/tmp/regrade-scratch/regrade.ts`). The 0.1.0 `styles` cases have no kept results, so they stay unchecked. The evidence page states this, and it marks no published number as superseded for this cause.
- [ ] 4.4 Give the judge `report-says-nothing-broken` of `false-alarm-sum` a rubric with no overlap ("could not find a cause" and the tests pass is a pass), record the reasons of the judges if the engine allows it, and rerun the case (paid, ask the user first).
