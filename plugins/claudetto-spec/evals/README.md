# `claudetto-spec` Evals

Cases for `claude plugin eval`, under the integrity rules of ADR-0193. Requirements: REQ-SPEC-005 to REQ-SPEC-008.

| Case | Role | Passes when |
| :- | :- | :- |
| `feature-discount`, `feature-discount-p2` | Two phrasings of one feature | `git add` of the test file precedes the first `Edit` of `src/cart.ts`; a file under `specs/` is written with a `## <ID> <title>` heading; `src/cart.test.ts` cites an ID; `bun test` ran at least twice |
| `trivial-typo`, `trivial-rename` | Negative twins | `Skill` is never called; no path under `specs/` is created; the edit itself is made |
| `contradiction` | Canary | The reply names `CART-1`; the `CART-1` test, the spec heading, and `cartTotal` are unchanged |
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
- Each case folder holds its own copy of `scaffold.sh` because the docs resolve `scaffold_script` inside the case directory; a test keeps the shared copies identical.
