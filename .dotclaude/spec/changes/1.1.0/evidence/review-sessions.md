# Review of dotclaude-sessions (P106)

A `reviewer` run did the review on 2026-10-14, read only.
The main session wrote this file from its report.
Scope: `src/plugins/dotclaude-sessions/` (`start-cost` and `usage`), and `tests/sessions/`.
The probes are in `$TMPDIR/p106/`.
The fix package is P132.

## Confirmed Findings

### F1. I16: an unparsed model id sets the token counts to zero

`callCost` gives `context: 0` and `read: 0` when it finds no price (`slices/usage/domain/parse.ts:73`).
The token counts do not depend on the price.
Because of this, the cache hit rate and the over-window share drop the call, and the report does not tell the user.
The test at `tests/sessions/usage/report.test.ts:67` requires this defect.

```text
$ bun probe-cost.ts
claude-opus-5-5 {"total":0.054,"write":0,"context":251000,"read":250000,"rewrite":false}
claude-3-opus-20240229 {"total":0,"write":0,"context":0,"read":0}
$ bun dotclaude-usage --root u1/p --json   # same call: reread 251000, cacheHitRate.all null
```

Failing test, in `tests/sessions/usage/report.test.ts`:

- Input: `callCost("claude-3-opus-20240229", { input_tokens: 1000, cache_read_input_tokens: 250000 })`.
- Expected: `context` is `251000`, `read` is `250000`, and the report counts the calls that have no price.
- Actual: `context` is `0` and `read` is `0`.

### F2. I16: the report uses the label "main turns" for two different counts

`s.mainTurns` adds 1 for each API call (`slices/usage/domain/scan.ts:168`).
`text.ts:85` prints this count as "main turns".
`text.ts:31` prints the prompt count with the same label.

```text
$ bun dotclaude-usage --root u2/p    # one prompt, three calls
Main turns started by background agents: 0 of 1, 0% of cost
Delegation: 0 subagent runs in 3 main turns, 0 per 100 turns (-)
```

Failing test, in `tests/sessions/usage/report.test.ts`:

- Input: one prompt, then three assistant messages, each with a different `id`.
- Expected: the delegation line counts 1 turn, or it calls the count "calls".
- Actual: the delegation line says `3 main turns`.

### F3. I16: `--text-max` passes when the transcript has no snapshot

`firstRequestBytes` gives `null` when the transcript has no `prompt_snapshot` record.
In that case, `reportOf` does not do the check (`slices/start-cost/domain/report.ts:131`) and gives `ok` (`report.ts:180`).

```text
$ bun dotclaude-start s/nosnap.jsonl --text-max 1 > s/out.txt; echo "exit=$?"
exit=0
$ grep -c "First request text" s/out.txt
0
```

Failing test, in `tests/sessions/start/sources.test.ts`:

- Input: a transcript that has a request but no snapshot, with `--text-max 1`.
- Expected: a status that is not 0, and a line that says the text size is not known.
- Actual: status 0, and the report does not say that it did not do the check.

### F4. I17: when the transcript has no data, the bin gives the status of a failed bound

`reportOf` gives `ok: false` when the transcript has no request (`report.ts:107-112`), so `main` exits with status 1 (`adapters/cli.ts:88`).
Status 1 means "over the bound", and this run has no bound.

```text
$ bun dotclaude-start s/none.jsonl; echo "exit=$?"
No request with usage. The transcript has no model call yet.
exit=1
```

Failing test, in `tests/sessions/start/cli.test.ts`:

- Input: a transcript that has only a user entry, with no bound.
- Expected: status 2, the same status as for an absent transcript.
- Actual: status 1.

### F5. Smell, a test that cannot fail: the check of the difference

`tests/sessions/start/report.test.ts:128` looks for `"100"` in the message.
The text `"1100"` from line 126 already contains `"100"`, so this check never fails.

```text
$ bun -e '...["1100","1000","100"].map(s=>m.includes(s))'   # m has no difference
[ true, true, true ]
```

Failing test, in `tests/sessions/start/report.test.ts`:

- Input: `checkBudget(1_100, 1_000)`.
- Expected: the test requires the text `by 100`.
- Actual: the test also passes with a message that has no difference.

### F6. Smell, a bound outside `limits.ts`: `TIMEOUT_MS`

`TIMEOUT_MS = 120_000` is in `start-cost/adapters/mod.ts:13` and in `usage/adapters/mod.ts:14`.
The plugin has no `limits.ts`.
The other plugins keep their timeouts in `limits.ts`, for example `dotclaude-browser/slices/search/limits.ts:7`.

```text
$ grep -rn TIMEOUT_MS src/plugins/dotclaude-sessions
.../start-cost/adapters/mod.ts:13:const TIMEOUT_MS = 120_000;
.../usage/adapters/mod.ts:14:const TIMEOUT_MS = 120_000;
```

Failing test, in `tests/sessions/errors.test.ts`:

- Input: `slices/<s>/limits.ts` for each of the two slices.
- Expected: each file exists and exports `TIMEOUT_MS`.
- Actual: neither file exists.

### F7. Smell, dead code: three exports that nothing uses

In `slices/usage/domain/transcript.ts`, `contextOf` (line 122), `charsOf` (line 128), and `toolCalls` (line 138) have no caller in `src/` or `tests/`.

```text
$ grep -rlw contextOf|charsOf|toolCalls src/plugins/dotclaude-sessions/slices/usage
.../usage/domain/transcript.ts   # each name: only its definition
```

Failing test, in `tests/sessions/errors.test.ts`:

- Input: the export keys of the usage `transcript.ts` module.
- Expected: no key that has no caller.
- Actual: the keys include `contextOf`, `charsOf`, and `toolCalls`.

### F8. Smell, a comment that does not agree with the code: `--text-min`

`start-cost/adapters/cli.ts:6` says that the bin exits 1 when the text is outside `--text-min`.
The code treats `--text-min` only as an advisory.

```text
$ bun dotclaude-start s/nosnap.jsonl --text-min 999999999 >/dev/null; echo $?
0
```

Failing test, in `tests/sessions/start/sources.test.ts`:

- Input: `--text-min` above the size of the text.
- Expected: the header comment and the behavior agree.
- Actual: the comment says status 1, and the bin gives status 0.

## Unconfirmed Findings

- `parse.ts:30-49`: no command compared the prices with the pricing page.
- `scan.ts:62,70,142`: an assistant entry that has no `timestamp` counts in each period. No probe tested this.
- `scan.ts:142`: after the first message that has no `id`, the code skips each other message that has no `id`. No probe tested this.
- `scan.ts:151` (`300_000`), `parse.ts:87` (`30_000`), and `parse.ts:53`: these thresholds are not in `limits.ts`. No rule says that they are slice bounds.
- No check looked at real transcripts to find whether they have `prompt_snapshot` records. If they have none, F3 occurs on each run.

## Dossier Check

- I01: Not found. The default window comes from the model name (`parse.ts:93`), and the code documents this.
- I02: Not applicable. The slices inject no rules.
- I03: Not applicable.
- I04: Present in F3, where a gate passes with no measurement.
- I05: Present. F5 is a weak assertion, and `usage/report.test.ts:67` requires the defect of F1.
- I06: Not applicable.
- I07: Not found. Both stores only read (`adapters/store.ts`).
- I08: Not found. The flags in the skills agree with the `USAGE` text of each bin.
- I09: The two copies of the transcript readers are intentional (`transcript.ts:2`). F7 is the dead part of those copies.
- I10: Not found. `wordsOf` sends any argument text that has a shell character to the skill (`kernel/skill-command.ts:14`).
- I11: Not applicable.
- I12: `scanFile` reads each subagent file three times (`scan.ts:42,43,58`). This was not measured.
- I13: Not applicable.
- I14: Not found.
- I15: Not found. The tests check figures, not wording.
- I16: Present in F1, F2, and F3.
- I17: Present in F4.
- I18: Present in F1, where a model with no price stays out of the figures with no warning. An unlisted version gets the newest price of its family (`parse.ts:63`), and the code documents this.
