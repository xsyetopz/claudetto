# Proposal

## Why

claudetto stops correct work too often. Each stop costs the user a prompt, or costs the model a turn.

- The gate asks on `python3 -I "$py"`. The env-file finding in `plugins/claudetto/src/blocks/gate/findings/fed.ts` cannot read `$py`, and the project has an env file.
- The gate made a finding on a `sed` command whose script held the text `.env`. The script is text to match. It is not a file to read.
- The classifier denies some calls with "the model gave no answer". The cause is not confirmed. One candidate is the 2048-token thinking budget that Claude Code 2.1.316 gives a model when `o1e(model)` is true (`Z9` in `chunk-a8r9352h.js`).
- `/claudetto:setup` asks one fixed `$.ui.ask` dialog. That dialog takes no more than 4 groups, and all 4 are in use, so it has no place for the sandbox toggles. It also cannot see what the user's settings already hold.

## What Changes

- The gate finds no env-file read in the script argument of `sed`, `awk`, `grep`, and the other `PATTERNED` commands, whether the script comes as `-e`, as `--expression`, or as the first word.
- The gate settles the interpreter case once a lab case for `python3 -I "$py"` shows which part of the command made the ask. See `design.md`.
- A test shows whether the thinking budget cuts the classifier's reply. Only after that test does the classifier change. The same test runs on `cheapSummary`.
- **BREAKING**: `/claudetto:setup` no longer answers in code with `$.ui.ask`. The command body tells the model to read the user's settings, compare them with the claudetto snippet, and ask about each difference with `AskUserQuestion`. The sandbox toggles become questions of that flow.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `tier-profiles`: `Setup Asks What to Keep` changes from a code-only `$.ui.ask` dialog to a flow that the model runs.
- `permission-policy`: adds the rule that a match script is not a file read.
- `low-hitl`: adds the rule that a classifier reply cut by its budget is reported as cut, not as "no answer".
