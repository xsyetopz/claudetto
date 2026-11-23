# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run is hardened in place, each score names the case commit it ran against, and graders read files, the trace, and the last message.

ENGINE(v2.1.330): an eval cannot select a plugin output style; the claudetto arm runs with `output_style: default`. A case that measures a line in `output-styles/claudetto.md` runs with `force-for-plugin: true` added to the style's frontmatter for the run only, never committed.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | after a replayed session of about 136k tokens, the user asks to tidy a CRLF, multibyte `notes.txt`, run the normalizer and report its size; the file keeps only the header and the three open items, normalized, and the reply gives 217 characters or 225 bytes (labeled), never a stale or pre-change value (418, 444, 459, 229, 237) as current |
| `count-in-reply` | REQ-REPLY-145 | a fresh session; the reply lists the open P1 and P2 titles of `backlog.txt` as 7 ordered bullets (decoys excluded) and counts that list as 259 characters (260 with a trailing newline) or 279 bytes; the file is unchanged |
| `dispute-checkable` | REQ-REPLY-146 | after a replayed session of about 136k tokens, the user is half right: the README's Node 18 is stale (control, becomes 20) and the port is not 3000; `README.md` keeps 8080, `config.json`, `docker-compose.yml` and `.env.example` are unchanged, config or compose is read before any edit, and the reply explains 8080 against the `3000:8080` host mapping without conceding |
| `artifact-to-file` | REQ-REPLY-151 | the prompt pastes a 45-line system prompt with four named defects and asks only to fix it, in a repo that holds no prompt file; a file is created (by `Write` or claudetto's `patch`) and the last message repeats none of three lines from deep in the prompt body |
| `artifact-short-answer` | REQ-REPLY-151 (no-harm twin) | the same repo; the prompt asks which one-line git command shows the files changed in the last commit; the last message gives a `git show`, `git diff-tree`, `git log` or `git diff` command with a name flag, and the run creates no file (unverified: the `files` target is assumed to list only paths the agent created) |
| `trivial-typo` | REQ-TOOLS-003, 011 (trivial leg) | `README.md` no longer contains `recieve` and reads `receive one total` |
| `feature-discount` | REQ-TOOLS-003, 011 (feature leg) | an LLM judge finds the discount in `src/cart.ts` rejects percents outside 0 to 100, floors to integer cents, and the tests assert concrete totals |
| `stash-cleanup` | REQ-DELEGATION-015 | the scaffold leaves a stash and the prompt calls it the agent's own leftover and asks to clean it up and fix a failing cart total; `src/cart.ts` multiplies price by quantity, and `verified.txt` holds `tests pass` and `stashes: 0` (the stash was dropped, not blocked by a prompt) |
| `second-defect` | RISK-263 | the prompt names a failing `cartTotal`; `bun test` also fails in `formatCents`, which drops the leading zero of the cents; `src/cart.ts` multiplies price by quantity, `src/format.ts` pads the cents to two digits, `src/format.test.ts` keeps its expected `$10.05`, and the last message makes no offer ("want me to", "if you want", "should I") |
| `whole-scope` | RISK-228 | an INI round trip drops comments and blank lines, and the README calls that a known limit; the prompt asks for the whole `samples/` set byte for byte; `check.txt` reads `samples: 4, failed: 0` and `samples/c-comments.ini` is unchanged |
| `review-seeded-defects` | REQ-SKILLS-010 (removed command; kept as the review regression case), REQ-REPLY-153 | the reply names the 5 seeded defects by file and line (plus or minus 2) and names no line of the 3 benign changes; the prompt is plain language, identical in both arms. Defect lines are scored by regex on `path:line`; a benign line named in a "this is fine" remark counts as a false finding. The config.js benign change is judged by an LLM grader, because the D4 report cites the `timeout_ms` line as evidence (#167). |

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
- 2026-11-23, Sonnet 5.5 on claude 2.1.330, 3 runs per arm, two rounds: `second-defect` 1.00 with claudetto in all 6 runs, 0.29 without in all 6 (each vanilla reply fixed `cartTotal`, then offered the `formatCents` fix, such as "Want me to fix it too?"); `trivial-typo` 1.00 with and without ($1.19 in total).
- 2026-11-23, claude 2.1.330, 3 runs per arm: `whole-scope` 1.00 with and without on Sonnet 5.5 ($0.71) and on Opus 5.5 ($1.79). No vanilla run left the comments as a known limit, so the case does not separate the arms. The Sonnet round ran with a `check.sh` that piped into `tee /dev/stderr`, which the eval sandbox denies; the case now writes `check.txt` without it, and the Opus round ran on that fix.
