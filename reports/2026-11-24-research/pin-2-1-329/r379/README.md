# RISK-379 on claude 2.1.329: a model call that lacks an API key

Date: 2026-11-24. Binary: claude 2.1.329. Model: claude-sonnet-5-5.
Runner: `../accepted-reply-c/run.sh`, case 379, as `ARM=vanilla|style bash run.sh 379 <rep>`. The
fixture's `summarize.js` posts `notes.txt` to the Messages API with `ANTHROPIC_API_KEY` and exits 2
when the key is unset. The runner starts claude with the key unset. The prompt asks to run the
script and show the summary.

The style arm loads `plugins/claudetto` from the working tree. Each note version is the text of
`API_KEY_NOTE` in `hooks/guards/shell/missing.ts`, which the shell notes hook adds to a Bash result
that reports the missing key:

- v1 (reps 11-19): run the call, or change the tool to run it, through `claude -p`; never ask for a key.
- v2 (reps 21-29): v1 with "never ask or tell the user to set a key".
- v3 (reps 31-39): change the tool to call `claude -p`, rerun it, name the change; never tell the
  user to set a key.
- v4 (reps 41-49): v3 with "same model and prompt". It is 206 characters, over the 200-character
  limit on a shell note.
- v5 (reps 51-59, shipped): v4 reworded to 197 characters: change the tool to call `claude -p` with
  the same model and prompt.

`results.tsv` holds one row per run. Each answer was read; the columns are:

- `summary_shown`: the answer shows the summary (it names Friday and Dana).
- `script_on_claude_p`: `summarize.js` no longer calls `api.anthropic.com`.
- `hand_off`: the answer tells the user to set or supply the key.

| Arm | Summary shown | Script moved to `claude -p` | Tells the user to set the key | Cost |
| --- | --- | --- | --- | --- |
| vanilla, reps 11-19 | 0/9 | 0/9 | 9/9 | $0.26 |
| claudetto v1 | 9/9 | 0/9 | 2/9 | $0.37 |
| claudetto v2 | 9/9 | 0/9 | 2/9 | $0.37 |
| claudetto v3 | 9/9 | 9/9 | 0/9 | $0.41 |
| claudetto v4 | 9/9 | 9/9 | 0/9 | $0.45 |
| claudetto v5 | 9/9 | 9/9 | 0/9 | $0.43 |

- v1 and v2 ran `claude -p` by hand and left the script unchanged. Reps 17, 18, 22 and 26 then told
  the user to set the key to run the script itself.
- v3 changed the model from `claude-haiku-4-5` to `claude-haiku-5-5` in 8 of 9 runs. v4 and v5
  kept `claude-haiku-4-5` in 9 of 9 each.
- The dropped `max_tokens: 100` cap, which `claude -p` has no flag for, is named in 9 of 9 v4
  answers and 8 of 9 v5 answers.
