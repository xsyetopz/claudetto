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
