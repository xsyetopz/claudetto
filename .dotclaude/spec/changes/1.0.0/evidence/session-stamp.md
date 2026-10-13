# P38 probe: does a `system` notice reach the model?

## Question

In Claude Code `2.1.296`, when a hooks module calls `$.session.append` with a `system` notice at `SessionStart`, does the text of that notice reach the model in the next request?

## Conclusion

The model does not see it.

This holds for one live run, with one prompt, on `2.1.296`, with the `system` row of the `informational` subtype.
The run captured one request.
The binary search did not locate the code that builds the API messages, so the binary facts do not show the cause.

## Binary facts

The file is `external/cc-2.1.296/strings.txt`, which git ignores.
The line numbers are the line numbers of that file.

- Lines 165361 to 165368 hold the refusal text of `$.session.append`.
  A plugin may append "a user-role `isMeta` row or a system notice".
  A notice must be "one text block".
  The text also says "a conversation no plugin may shape".
- Line 159309 holds the text "session.append at the loop's keep point".
  It reports a row that "is kept as made" when the append fails.
- Line 326542 holds the constructor `mA`.
  It makes `{type: "system", subtype: "informational", content, isMeta: false, timestamp, uuid, level}`.
- Line 329345 holds the predicate `_Qr`.
  It returns `true` for every row whose `type` is not `user`.
  For a `user` row, it returns `false` when `isMeta` is set and the origin is not a plugin origin.
  The caller of `_Qr` was not traced.
- Lines 320077, 320099, 327739, and 327722 test `type` against `system`.
  These tests find the last assistant or user row, or read a hook row.
  None of them is the code that builds the API `messages`.
- Not located: the function that turns transcript rows into the `messages` of the request.
  The search of `role:"user"` and `case"user":` did not isolate it.

## Live result

The run used the probe below, in a temporary edit that the commit does not hold.

- File: `src/plugins/dotclaude/slices/setup/adapters/mod.ts`, in `onSessionStart`.
- The hook calls `$.session.append` with `type` `system`, `subtype` `informational`, `level` `info`, and one text block.
- The text holds the marker `P38PROBE-MARKER-7f3a9c52`.

Results:

- The append did not fail.
  The transcript holds the marker row.
- The captured request holds 2 messages.
  Message 1 is the `user` turn with `<system-reminder>` text and the drift note.
  Message 2 is the prompt.
- The captured request does not hold the marker.
  A search of the request body found no match.
- The drift note, a `user` row with `isMeta` set, is in the request.
  It is written at the same point of the session, before the prompt.
  So the request does hold a `SessionStart` row of the `user` type.

The transcript row of the probe has these keys: `parentUuid`, `isSidechain`, `type`, `subtype`, `content`, `isMeta`, `timestamp`, `uuid`, `level`, `userType`, `entrypoint`, `cwd`, `sessionId`, `version`, `gitBranch`.
Its `type` is `system`, its `subtype` is `informational`, its `isMeta` is `false`, and its `level` is `info`.
Its `content` is a string.
The row sits before the first `user` prompt row.
The drift note row, which is a `user` row, has these keys: `parentUuid`, `isSidechain`, `promptId`, `type`, `message`, `isMeta`, `uuid`, `timestamp`, `origin`, `userType`, `entrypoint`, `cwd`, `sessionId`, `version`, `gitBranch`.
Its `message` has the keys `role` and `content`, and its `content` is an array.

## Commands

Run from the worktree, on the branch `p38-probe`.

```text
just generate
bun plugins/dotclaude-lab/bin/dotclaude-capture --port 8787 --out <temp>/p38-capture
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true \
  just sandbox --model haiku -p "Reply with the word ok." --debug-file <temp>/p38-debug.log
```

- `<temp>` is the system temp folder.
- The sandbox used the login of the user, as the brief asked.
  The script did not print the token.
- The reply of the run was `ok`.
- The sandbox folder `dotclaude-sandbox` held transcripts from earlier runs.
  The run read the newest transcript only.

## Version

Claude Code `2.1.296` (`claude --version`).

## Scope and gaps

- One run, one prompt, one request.
  A second run with another prompt, or another model, was not made.
- The probe used a `system` row of the `informational` subtype.
  Other `system` subtypes were not tested.
- The probe did not test the `system` row with a string `content`.
  The probe sent one text block, and the transcript stored a string.
- The binary search did not show the request builder.
  The conclusion rests on the live capture.

## Implication for P38

Step 3 of the package appends the record as a `system` notice when the model does not see that notice.
This probe shows that the model does not see it, so the `stamp` slice appends a `system` notice of the `informational` subtype, and writes no `.dotclaude/sessions.jsonl`.
A `user` row with `isMeta` set is not a choice, because the request holds the drift note, which is such a row.
The probe captured one request only.
The tests of the slice cannot check the request, so a check in `just sandbox` with `dotclaude-capture` and two prompts is part of the acceptance of P38.

## Sandbox Check, 2026-10-13

This section records the last acceptance check of P38.
The check runs one session with two prompts in `just sandbox`.
The proxy is `dotclaude-capture`, and the model is `haiku`.

## Result

- Point 1 passes.
  The transcript holds the stamp row.
- Point 2 passes.
  No captured request body holds the text of the record.
- Point 3 passes.
  `dotclaude-usage` shows the build `0.28.0 3fc4e0e` for the session.
  It shows `unknown` for a session with no record.

The build is version `0.28.0` with the short SHA `3fc4e0e`.
That SHA is the head of the branch `p15`.
The run used Claude Code `2.1.296`.

## Method

1. Start the proxy with `--no-count`.
   The flag stops the sizing requests to the `count_tokens` endpoint.
2. Run the first prompt in `just sandbox` through the proxy.
3. Run the second prompt with `--continue`.
   Claude Code resumes the session of the first prompt, so both prompts share one session id.
4. Search the transcript of the session for the stamp row.
5. Search each captured request body for the text of the record.
6. Run `dotclaude-usage` with `CLAUDE_CONFIG_DIR` set to the sandbox config.
7. Run `just sandbox-alone` with `plugins/dotclaude-sessions`.
   That plugin set has no core plugin, so it writes no record.
   Then run `dotclaude-usage` on its config.

Commands, where `<check>` is `<temp>/p38-check-2026-10-13` and `<temp>` is the system temp folder:

```text
bun plugins/dotclaude-lab/bin/dotclaude-capture --port 8787 --out <check>/capture --no-count
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true \
  just sandbox --model haiku -p "Reply with the word ok." --debug-file <check>/debug-1.log
ANTHROPIC_BASE_URL=http://127.0.0.1:8787 ENABLE_TOOL_SEARCH=true \
  just sandbox --model haiku --continue -p "Reply with the word yes." \
  --debug-file <check>/debug-2.log
grep -n 'dotclaude build stamp' <temp>/dotclaude-sandbox/config/projects/<project>/<session>.jsonl
grep -c -F 'dotclaude build stamp' <check>/capture/request-*.json
CLAUDE_CONFIG_DIR=<temp>/dotclaude-sandbox/config \
  bun plugins/dotclaude-sessions/bin/dotclaude-usage --days 1 --json
just sandbox-alone plugins/dotclaude-sessions --model haiku -p "Reply with the word ok."
CLAUDE_CONFIG_DIR=/tmp/dotclaude-sandbox-alone/config \
  bun plugins/dotclaude-sessions/bin/dotclaude-usage --days 1 --json
```

- The grep for each text of point 2 runs with its own pattern.
  The patterns are `0.28.0`, `3fc4e0e`, `shaSource`, and `"informational"`.
- The code block breaks some lines for width.
  Each command is one line in the shell.

## Point 1: the transcript holds the stamp row

The session has the id `616c6432-743d-49d6-bc88-ca84641b1ed9`.
Its transcript holds two stamp rows, at lines 3 and 27.
Line 3 comes from the first start.
Line 27 comes from the start of the `--continue` run.

Line 3 has these fields outside `content`:
`type` is `system`, `subtype` is `informational`, `isMeta` is `false`, and `level` is `info`.
Its `sessionId` is the id of the session, and its `version` is `2.1.296`.

The `content` value of line 3 is below.
The code block breaks the value for width.
The transcript holds the value on one line.

```text
"content":"dotclaude build stamp: {\"version\":\"0.28.0\",\"sha\":\"3fc4e0e\",
\"shaSource\":\"git\",\"sessionId\":\"616c6432-743d-49d6-bc88-ca84641b1ed9\",
\"at\":\"2026-10-13T01:47:57.832Z\"}"
```

The value of line 27 has the same version and SHA.
Its `at` is `2026-10-13T01:48:12.201Z`.

## Point 2: no request body holds the record

- The session sent two requests.
  The bodies are `request-2026-10-13T01-47-52-409Z-1.json`, with 58542 bytes, and `request-2026-10-13T01-47-52-409Z-2.json`, with 60131 bytes.
- The search for `dotclaude build stamp` finds no match in either body.
- The search for `0.28.0`, `3fc4e0e`, `shaSource`, and `"informational"` finds no match in either body.
- The session id appears once in each body.
  That id is not text of the record.
- The second body holds the prompt `yes`, and it holds the prompt `ok` too.
  So the second body is the request after the second record.
  The model did not see the record in that request.

## Point 3: the usage report

- With `CLAUDE_CONFIG_DIR` set to the sandbox config, `builds.byBuild` holds `0.28.0 3fc4e0e` for one session.
  The session `616c6432-743d-49d6-bc88-ca84641b1ed9` has the build `0.28.0 3fc4e0e` in `builds.latest`.
- The other nine sessions of the sandbox folder show the build `unknown`.
- A session from `just sandbox-alone plugins/dotclaude-sessions`, with the id `1fc73ffa-855e-4ced-ae05-b06e5e04d1c7`, holds no stamp row.
  It shows the build `unknown`.

## Findings

- The record is written at each start of a session.
  A `--continue` run adds a second row to the same transcript.
  The package text does not say whether a resume adds a row.
- The session `0ce1dc74-0168-415e-a4e2-a11c8f6e44d6` holds 11 stamp rows and no assistant row.
  It was made by an earlier run, not by this check.
  `dotclaude-usage` does not list it, and the cause was not traced.

## Gaps

- The check runs one session, two prompts, and one model.
- The `just sandbox` folder held transcripts from earlier runs, so the check reads only the session of this check.
  The check does not run `just sandbox-clean`, because that removes those transcripts.

## Resume and Repeated Starts, 2026-10-13

This section gives the causes of two findings of the sandbox check, the decision, and the fix.

### Finding 1: A Resume Adds a Second Row

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

### Finding 2: Session `0ce1dc74` Has 11 Rows and No Assistant Row

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

### Gaps

- `$.fs.read` rejects a file over 4 MiB.
  The largest local transcript is 3.85 MB, and none is over 4 MiB.
  A larger transcript gives no text, so the stamp is written at each start, as before.
  The first-row rule of the report keeps that duplicate out of the build.
- The project-folder rule is not measured on Windows.
- The command for the main session, which proves the fix live, is below.
  Run it twice on one build, and the row count must not change after the second run.

```text
just sandbox --model haiku --continue -p "Reply with the word ok." --debug-file <temp>/p38-resume.log
grep -c -F 'dotclaude build stamp' <temp>/dotclaude-sandbox/config/projects/<project>/<session>.jsonl
```

### Live Check From the Main Session, 2026-10-13

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
