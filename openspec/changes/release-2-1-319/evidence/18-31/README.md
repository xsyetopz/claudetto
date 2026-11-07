# 18.31: grade the current plugin on a held-out set

One run grades `plugins/claudetto` of this checkout on a set of 24 cases and prints counts only. Run it from the repo root
by your own `!`, once per run (10 runs, each 24/24):

```sh
! bun --env-file=.env openspec/changes/release-2-1-319/evidence/18-31/run.ts ~/.claudetto-holdout/held-out-r4.json
```

For the contaminated r3 set, pass `~/.claudetto-holdout/held-out-r3.json` instead.

Output: `{"n":24,"pass":N,"byLabel":{...}}`. The folder it made (`/tmp/probe-1831-XXXXXX`, marked with
`.created-by-claudetto`) holds `result.json`, `ledger.jsonl` (tokens and cost per session, no case text) and `cfg/`, `ws/`.

## What it is

- `grader.ts` is `../tmp/probe-122/grader.ts` (the grader of the 12.3 runs; the old `/tmp/probe-123/grader.ts` differed
  only in `ROOT`). Folders come from `FIXTURE_ROOT`, workspace templates and the session writer from `../tmp/probe-122`.
- `run.ts` makes the folder, sets `ARM_DIR` to this checkout's `plugins/claudetto` (the old `arm-change` was a copy of it)
  and calls `claudekit fixture grade SET grader.ts`.
- The folder is under `/tmp` because the sessions run with `--setting-sources project,local`: a folder inside the repo
  would load the repo's own settings and nest git repos.
- `~/.local/share/claudekit` (the claudekit checkout of the 12.1 and 12.3 runs) must exist; `run.ts` stops and says so when it does not.

## Set format

The claudekit loader accepts a prefix of plain-string messages only. r2 cases with `tool_use`/`tool_result` blocks fail
`fixture check` ("prefix: want an array of { role, content: string }"), so a set for this command has string prefixes.
Check a set with `bun ~/.local/share/claudekit/bin/claudekit.ts fixture check SET`.
