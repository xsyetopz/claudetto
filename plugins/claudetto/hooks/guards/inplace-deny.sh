#!/bin/sh
# PreToolUse command hook for REQ-GUARDS-079 (issue #98). hooks.json narrows it with `if` rules
# (`Bash(sed -i*)`, `Bash(perl -i*)`), so it runs only for an in-place edit and needs no input.
cat >/dev/null
printf '%s\n' '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Use the Edit tool for this change, not an in-place sed or perl: Edit refuses a file you have not read, and it shows the diff of the change. Read the file, then Edit it."}}'
