# 18.11: a /tmp cleanup lists only what this session marked

Hypothesis: a cleanup list built from markers that hold the creating session's id lists only that session's folders.

Prediction: under `/tmp/probe-18-11`, with `marked/` (marker holds this session's id), `unmarked/` (no marker) and `other/` (marker holds another id), `ours.sh` prints only `marked`.

Setup: each folder this session creates gets `.created-by-claudetto` holding `$CLAUDE_CODE_SESSION_ID` at creation. The cleanup handed to the user is `ours.sh <root>`, never a list of paths found by name in the repo or a transcript.

Command: `sh ours.sh /tmp/probe-18-11` (2026-11-07).

Result: `/tmp/probe-18-11/marked` only.

Mutant: `ours.sh` without the session-id comparison prints `/tmp/probe-18-11/marked` and `/tmp/probe-18-11/other`, so the comparison is what keeps another session's folder off the list.
