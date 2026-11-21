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

- [x] **REQ-SKILLS-001** The two questions the catalog left open shall be probed on 2.1.330 before either command is built: whether a plugin skill's `agent:` field resolves a plugin agent (`claudetto:Athena`), and whether a `disable-model-invocation: true` skill adds a line to the model's skill listing.
  Acceptance: each answer comes from a fake-API capture or a cc-inspect `code` read, with the request bytes of the listing with and without the command. Verification: probe.
  Status: done (2026-11-21, 2.1.330). `agent: claudetto:Athena` resolves under `context: fork`; a `disable-model-invocation: true` skill adds no listing line.
  Verified: PASS: probe in reports/2026-11-21-skills/README.md: the fork's request carries Athena's prompt and its 3 tools (`Read`, `Grep`, `Glob`); the skill listing is 5,889 bytes with and without the command, and 5,979 (+90) for the same skill without `disable-model-invocation`. Not exercised: a fork's tool use and reply against a real model, which the eval covers.

## Core Plugin

- [ ] **REQ-SKILLS-010** claudetto shall ship `/claudetto:review`, a user-invoked command that reviews the working diff in a forked context for defects only (no style), returns findings as `path:line` with the failing input, and edits nothing.
  Acceptance: an eval case `review-seeded-defects` (a fixture diff with 5 seeded defects and 3 benign changes, outcome-only grader on defects named with file and line) scores recall no lower and false findings no higher than vanilla asked to "review the diff", n=3 per arm, `--no-publish` and a cost cap; the description's first 60 characters name the trigger. If the arms tie, the command is removed. Verification: eval.
  Status: blocked (2026-11-21, 2.1.330, Opus 5.5). The plain-prompt case `review-seeded-defects` ties, n=3 per arm: with 0.75, without 0.75 (both arms name the benign `b2-false-config` change), $1.09. The command case `review-seeded-defects-slash` (`--ablation none`) made no model call in any of 4 runs: the skill's `` !`git diff HEAD` `` injection failed with `sandbox-exec: sandbox_apply: Operation not permitted`, because the eval's OS sandbox for shell commands cannot start inside this session's own Seatbelt sandbox (trace `/private/tmp/e-5dje7f/out/trace.jsonl`, 0 turns, $0.00). The command's score needs a run outside a sandboxed session: `claude plugin eval plugins/claudetto --case review-seeded-defects-slash --scaffold --allow-tools Bash --runs 3 --ablation none --no-publish --max-cost-usd 3 --model claude-opus-5-5`, compared with the plain case's without arm (0.75).

## Spec Plugin

- [x] **REQ-SKILLS-020** claudetto-spec shall ship `/claudetto-spec:spec-review`, a user-invoked command that compares the diff with `specs/*.md` and names, by requirement ID, each requirement with no implementing code, each listed scenario with no test, and each test that cites an ID but asserts nothing the requirement states.
  Acceptance: an eval case `spec-review-hollow-test` (3 requirements: one test cites its ID and asserts `true`, one scenario has no test, one requirement is unimplemented; outcome-only grader on the three IDs named) passes in the plugin arm and scores no lower than the `spec` skill alone, n=3 per arm, `--no-publish` and a cost cap. If the arms tie, the command is removed. Verification: eval.
  Status: removed by its acceptance rule (2026-11-21, 2.1.330, Opus 5.5). The plain-prompt case `spec-review-hollow-test` scored 0.98 with the plugin (5.9 of 6) and 1.00 without over two n=3 runs ($0.87 and $0.86); the command case, a slash prompt under `--ablation none`, scored 0.87 over 3 runs (1.0, 1.0, 0.6; the 0.6 run named the covered `STOCK-1` as a gap; $0.14). The command did not score above the plain request, so `skills/spec-review/` and the `spec-review-command` case are deleted; the plain case stays as a no-harm check.
  Verified: PASS: `plugins/claudetto-spec/evals/results/2026-11-21T03-02-48-497Z`, `2026-11-21T03-06-41-579Z` and `2026-11-21T03-05-17-766Z` (`aggregate-result.json`, local, gitignored).
