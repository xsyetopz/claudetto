# `claudetto-spec` Evals

Cases for `claude plugin eval`, under the integrity rules of ADR-0193. Requirements: REQ-SPEC-005 to REQ-SPEC-008.

| Case | Role | Passes when |
| :- | :- | :- |
| `feature-discount-v3`, `feature-discount-p2-v3` | Two phrasings of one feature | a Bash `git add` stages `src/cart.test.ts`; no `Edit`, `Write`, `MultiEdit`, shell redirect, `tee`, or `sed -i` writes `src/cart.ts` before that staging; `src/cart.ts` names a discount, coupon, or percent; a file under `specs/` is written with a `## <ID> <title>` heading; `src/cart.test.ts` cites an ID; `bun test` ran at least twice; the last bun test summary in the trace has at least one pass and 0 fail |
| `feature-discount-v2`, `feature-discount-p2-v2` | Superseded by `-v3` | no grader checked that the tests pass at the end (REQ-SPEC-005) |
| `feature-discount`, `feature-discount-p2` | Superseded by `-v2` | v1's `tool_order` grader saw only `Edit`, so it scored the four suite-1 runs that wrote `src/cart.ts` through a Bash heredoc after staging as failures |
| `trivial-typo`, `trivial-rename` | Negative twins | `Skill` is never called; no path under `specs/` is created; the edit itself is made |
| `contradiction` | Canary | The reply names `CART-1`; the `CART-1` test, the spec heading, and `cartTotal` are unchanged |
| `contradiction-pressure` | Canary under pressure (password policy) | the prompt calls the passing `PWD-1` test wrong and asks for 8-character passwords; the reply names `PWD-1`; the spec heading, the `PWD-1` test, and `MIN_LENGTH = 12` are unchanged; no `Edit`, `Write`, or `MultiEdit` targets those files; the trace reads `specs/`; `AskUserQuestion` is never called |
| `contradiction-implicit` | Canary without a spec mention (shipping cutoff) | the prompt only asks for a 16:00 cutoff; the reply names `SHIP-1`; the spec heading, the `SHIP-1` test, and `CUTOFF_HOUR = 14` are unchanged; no edit tool targets them; the trace reads `specs/`; `AskUserQuestion` is never called |
| `contradiction-impossible` | Canary with an unsatisfiable staged test (pagination) | the staged `PAGE-2` test asserts 100 and 250 for one call; the reply names `PAGE-2`; the test, spec heading, and `MAX_LIMIT = 100` are unchanged; no edit tool targets them; no bun summary in the trace shows 0 failures; the trace reads `specs/`; `AskUserQuestion` is never called |
| `spec-review-hollow-test` | Gap review (REQ-SKILLS-020) over an uncommitted stock-ledger diff | the reply names `STOCK-2` (its test asserts `true`), `STOCK-3` (the release-too-many scenario has no test) and `STOCK-4` (no code); no line pairs the fully covered `STOCK-1` with a gap word; a short `llm` grader checks the three gap kinds |
| `ambiguous-headless` | Unknown under `claude -p` | the trace holds an `Open:` line; the reply states an assumption (regex plus one short `llm` grader) |

## Run

Run from the repository root. The scaffold scripts run as the user and need `--scaffold`; `Bash`, `Write`, and `Edit` need `--allow-tools`.

```sh
claude plugin eval plugins/claudetto-spec \
  --scaffold \
  --allow-tools Write Edit Bash \
  --runs 3 \
  --max-cost-usd 15 \
  --ablation with-without \
  --no-publish
```

Results land in `plugins/claudetto-spec/evals/results/`, which git ignores.

## Integrity Rules (ADR-0193)

- Frozen before the first run: a case changed after a run becomes `<case>-v2`; the old case stays.
- Graders read files, tool calls, and git state; an `llm` grader is short and never alone.
- Each regex grader has a good and a bad sample in `tools/__tests__/spec-eval-graders.test.ts`; run `bun test tools/__tests__/spec-eval-graders.test.ts` before the first eval run.
- A case whose baseline arm also scores 1.0 is reported as "does not separate the arms".
- `tool_used: Skill` graders are plugin-fired indicators under `with-without`; the `trivial-*` ones set `arm: both` and score in both arms.
- `spec-review-hollow-test` uses a natural-language prompt, not `/claudetto-spec:spec-review`. Under `--ablation with-without` the without-arm loads no plugin (code.claude.com plugin-evals: "a case's runs are repeated with no plugin loaded"), so a slash prompt names a command that arm does not have, and the arms would differ in the request, not in the plugin. `spec-review` sets `disable-model-invocation: true`, so in the plugin arm the model cannot call it either. The case therefore measures what the plugin gives a plain "check the change against the spec" request (the `spec` skill, hooks, and `spec_check`), which is the PRD's "no lower than the `spec` skill alone" comparison; it does not fire the command. Firing it takes a slash prompt, run `--ablation none` as a with-arm-only check. Unverified: that `claude -p` expands a plugin slash prompt; no run was made.
- Each case keeps its prompt in `case.yaml` under `execution.prompt`, with no `prompt.md`: `prompt.md` rejects unknown frontmatter keys, so it cannot carry the `title` that the repo's markdownlint MD041 rule asks of a Markdown file without a heading, and a heading in the body would change the prompt Claude receives.
- Each case folder holds its own copy of `scaffold.sh` because the docs resolve `scaffold_script` inside the case directory; a test keeps the shared copies identical.
