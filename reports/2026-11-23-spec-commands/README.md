# Commands for claudetto-spec

Three reasons are given for splitting a spec-first loop into separate commands, as Spec Kit, OpenSpec and BMAD do: a review point before any test or code, a command firing every time where a model-invoked skill may not, and a command list showing a new user the workflow. claudetto-spec ships one model-invoked skill. This report measures each claim on claudetto-spec (issue #173). The gate is ADR-0177's: a command ships only if it scores above the single skill on its case.

Setup: Claude Code 2.1.330, `claude-haiku-5-5`, `CLAUDE_CODE_EFFORT_LEVEL=high`, `--ablation none` (plugin arm only), n=3 per case, `--max-cost-usd` on every run. Base commit 8b05e4fa4; the existing cases ran at fe215e6a0. Paid total for this report: $0.49 over 63 runs, grader fixes and reruns included.

## Firing

The skill's description makes the model choose it; typing `/claudetto-spec:spec <request>` expands the skill body into the prompt instead. Each existing case ran twice: plain prompt, then the same prompt behind `/claudetto-spec:spec`. A plain run "fired" when its trace holds a `Skill` call; a typed run holds no `Skill` call (the body arrives with the prompt, and the trace does not record the prompt), so it counts as followed when the trace shows the body's first steps (Glob `specs/*.md`, look for `ARCHITECTURE.md`), which no plain run without a `Skill` call did.

| Case | Plain: fired | Plain score | Typed: followed | Typed score |
| --- | --- | --- | --- | --- |
| `contradiction-pressure` | 0 of 3 | 0.90 (0.86, 0.86, 1.00) | 3 of 3 | 1.00 |
| `contradiction-implicit` | 3 of 3 | 0.79 (0.36, 1.00, 1.00) | 3 of 3 | 1.00 |
| `feature-discount` | 3 of 3 | 0.90 (0.69, 1.00, 1.00) | 3 of 3 | 0.90 (0.69, 1.00, 1.00) |

The claim holds on Haiku: under deadline pressure the plain prompt never loaded the skill, and the typed form always did. The typed form already exists (`/claudetto-spec:spec`, from the skill's default user invocability), so no new command is needed for it; the README now names it. The `contradiction-implicit` 0.36 run fired the skill and still edited the spec, test and code, so firing is necessary, not sufficient. The 0.69 runs in both `feature-discount` arms wrote `src/cart.ts` before staging the tests.

## Review Point

Two commands were built as `commands/*.md` with `disable-model-invocation: true`: `/claudetto-spec:specify <request>` (clarify and spec, then stop with the IDs and a pointer to the next command) and `/claudetto-spec:implement [IDs]` (red, green, check from the spec as it is now). Their text is below. Both appear in the `/` menu and add 0 always-on request bytes (fake-API capture: 49,184 bytes with and without them).

Each path was measured as two turns. The single-skill path is `feature-discount` (turn 1), then a reviewer edits the spec of the committed result and asks for it to be matched (`spec-edit-skill`, `spec-fix-skill`). The command path is `specify-discount` (turn 1, `/claudetto-spec:specify`), then the reviewer edits the spec before any test or code and types `/claudetto-spec:implement` (`spec-edit-command`, `spec-fix-command`). Turn 2 replays turn 1 as history; both paths end at the same spec bytes and are graded by the same graders (tests cite the IDs and pass at the end, the edited behaviour is tested, the spec is kept).

| Edit | Path | Turn 1 | Turn 2 | Score (turn 2) | Cost, both turns | Turns, both |
| --- | --- | --- | --- | --- | --- | --- |
| Add DISC-2 (cap at 50 %) | skill | $0.0093 | $0.0073 | 1.00 | $0.0166 | 27.3 |
| Add DISC-2 (cap at 50 %) | commands | $0.0078 | $0.0098 | 1.00 | $0.0176 | 24.4 |
| Change DISC-1 (round to nearest) | skill | $0.0093 | $0.0083 | 1.00 | $0.0176 | 29.3 |
| Change DISC-1 (round to nearest) | commands | $0.0078 | $0.0087 | 1.00 | $0.0165 | 22.4 |

`specify-discount` stopped before any test or code in 3 of 3 runs (1.00). `implement-conflict`, a no-harm check where DISC-1 and DISC-3 give different totals for one input, stopped and named both IDs in 3 of 3 runs (1.00).

The paths tie on outcome and cost (within 7 %); the command path takes 3 to 7 fewer turns. The commands do not score above the single skill, so by the gate they do not ship: the commands and their cases (`specify-discount`, `spec-edit-command`, `spec-fix-command`, `implement-conflict`) are deleted, and `spec-edit-skill` and `spec-fix-skill` stay as mid-loop spec-edit regression cases. These cases also do not separate the paths: both reach 1.00. What a review point gives a human, reading a spec before code exists, is not an outcome a single-run grader can score.

Fixes found on the way, each by trace inspection: `implement` first stopped on DISC-2 as a "contradiction" of DISC-1's 0 to 100 range (0.61), fixed by saying that a narrower requirement governs the inputs it names; the change-rounding fixture first used 999 at 10 %, where rounding down and to the nearest cent agree (899.1), and was moved to 995 (895.5); and two source-pattern graders missed correct code (a cap held in a constant, integer half-up rounding) and were widened or removed for the behavioural graders that already covered them.

## Discoverability

With the commands, typing `/claudetto-spec:` in an interactive 2.1.330 session lists three entries, each with its description: `spec`, `specify`, `implement`. Without them it lists `spec`. Request bytes are unchanged either way. Whether a listing teaches a new user the workflow is a human outcome these evals do not measure; it is unmeasured, not refuted.

## Command Text

The removed commands, for a future case that separates the paths.

`commands/specify.md`:

```markdown
---
description: Write or update the spec for a behaviour change, then stop for review before any test or code.
argument-hint: <request>
disable-model-invocation: true
---

# Specify

Request: $ARGUMENTS

Formats: the `spec` skill's `references/FORMAT.md`. Glob `specs/*.md` first and read the specs the request touches.

## Clarify

- Read `ARCHITECTURE.md` or `DESIGN.md` at the repo root, if present. Never create a constitution file.
- Interactive session: ask each expensive unknown through AskUserQuestion.
- No one to answer (non-interactive `-p` run): write each unknown as an `Open:` line in the spec, also when you take a cheap default.

## Spec

- Edit the capability's existing `specs/<capability>.md`, or add one. Never create a proposal, plan or tasks file.
- Per requirement: `## <ID> <title>` (`[A-Z][A-Z0-9]*-\d+`, such as `CART-1`), one sentence of behaviour, at most 3 scenarios of `Given`/`When`/`Then`/`And` lines.

## Stop

- Write no tests and no implementation in this turn.
- Reply with the spec path, each new or changed requirement ID with its sentence, and each `Open:` line.
- End with: review or edit the spec, then run `/claudetto-spec:implement`.
```

`commands/implement.md`:

```markdown
---
description: Implement the reviewed spec: failing tests citing requirement IDs, then code, then spec_check and the test run.
argument-hint: "[requirement IDs or note]"
disable-model-invocation: true
---

# Implement

Scope: $ARGUMENTS (empty: every requirement in `specs/` without a test citing its ID).

Read the specs in `specs/*.md` as they are now; the user may have edited them since they were written. The spec is the source of truth: implement it as written.

## Red

1. Write tests in the project's own framework; cite the requirement ID in the test name.
2. Run them and see them fail.
3. `git add` the test files before writing implementation.

## Green

- Implement without editing staged tests or the spec.
- A requirement that narrows another (a cap, a limit, an exception) governs the inputs it names; the broader one covers the rest. This is the usual shape of a reviewer's edit, not a conflict.
- If no implementation can satisfy two requirements, or a staged test cannot pass honestly, change nothing: stop and report the conflict naming the requirement IDs.

## Check

- Load `spec_check` through ToolSearch (deferred) and call it.
- Run the project's test command.
- Report both results.
```
