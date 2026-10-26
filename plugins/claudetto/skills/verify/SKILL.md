---
name: verify
description: Checks that the code of a change does what its tasks, specs, and design say, before the archive.
disable-model-invocation: true
argument-hint: "[change]"
allowed-tools: Bash(minispec *)
---

1. Pick the change: `$ARGUMENTS`, or the one change of `minispec list`.
   Ask the user when more than one fits. In `claude -p`, take the first change of `minispec list` (the newest), and say which.
2. Run `minispec validate <name> --strict`.
3. Check each item, and give the file and line of each finding:
   - Each task is ticked, and its work is in the code.
   - Each scenario of the delta specs has a test, and the test passes.
   - The code follows each decision of `design.md`.
4. List each gap with its fix, and fix it only when the user says so.
5. End the report with this line to the user, as the last line:
   With no gap, `Next: /claudetto:archive`.
   With a gap, `Next: /claudetto:apply` after the fix.
