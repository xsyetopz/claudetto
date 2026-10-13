# P38: Resume and Repeated Starts

This file continues [the P38 probe](session-stamp.md).
It gives the causes of two findings of the sandbox check, the decision, and the fix.

## Finding 1: A Resume Adds a Second Row

- Cause.
  The `stamp` slice wrote a row at each `session.start` and did not read the transcript.
  The function `stamp` in `src/plugins/dotclaude/slices/stamp/adapters/mod.ts` appended in every start.
  The sandbox check showed the rows at lines 3 and 27 of one session id, because `--continue` keeps the id.
- Decision, by the main session.
  A session start writes a stamp row only when the transcript holds no stamp row, or when the newest stamp row has another `version` or `sha`.
  A resume on the same build adds no row.
  A resume on a new build adds one.
- Fix.
  `needsStamp` and `newestStamp` in `src/plugins/dotclaude/slices/stamp/domain/build.ts` apply the decision.
  The adapter reads the transcript at `projects/<folder>/<session id>.jsonl` under the config folder.
  The folder is the working directory with each character that is not a letter or a digit replaced by `-`.
  This rule matched all 76 top-level transcripts of `~/.claude/projects`.
- Reader.
  `scanFile` in `src/plugins/dotclaude-sessions/slices/usage/domain/scan.ts`, line 104, keeps the first stamp row, `stamp ??= parseStamp(...)`.
  The report keeps this rule, so each session shows one build: the build it started on.
  The report has one build for each session in its tables, so a list of each build needs a split of the cost by build.
- Tests.
  `a session whose transcript holds no stamp row appends one`, `a resumed session whose newest stamp row has the same build appends no stamp`, and `a resumed session whose newest stamp row has another build appends a stamp` are in `src/plugins/dotclaude/slices/stamp/lab/stamp.test.ts`.
  `a session with two stamp rows shows the build of its first row` is in `tests/sessions/usage/builds.test.ts`.
  Setting `needsStamp` to always write makes the same-build test fail.

## Finding 2: Session `0ce1dc74` Has 11 Rows and No Assistant Row

- Facts, read only.
  The transcript holds 24 `system` rows and no `user` or `assistant` row.
  It holds 11 stamp rows and 13 other `dotclaude:` notices.
  Its stamp rows run from `2026-10-12T23:27:07Z` to `2026-10-13T01:40:15Z`.
  The stamp rows hold six builds in this order: `9fcc8d9`, `8bd0d52`, `e6937fc` four times, `28f57a0` three times, `6b1c1a1`, and `ba668c8`.
- Cause of the 11 rows.
  The same session id took 11 starts, and each start appended one row to the same file.
  The starts had no prompt, so no `user` row was written.
  The transcript cannot show which flag made each start resume the session.
- Replay of the new rule.
  A script replayed the 11 recorded starts through `needsStamp`, and it kept 6 rows.
  The five repeats of the same build are removed, and the six build changes are kept.
- Cause of the missing session.
  `scanFile` in `src/plugins/dotclaude-sessions/slices/usage/domain/scan.ts`, lines 199-207, adds a main session to `sessions` only when it has a model call in the period.
  The commit `9078dd59` (P38) states this on purpose: `The report shows the build ... of each session that has calls in the period`.
  The skip is by design, and it is kept.
  `dotclaude-usage --days 30 --json` on the sandbox config lists 10 sessions, and 10 main transcripts hold an assistant row.
  The two main transcripts with no assistant row, `0ce1dc74` and `2c7da841`, are the two that the report skips.
- Docs.
  `wiki/add-ons/Sessions.md` now says `each main session with model calls in the period`.

## Gaps

- `$.fs.read` rejects a file over 4 MiB.
  The largest local transcript is 3.85 MB, and none is over 4 MiB.
  A larger transcript gives no text, so the stamp is written at each start, as before.
  The first-row rule of the report keeps that duplicate out of the build.
- The project-folder rule is not measured on Windows.
- The live check below ran the resume on one build.

## Live Check From the Main Session, 2026-10-13

The main session ran three starts of one session in a new `just sandbox --dir` folder, on build `64f29fd`, with `--model haiku` and `-p "Reply with the word ok."`.
The first start had no flag, and the second and third starts had `--continue`.

| Start | Stamp rows in the transcript |
| --- | --- |
| 1, new session | 1 |
| 2, `--continue` | 1 |
| 3, `--continue` | 1 |

- The sandbox folder held one main transcript, with 4 `user` rows and 4 `assistant` rows, so each `--continue` start resumed the same session.
- The one row is `dotclaude build stamp: {"version":"0.28.0","sha":"64f29fd","shaSource":"git",...}`.

Result: a resume on the same build adds no row.
