# Tasks

> This change starts after the tag `claudetto--v0.2.0`.
> The data for each task is in `evidence.md`.
> Mark a task done only after its check ran and passed.
> Ask the user before each paid run, and give the expected cost and the weekly share with the question.

## 1. Docs

- [x] 1.1 Write the sizes of the spec profiles into `src/wiki/claudetto/slices/Spec.md` from `evidence.md`, section "Spec Profile Sizes".
  Say that the sizes are bytes.
  Check: `just generate && just test tests/tools`
- [x] 1.2 Write the `ground` replay numbers into the section "Replay" of `src/wiki/claudetto/slices/Ground.md` from `evidence.md`, section "Ground Replay".
  Check: `just generate && bun run lint:md`
- [ ] 1.3 Measure the false-deny rate of `ground` again on real plan edits, when the transcripts hold plan edits.
  The local run of 2026-10-18 checked 0 events with the shipped filter.
  Replay with `replay.ts` and `check.ts` as `evidence.md` describes.
  Mark the run paid if it calls a model, and ask the user first.
  Check: the new numbers are in `Ground.md`.
- [x] 1.4 Check that `src/wiki/claudetto/slices/Goal.md` covers the wiki page of the goal slice that `builtins-0-2-0` task 2.1 deferred (step 7), and add what is missing.
  Check: `just generate && bun run lint:md`

## 2. Prompts

- [x] 2.1 Stop giving token counts to the model in `src/plugins/claudetto/slices/advise/prompts/result.md`, and move the count to `$.ui.log` (row `advise/prompts/result.md:1` of `evidence.md`).
  Check: `just test tests/claudetto/advise tests/claudetto/prompt`
- [x] 2.2 Pin the version of `@fission-ai/openspec` in `src/plugins/claudetto/slices/spec/skills/spec/SKILL.md` (the three `bunx @fission-ai/openspec` commands of the section "Setup"), to the version of `package.json` (`1.14.3`).
  Give the reason for "Never overwrite a file." in the same pass.
  Check: `just test tests/claudetto/prompt tests/claudetto/spec`
- [ ] 2.3 Eval the three items that the audit marked "flag only": `doing-tasks.md:4-5`, `Concise.md:16`, and `system.md:3-4`.
  Paid: ask the user first.
  Use the rules of the spec `evals` (at least 10 runs for each arm).
  Check: the evidence page of the eval states the result for each item.
- [x] 2.4 Audit the `schema.yaml` and the templates of the `epic` and `task` presets, except `epic/templates/review.md`, against the checklist of the audit.
  Check: `just test tests/claudetto/prompt`

## 3. Sandbox

- [x] 3.1 Add the Linux fallback of `docker *` as an `excludedCommands` entry, with an allow rule, because Claude Code ignores `allowUnixSockets` on Linux.
  Check: `just test tests/claudetto/setup tests/claudetto/prompt`
- [x] 3.2 Document for users, in `src/wiki/`, the accepted risk that with the Docker socket open a sandboxed process can skip the `permissions.ask` rules of `docker-ask.ts`.
  Check: `just generate && bun run lint:md`
- [x] 3.3 Make `guard` ask the person (`decider: "person"`) through `tool.check` before a `docker` command that runs or creates a container, also with global options before the verb (`docker -H x run`) and inside wrappers.
  The `DOCKER_ASK` rules of `docker-ask.ts` match only `docker run` and the other verbs at the start, and on Linux `Bash(docker *)` allows the rest outside the sandbox (the user, 2026-10-21: "Guard check, like refspec").
  Update the accepted risk in `src/wiki/claudetto/slices/Setup.md`.
  Check: `just test tests/claudetto/guard tests/claudetto/setup && just lab`

## 4. Guard

- [x] 4.1 Claude Code 2.1.304 warns on the inner `:*` of the rule `Bash(git push* :* *)`, and `guard` has no rule for a delete refspec.
  Add a `guard` rule for `git push <remote> :<branch>`, or rewrite the ask rule so that it gives no warning.
  Test with the corpus of safe and destructive forms.
  Check: `just test tests/claudetto/guard tests/claudetto/prompt`

## 5. Paid Evals

Ask the user before each run.

- [ ] 5.1 Compare `advise` with the built-in advisor on the same tasks.
  Change the default of the `advisor` option only if `advise` is as good or better.
- [ ] 5.2 Compare the goal engine with the built-in `/goal`.
- [ ] 5.3 Run more cases for the lower cases of the eval gate of 0.2.0 (3 runs for each arm, and the floor is 10), and write the result to `src/wiki/claudetto/evidence/Evals-2.1.304.md`.
- [ ] 5.4 Grade the 0.1.0 `styles` cases again, when results exist.
  The published runs have no kept results for them.

## 6. Goal

- [x] 6.1 Reject a `--until` time that is not after now in `parseArgs` of `src/plugins/claudetto/slices/goal/domain/command.ts`.
  A full date or a date and time in the past now passes, and the goal stops at the first turn.
  `HH:MM` already moves to the next day, so it keeps that behaviour.
  Update the section of `--until` in `src/wiki/claudetto/slices/Goal.md`.
  Check: `just test tests/claudetto/goal && just generate`
- [x] 6.2 Make `/goal resume` reset a `--budget N%` goal, as it resets the turns and the cost.
  The loop compares the percent of the whole session with the budget, so a goal that paused at its budget stops again at once.
  Keep the percent at the start or the resume in the goal state, and compare the growth since then with the budget.
  Update the section of `--budget` in `src/wiki/claudetto/slices/Goal.md`.
  Check: `just test tests/claudetto/goal && just generate`
