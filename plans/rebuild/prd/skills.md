# Skills, Commands and Agents Requirements

claudetto and claudetto-spec ship a small set of skills, commands and agents, because each description sits in every request's listing and the studies in reports/2026-11-21-research/skills-catalog.md find that focused skills beat large bundles and that loaded skills cause failures of their own (307 in one study). An item ships only with an eval case that runs it against vanilla Claude Code 2.1.330 and scores no lower (ADR-0177). The catalog read 15 sources (plans/rebuild/sources.md) and 28 candidates; none reports a measured outcome for a listed skill or agent, so the set below is the catalog's recommendation and each new item starts as "eval first".

The user's settings bound the design: `skillListingMaxDescChars: 60` cuts each listed description at 60 characters, so the trigger sits in those characters; `disableBundledSkills: true` turns off the bundled `/code-review` and `/simplify` and leaves plugin skills listed.

## Set

| Plugin | Item | Kind | State |
| --- | --- | --- | --- |
| claudetto | Artemis | agent | exists |
| claudetto | Athena | agent | exists |
| claudetto | Heracles | agent | exists |
| claudetto | review | user command, forked | eval first (REQ-SKILLS-010) |
| claudetto-spec | spec | skill | exists |
| claudetto-spec | spec-review | user command, forked | eval first (REQ-SKILLS-020) |

Watchlist, not built: `audit-instructions` (bundled `/doctor prompt-audit` covers it), `simplify` (folds into `review` if its eval shows a gap), `bugfix` (an extension of `spec`'s description, measured first). Rejected items and the reasons are in the catalog, sections 4 and 5.

## Engine

- [ ] **REQ-SKILLS-001** The two questions the catalog left open shall be probed on 2.1.330 before either command is built: whether a plugin skill's `agent:` field resolves a plugin agent (`claudetto:Athena`), and whether a `disable-model-invocation: true` skill adds a line to the model's skill listing.
  Acceptance: each answer comes from a fake-API capture or a cc-inspect `code` read, with the request bytes of the listing with and without the command. Verification: probe.

## Core Plugin

- [ ] **REQ-SKILLS-010** claudetto shall ship `/claudetto:review`, a user-invoked command that reviews the working diff in a forked context for defects only (no style), returns findings as `path:line` with the failing input, and edits nothing.
  Acceptance: an eval case `review-seeded-defects` (a fixture diff with 5 seeded defects and 3 benign changes, outcome-only grader on defects named with file and line) scores recall no lower and false findings no higher than vanilla asked to "review the diff", n=3 per arm, `--no-publish` and a cost cap; the description's first 60 characters name the trigger. If the arms tie, the command is removed. Verification: eval.

## Spec Plugin

- [ ] **REQ-SKILLS-020** claudetto-spec shall ship `/claudetto-spec:spec-review`, a user-invoked command that compares the diff with `specs/*.md` and names, by requirement ID, each requirement with no implementing code, each listed scenario with no test, and each test that cites an ID but asserts nothing the requirement states.
  Acceptance: an eval case `spec-review-hollow-test` (3 requirements: one test cites its ID and asserts `true`, one scenario has no test, one requirement is unimplemented; outcome-only grader on the three IDs named) passes in the plugin arm and scores no lower than the `spec` skill alone, n=3 per arm, `--no-publish` and a cost cap. If the arms tie, the command is removed. Verification: eval.
  Status: built, eval pending. The command is `plugins/claudetto-spec/skills/spec-review/SKILL.md`; the case has 4 requirements (a fully covered `STOCK-1` is a negative control) and a natural-language prompt, so both arms get the same request and the case does not fire the command (see `plugins/claudetto-spec/evals/README.md`).
