# Review of the Statusline Slice (P96)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude/slices/statusline/`, `tests/dotclaude/statusline/`, and part `07` of the dossier.
The fix package is P122.

## Confirmed Findings

### F1. I16: the change segment shows only `done`

`segments.ts:65` prints `done/total`, and `spec-store.ts:183` counts only `done` (the cause is in P94).
The segment re-reads the store on each run, so it refreshes.

```text
$ bun $TMPDIR/p96/refresh.ts   # appends events to a temp store
A: ◆ 9.0.0 0/2   B (verified): 0/2   C (approved): 0/2   D (done): 1/2
live store: {"canceled":4,"done":1,"verified":12,"doing":5,"planned":88} -> ◆ 1.1.0 1/106
```

Failing test, in `change.test.ts`:

- Input: P01 `verified`, P02 `doing`, P03 `planned`.
- Expected: the segment shows the `verified` count and the `doing` count.
- Actual: `◆ 1.0.0 0/3`.

`change.test.ts:63` pins the current text.
The format of the new text is for the user to choose.

### F2. I18: the snapshot tests depend on `TZ`

`format.ts:26` formats the time in the local zone, and `snapshot.test.ts:22` expects UTC.

```text
$ TZ=Europe/Tallinn bun test .../snapshot.test.ts .../clock.test.ts
8 pass  2 fail   (↻6:12pm received, ↻3:12pm expected)
```

Failing test: the same command must pass.

### F3. I17: a `git` error reads as "no repository"

`git-cache.ts:109-119` gives `null` for a timeout and for a missing `git`, and writes no cause.
It does not read `timedOut`.
The result `null` stays in the cache for 3 seconds.

```text
git timed out   err= []
git missing     err= []
```

Failing test, in `render.test.ts`:

- Input: the runner gives `{exitCode:null,timedOut:true}`.
- Expected: `stderr` names `git`.
- Actual: `[]`.

### F4. Silent catch

`git-cache.ts:137` drops a read error.
`cli.ts:61` and `cli.ts:111` give an empty row with no cause, which is against the contract in `cli.ts:9`.
`render.test.ts:134` pins that silence.

```text
cache read throws EPERM  err= []
stdin not JSON           out= [""] err= []
```

Failing test, in `git-cache.test.ts`:

- Input: `files.read` throws `EPERM`.
- Expected: the cause goes to `onError`.
- Actual: `[]`.

### F5. Dead code

`pace.ts:46` `paceDelta` has no caller.
`git grep -n paceDelta` finds only its definition, in `src/` and in `plugins/`.

Failing check: a test that `paceDelta` is not exported.

## Unconfirmed Findings

- Only prose links `USAGE_REWRITE_MS` (`limits.ts:19`, 5 minutes) to `USAGE_SAMPLE_MAX_MS` (spec `limits.ts:13`, 10 minutes).
  No test pins the "half" relation, and no output is wrong now.
- A subagent `name` or `description` keeps the codes `ESC ]0` and `ESC ]8` (probed with `esc.ts`).
  No probe shows that Claude Code sends them to the terminal.
- `GIT_TIMEOUT_MS` (1,500 ms) is longer than the refresh interval (1 s).
- For P94: `activeProgress` sorts the ids as text, so `1.9.0` wins over `1.10.0` (probe output: `{"id":"1.9.0"}`).

## Dossier Check

- I01: The slice reads Claude Code stdin and the store, and the fields match the bundle.
- I02, I06, I11, I13, I14: Not applicable.
- I03: The context percent uses the same formula as the bundle `R1n`.
- I04: `done`-only counting under-reports, so it does not over-claim.
- I05: Errors are swallowed (see F3 and F4).
- I07: The CLI writes only `RATE_LIMITS_FILE` and a cache folder with mode `0700`.
- I08: The bundle has `hideVimModeIndicator`, `subagentStatusLine`, and `refreshInterval`.
- I09: See F5, and `modelName` and `shortModel` are copies of one another.
- I10: See the escape-code item in Unconfirmed Findings.
- I12: The store read takes 9.1 ms and 176 reads for each refresh.
- I15: I found no test of prose.
- I16: See F1.
- I17: See F3.
- I18: See F2. The context segment has no drift.

Checked: `bun test tests/dotclaude/statusline/` (94 pass), the run with `TZ` set, and the probes `states.ts`, `render.ts`, `refresh.ts`, `sort.ts`, `silent.ts`, `time.ts`, and `esc.ts` in `$TMPDIR/p96/`. I also read `cc-2.1.296/strings.txt`.
