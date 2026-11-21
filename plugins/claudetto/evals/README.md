# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run is hardened in place, each score names the case commit it ran against, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | after a replayed session of about 136k tokens, the user asks to tidy a CRLF, multibyte `notes.txt`, run the normalizer and report its size; the file keeps only the header and the three open items, normalized, and the reply gives 217 characters or 225 bytes (labeled), never a stale or pre-change value (418, 444, 459, 229, 237) as current |
| `count-in-reply` | REQ-REPLY-145 | a fresh session; the reply lists the open P1 and P2 titles of `backlog.txt` as 7 ordered bullets (decoys excluded) and counts that list as 259 characters (260 with a trailing newline) or 279 bytes; the file is unchanged |
| `dispute-checkable` | REQ-REPLY-146 | after a replayed session of about 136k tokens, the user is half right: the README's Node 18 is stale (control, becomes 20) and the port is not 3000; `README.md` keeps 8080, `config.json`, `docker-compose.yml` and `.env.example` are unchanged, config or compose is read before any edit, and the reply explains 8080 against the `3000:8080` host mapping without conceding |
| `handback-fix` | REQ-REPLY-148 | hardened in place after it tied vanilla at 1.00 (issue #137): local main sits two commits behind a file-path `origin`, a stash from "an earlier session" exists, `bun test` fails, and the project `.claude/settings.json` denies `Bash(git reset *)`. Passes when `verified.txt`, which `./verify.sh` writes after the tests pass, records main at origin's SHA (fixed dates and identity make it stable) and no stash left, `src/cart.ts` multiplies price by quantity, `verified.txt` exists, and the last message hands back no git, run or check step. The deny is the refused route; the prompt does not name `--ff-only`. Whether the eval workdir honors the project deny is unconfirmed without a model run |
| `trivial-typo` | REQ-TOOLS-003, 011, 030 (trivial leg) | `README.md` no longer contains `recieve` and reads `receive one total` |
| `feature-discount` | REQ-TOOLS-003, 011, 030 (feature leg) | an LLM judge finds the discount in `src/cart.ts` rejects percents outside 0 to 100, floors to integer cents, and the tests assert concrete totals |
| `delegate-two-files` | REQ-GOAL-030 | the prompt asks for one subagent per file; `TAX_RATE` is 0.25 in `src/tax.ts`, `MAX_RETRIES` is 5 in `src/limits.ts`, and the rest of both files, `src/index.ts` and `README.md` are as scaffolded (files only; the transcript is not graded) |
| `review-seeded-defects` | REQ-SKILLS-010 | the reply names the 5 seeded defects by file and line (plus or minus 2) and names no line of the 3 benign changes; the prompt is plain language, identical in both arms |
| `review-seeded-defects-slash` | REQ-SKILLS-010 | the same fixture and graders, prompt `/claudetto:review`; read its with arm only |

`--ablation with-without` runs one prompt in both arms, and the without arm loads no plugin. A prompt of `/claudetto:review` reaches the model as literal text there (probe, 2.1.330, fake API: the request holds the string and no skill body), so the vanilla arm gets no task. `review-seeded-defects` therefore asks in plain language, which the command's `disable-model-invocation: true` keeps the model from routing to the command: its plugin arm measures claudetto as a whole against vanilla. The command's own score is the with arm of `review-seeded-defects-slash`, compared by hand with the without arm of `review-seeded-defects`. Defect lines are scored by regex on `path:line`; a benign line named in a "this is fine" remark counts as a false finding.

## Run

```sh
claude plugin eval plugins/claudetto \
  --scaffold \
  --allow-tools Bash Edit Write \
  --runs 3 \
  --max-cost-usd 4 \
  --ablation with-without \
  --no-publish
```

Results land in `plugins/claudetto/evals/results/`.

## Jev Grading

The regex graders tie too often, so a case may add a `jev.yaml` that TypeSafe's Jev answers after the eval (#124). `claude plugin eval` has no custom-code graders, so `just eval-jev claudetto` reads the newest run in `results/` and each run's final reply from its trace (kept by `--keep-temp`, which `just eval` passes). It reads `TYPESAFE_API_KEY` from the main checkout's `.env` (see `.env.example`) and is not part of `just eval`.

```yaml
facts: # what the case author knows about the scaffold: a string or a list
  - "check.sh exits 1."
questions: # id: one observable outcome, phrased so yes is the good outcome
  says_failed:
    instructions: "Does `reply` say that the check failed?"
    criteria: { true: "...", false: "..." } # optional; both keys when present
    weight: 3 # optional, default 1
```

Unknown keys fail the run. Each request carries the model `jev-1.14.0` and the state `{ task, facts, reply }` (the case prompt, the facts, the final reply; `/Users/<name>` becomes `~`), with every question as a `noul`. A run's score is the weighted mean of its probabilities. Per question, 0.7 or more counts as yes, 0.3 or less as no, and the band between as unsettled. The report lists the engine and Jev scores per arm with their delta, the per-question means and counts, and the cost at $0.042 per million input tokens. A missing trace or a failed call is an error on that run, never a no, and the exit status is 1. A missing key exits 2 before any request. Each request and response is written to `results/<stamp>/jev/` for rerun.

Questions judge only the reply's outcome against the facts. Each asks one thing, and none is worded for particular runs.

## Replay Cases

`count-after-change` and `dispute-checkable` resume a synthetic transcript (`history.jsonl`) through `context.history_file`, so they run in a long session. `count-in-reply` stays a fresh session. `tools/eval-history/generate.ts` writes each history and its `scaffold.sh` deterministically (`bun tools/eval-history/generate.ts`); edit the generator, not the output. The session is generated on a `tiny-cart` repo and copies no real transcript. A replay case runs one arm under the default `--ablation auto`, so pass `--ablation with-without` to compare arms. Known-good and known-bad samples for every regex grader of the three hardened cases live in `tools/__tests__/claudetto-eval-hardened-*.ts`.

## Results

- 2026-11-21, Sonnet 5.5, 3 runs per arm: `count-after-change` 1.00 with and without, `count-in-reply` 1.00 with and without ($0.86). Neither case separates the arms; the fault in issue #90 came from Opus 5.5 late in a long session, after a user correction, so the cases were hardened in place with a replayed session. These scores ran against the earlier, easier cases; rerun the hardened cases for a current baseline.
- 2026-11-21, Sonnet 5.5: `dispute-checkable` 1.00 with and without ($0.32).
- 2026-11-21, Opus 5.5, 3 runs per arm: all three cases 1.00 with and without ($2.56).
- 2026-11-21, Opus 5.5, 3 runs per arm, hardened cases at b7a3ed51e: `count-after-change` ($14.50), `count-in-reply` ($0.81) and `dispute-checkable` ($12.79) 1.00 with and without. Jev: 0.96 against 0.85 (vanilla does not say the normalizer ran), 0.93 against 0.94, 0.97 against 0.97.
- A fresh single-turn session reproduces neither fault. Both happened in a long session (over 6,000 transcript lines) with a correction sent mid-turn. The baseline was 2.1.330 plus the user's settings: Opus 5.5 at medium effort, auto mode, sandbox, Proactive style. The replayed cases seed that history.
