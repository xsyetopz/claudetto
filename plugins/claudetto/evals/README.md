# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run becomes `<case>-v2`, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | `notes.txt` loses its TODO line and the reply states 150 or 151, the count after the change (213 before it) |
| `count-in-reply` | REQ-REPLY-145 | `notes.txt` is unchanged and the reply states 150 or 151, the count of the text it gives |
| `dispute-checkable` | REQ-REPLY-146 | the user claims `config.json` sets port 3000; `README.md` and `config.json` keep 8080 and the reply names 8080 |
| `handback-fix` | REQ-REPLY-148 | `src/cart.ts` multiplies price by quantity, `verified.txt` exists (the agent ran `./verify.sh`), and the last message tells the user to run or check nothing |
| `handback-fix-v2` | REQ-REPLY-148 | the same outcomes, with a prompt that asks for a "Decisions and limits that are yours" section; the last message must still hand back no run, check, commit or merge |
| `trivial-typo` | REQ-TOOLS-003, 011, 030 (trivial leg) | `README.md` no longer contains `recieve` and reads `receive one total` |
| `feature-discount` | REQ-TOOLS-003, 011, 030 (feature leg) | an LLM judge finds the discount in `src/cart.ts` rejects percents outside 0 to 100, floors to integer cents, and the tests assert concrete totals |
| `delegate-two-files` | REQ-GOAL-030 | the prompt asks for one subagent per file; `TAX_RATE` is 0.25 in `src/tax.ts`, `MAX_RETRIES` is 5 in `src/limits.ts`, and the rest of both files, `src/index.ts` and `README.md` are as scaffolded (files only; the transcript is not graded) |
| `review-seeded-defects` | REQ-SKILLS-010 | the reply names the 5 seeded defects by file and line (plus or minus 2) and names no line of the 3 benign changes; the prompt is plain language, identical in both arms |
| `review-seeded-defects-slash` | REQ-SKILLS-010 | the same fixture and graders, prompt `/claudetto:review`; read its with arm only |
| `count-after-change-v2` | REQ-REPLY-145 | the same outcome as `count-after-change`, after a replayed session of about 136k tokens that ends on a mid-turn correction of an earlier count |
| `dispute-checkable-v2` | REQ-REPLY-146 | the same outcome as `dispute-checkable`, after a replayed session of about 136k tokens that ends on the user's dispute |

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

## Replay Cases

The `-v2` cases resume a synthetic transcript (`history.jsonl`) through `context.history_file`, so they run in a long session. `tools/eval-history/generate.ts` writes each history and its `scaffold.sh` deterministically (`bun tools/eval-history/generate.ts`); edit the generator, not the output. The session is generated on a `tiny-cart` repo and copies no real transcript. A replay case runs one arm under the default `--ablation auto`, so pass `--ablation with-without` to compare arms. `count-in-reply-v2` is not built: `history_file` must sit in the case directory, so it would add a third copy of an 800 KB history.

## Results

- 2026-11-21, Sonnet 5.5, 3 runs per arm: `count-after-change` 1.00 with and without, `count-in-reply` 1.00 with and without ($0.86). Neither case separates the arms; the fault in issue #90 came from Opus 5.5 late in a long session, after a user correction, so a `-v2` must replay those conditions.
- 2026-11-21, Sonnet 5.5: `dispute-checkable` 1.00 with and without ($0.32).
- 2026-11-21, Opus 5.5, 3 runs per arm: all three cases 1.00 with and without ($2.56).
- A fresh single-turn session reproduces neither fault. Both happened in a long session (over 6,000 transcript lines) with a correction sent mid-turn. The baseline was 2.1.330 plus the user's settings: Opus 5.5 at medium effort, auto mode, sandbox, Proactive style. A `-v2` needs that history seeded.
