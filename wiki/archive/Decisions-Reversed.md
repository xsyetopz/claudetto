# Decisions-Reversed

The decisions of 0.x that 1.0.0 reverses, with the reason for each reversal.
The decisions in force are in [Decisions](Decisions).

## Settings

None yet.

## Prompt

None yet.

## Router

None yet.

## Tools

### D7 Auto-fix hook

- Old choice: a `PostToolUse` hook logged each edited path to a session file.
  A `Stop` hook ran the project formatters and linters on the logged files.
  The variable `DOTCLAUDE_AUTOFIX` turned it on.
- Reason for the reversal: the edited-files log is a state file, and 1.0.0 keeps no such file.
  The feature, its hooks, and the variable are removed.
- Sources: the line of [Release 0.28](Release-0.28) that says the auto-fix at `Stop` is gone.
  [Off-Switches](Off-Switches) says that no hook runs a project formatter outside the sandbox.

## Layout

None yet.

## Evidence

None yet.
