# 18.8: follow rate of the output style's checkbox line

Line measured: `Concise.md` `<requests_to_the_user>` at a2dfb6ca: `End with a "What I Need from You" list of `- [ ]` items only for steps only the user can take ... Each item gives the exact `! <command>` to run ...`.

Hypothesis: with the style active, the model writes `- [ ]` items for user-only steps on most prompts where such a step exists. Without the plugin it does not.
Prediction (written before the paid run): plugin arm `checkbox` follow rate 50-90% (point guess 70%), base arm below 15%.

Prompts: `prompts.json`, 32 held-out prompts, written blind by a fresh subagent told only the kind of task (partly doable, at least one step only the user can take). It never saw the style text or an earlier case set. The labels (how a reply is judged) are in `prompts.json` and were fixed before any run:

- `checkbox` (primary): the final reply has a line matching the Stop check's regex `OPEN_ITEM` from `hooks/limits/open-items.ts`.
- `form` (strict): `checkbox`, plus the heading phrase, plus a `! <command>` in every item.
- `heading` (weak): the phrase "What I Need from You" appears.

Setup: Claude Code 2.1.319, model `claude-sonnet-5-5`, `-p --output-format stream-json --no-session-persistence`, `--setting-sources ""`, tools `Read,Write,Edit,Glob,Grep` (no Bash, so no `sudo` or install runs), `--max-budget-usd 1`, 300,000 token kill per session by the runner. Arm `plugin`: `--plugin-dir plugins/claudetto` and settings `outputStyle: claudetto:Concise` (the plugin's `settings.json` does not select a style itself). Arm `base`: no plugin, no style. Each session's init frame is checked for style, plugin and model; a mismatch rejects the session. Workspaces are in `/tmp/probe-18-8`, each with `.created-by-claudetto`.

Dry run on the fake Messages API (free): `bun openspec/changes/release-2-1-319/evidence/18-8/probe.ts --dry --limit 3 --out /tmp/probe-18-8/dry` ran 6 sessions with no rejection. It exposed a bug in the `form` regex (a `!` after a backtick did not match), fixed before the paid run.

Command (paid run, repo root):

```sh
bun --env-file=.env openspec/changes/release-2-1-319/evidence/18-8/probe.ts --run --out /tmp/probe-18-8/out
```

Result (`sessions.jsonl`, one row per session with the reply text; `ledger.jsonl`): the prediction held for the base arm and missed for the plugin arm (21/32 = 66%, inside the guessed 50-90% on `checkbox`, but the strict form is far lower).

| Arm | n | checkbox (primary) | Wilson 95% | form (strict) | Wilson 95% | heading | Wilson 95% | Largest run | Cost |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| plugin | 32 | 21/32 | 0.483-0.796 | 2/32 | 0.017-0.201 | 20/32 | 0.453-0.771 | 49,294 tokens | $1.50 |
| base | 32 | 0/32 | 0.000-0.107 | 0/32 | 0.000-0.107 | 0/32 | 0.000-0.107 | 19,200 tokens | $0.71 |

No session was rejected by the arm check, none was capped, total $2.21, 64 sessions, 1,316,831 tokens (plugin 945,774, base 371,057). Largest session 49,294 tokens, far under the 300,000 cap.

Caveats:
- The `Write` tool is denied by `--permission-mode default` in `-p`, so many plugin replies list a permission grant as the open item (for example "Grant write permission for ...") instead of a user-only command. That inflates `checkbox` with items that are not the style's intended items. Only 7/32 plugin replies hold a checkbox item with a `!` command. `form` is low because most items carry no `!` command, so it is the stricter and more telling measure. A rerun with the write permission granted would remove this confound; not run.
- 11 plugin replies had no checkbox: p05, p06, p07, p13, p15, p19, p20, p23, p27, p29, p31 (p31 holds the heading only).
- One sample per prompt (n=1), one model (sonnet), tools limited to `Read,Write,Edit,Glob,Grep`, so the model could not run the user-only commands itself.
- Judging is by regex, not an LLM, so `checkbox` counts any `- [ ]` line.

Processes (18.17): fake API (probe.ts:77) and `claude -p` via `launch` stopped by `try/finally await fake?.stop()` (probe.ts:114-115); ps after run: checked 2026-11-07 sweep: none
