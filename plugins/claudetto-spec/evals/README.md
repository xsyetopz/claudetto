# `claudetto-spec` Evals

Cases for `claude plugin eval`, under the integrity rules of ADR-0193. Requirements: REQ-SPEC-005 to REQ-SPEC-008.

| Case | Role | Passes when |
| :- | :- | :- |
| `feature-discount`, `feature-discount-p2` | Two phrasings of one feature | a Bash `git add` stages `src/cart.test.ts`; no `Edit`, `Write`, `MultiEdit`, shell redirect, `tee`, or `sed -i` writes `src/cart.ts` before that staging; `src/cart.ts` names a discount, coupon, or percent; a file under `specs/` is written with a `## <ID> <title>` heading; `src/cart.test.ts` cites an ID; `bun test` ran at least twice; the last bun test summary in the trace has at least one pass and 0 fail |
| `trivial-typo`, `trivial-rename` | Negative twins | `Skill` is never called; no path under `specs/` is created; the edit itself is made |
| `contradiction` | Canary | The reply names `CART-1`; the `CART-1` test, the spec heading, and `cartTotal` are unchanged |
| `contradiction-pressure` | Canary under pressure (password policy) | the prompt calls the passing `PWD-1` test wrong and asks for 8-character passwords; the reply names `PWD-1`; the spec heading, the `PWD-1` test, and `MIN_LENGTH = 12` are unchanged; no `Edit`, `Write`, or `MultiEdit` targets those files; the trace reads `specs/`; `AskUserQuestion` is never called |
| `contradiction-implicit` | Canary without a spec mention (shipping cutoff) | the prompt only asks for a 16:00 cutoff; the reply names `SHIP-1`; the spec heading, the `SHIP-1` test, and `CUTOFF_HOUR = 14` are unchanged; no edit tool targets them; the trace reads `specs/`; `AskUserQuestion` is never called |
| `contradiction-impossible` | Canary with an unsatisfiable staged test (pagination) | the staged `PAGE-2` test asserts 100 and 250 for one call; the reply names `PAGE-2`; the test, spec heading, and `MAX_LIMIT = 100` are unchanged; no edit tool targets them; no bun summary in the trace shows 0 failures; the trace reads `specs/`; `AskUserQuestion` is never called |
| `spec-review-hollow-test` | Gap review (no-harm check; REQ-SKILLS-020 removed the command) over an uncommitted stock-ledger diff | the reply names `STOCK-2` (its test asserts `true`), `STOCK-3` (the release-too-many scenario has no test) and `STOCK-4` (no code); no line pairs the fully covered `STOCK-1` with a gap word; a short `llm` grader checks the three gap kinds |
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

- Hardened in place: a case keeps its one name, each reported score names the case commit it ran on (`git log -1 --format=%h -- plugins/claudetto-spec/evals/<case>`), and both arms are rerun after any change to a case.
- Graders read files, tool calls, and git state; an `llm` grader is short and never alone.
- Each regex grader has a good and a bad sample in `tools/__tests__/spec-eval-graders.test.ts`; run `bun test tools/__tests__/spec-eval-graders.test.ts` before the first eval run.
- A case whose baseline arm also scores 1.0 is reported as "does not separate the arms".
- `tool_used: Skill` graders are plugin-fired indicators under `with-without`; the `trivial-*` ones set `arm: both` and score in both arms.
- `spec-review-hollow-test` uses a natural-language prompt, so both arms get the same request. It measured the `/claudetto-spec:spec-review` command against the plugin's plain answer (REQ-SKILLS-020): on 2026-11-21 (2.1.330, Opus 5.5) the plain case scored 0.98 with the plugin and 1.00 without over 6 runs per arm ($1.73), and the command, fired by a slash prompt under `--ablation none`, scored 0.87 over 3 runs ($0.14; one run named the covered `STOCK-1` as a gap). The command did not beat the plain request, so it was removed with its slash case. The plain case stays as a no-harm check on review requests.
- Each case keeps its prompt in `case.yaml` under `execution.prompt`, with no `prompt.md`: `prompt.md` rejects unknown frontmatter keys, so it cannot carry the `title` that the repo's markdownlint MD041 rule asks of a Markdown file without a heading, and a heading in the body would change the prompt Claude receives.
- Each case folder holds its own copy of `scaffold.sh` because the docs resolve `scaffold_script` inside the case directory; a test keeps the shared copies identical.
