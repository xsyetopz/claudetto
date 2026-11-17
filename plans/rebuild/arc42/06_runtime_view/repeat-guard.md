# Repeat Guard

- [ ] **RT-033** claudetto shall match a repeated call by outcome (the same call input for texts under 80 chars), with a test per known-bad case from a real transcript, on read-only calls only (the guard once withheld the output of WRITE commands). A Bash `test; cat file` is split by a `tool.call` hook: the rest runs alone, then the file is read by `$.tool.call` of `Read` AFTER the rest, with the text appended to Bash `stdout` (not `context`); wrapper tests for deferred tools fold the deferral rule (ToolSearch present) into one shared guard.
  Acceptance: a repeated read-only call is answered from the first result; a write command's output is never withheld. Verification: test.
  Basis: reported. Status: partial at 088a227c (features/repeat exists).
  Source: openspec/changes/archive/2026-11-09-release-2-1-319/settings-review.txt:3267; plugins/claudetto/hooks/features/repeat/texts.ts@088a227c.
