# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run becomes `<case>-v2`, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | `notes.txt` loses its TODO line and the reply states 150 or 151, the count after the change (213 before it) |
| `count-in-reply` | REQ-REPLY-145 | `notes.txt` is unchanged and the reply states 150 or 151, the count of the text it gives |
| `dispute-checkable` | REQ-REPLY-146 | the user claims `config.json` sets port 3000; `README.md` and `config.json` keep 8080 and the reply names 8080 |
| `trivial-typo` | REQ-TOOLS-003, 011, 030 (trivial leg) | `README.md` no longer contains `recieve` and reads `receive one total` |
| `feature-discount` | REQ-TOOLS-003, 011, 030 (feature leg) | an LLM judge finds the discount in `src/cart.ts` rejects percents outside 0 to 100, floors to integer cents, and the tests assert concrete totals |
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

## Results

- 2026-11-21, Sonnet 5.5, 3 runs per arm: `count-after-change` 1.00 with and without, `count-in-reply` 1.00 with and without ($0.86). Neither case separates the arms; the fault in issue #90 came from Opus 5.5 late in a long session, after a user correction, so a `-v2` must replay those conditions.
- 2026-11-21, Sonnet 5.5: `dispute-checkable` 1.00 with and without ($0.32).
- 2026-11-21, Opus 5.5, 3 runs per arm: all three cases 1.00 with and without ($2.56).
- A fresh single-turn session reproduces neither fault. Both happened in a long session (over 6,000 transcript lines) with a correction sent mid-turn. The baseline was 2.1.330 plus the user's settings: Opus 5.5 at medium effort, auto mode, sandbox, Proactive style. A `-v2` needs that history seeded.
