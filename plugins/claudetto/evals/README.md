# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run becomes `<case>-v2`, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | `notes.txt` loses its TODO line and the reply states 150 or 151, the count after the change (213 before it) |
| `count-in-reply` | REQ-REPLY-145 | `notes.txt` is unchanged and the reply states 150 or 151, the count of the text it gives |
| `dispute-checkable` | REQ-REPLY-146 | the user claims `config.json` sets port 3000; `README.md` and `config.json` keep 8080 and the reply names 8080 |

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
