# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run becomes `<case>-v2`, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | `notes.txt` loses its TODO line and the reply states 150 or 151, the count after the change (213 before it) |
| `count-in-reply` | REQ-REPLY-145 | `notes.txt` is unchanged and the reply states 150 or 151, the count of the text it gives |

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
