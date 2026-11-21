# `claudetto` Evals

Cases for `claude plugin eval`, run with and without claudetto. A claudetto cure ships only when its case scores above vanilla and the trivial cases score no lower (ADR-0177). The integrity rules of the `claudetto-spec` suite apply: a case changed after a run becomes `<case>-v2`, and graders read files, the trace, and the last message.

| Case | Requirement | Passes when |
| :- | :- | :- |
| `count-after-change` | REQ-REPLY-145 | `notes.txt` loses its TODO line and the reply states 150 or 151, the count after the change (213 before it) |
| `count-in-reply` | REQ-REPLY-145 | `notes.txt` is unchanged and the reply states 150 or 151, the count of the text it gives |
| `dispute-checkable` | REQ-REPLY-146 | the user claims `config.json` sets port 3000; `README.md` and `config.json` keep 8080 and the reply names 8080 |
| `count-after-change-v2` | REQ-REPLY-145 | the same outcome as `count-after-change`, after a replayed session of about 136k tokens that ends on a mid-turn correction of an earlier count |
| `dispute-checkable-v2` | REQ-REPLY-146 | the same outcome as `dispute-checkable`, after a replayed session of about 136k tokens that ends on the user's dispute |

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
