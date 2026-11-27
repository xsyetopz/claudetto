# Transcript

## TRANSCRIPT-001 Draw the Typed Message in the Brand Colour

claudetto draws a message typed in the composer in Claude Code's `claude` colour and leaves every other prompt origin to the engine.

Given a message typed in the composer
When the terminal draws the transcript
Then its text is drawn in the `claude` colour after the leading prompt mark

## TRANSCRIPT-002 Collapse a Tool Call to One Row

claudetto draws a collapsed tool call as one `● <Verb> <N> <noun> (<subject>)` row, and a failed one adds `failed (ctrl+o to expand)`.

Given a Bash call that failed
When the terminal draws the call collapsed
Then the row reads `Ran 1 command (git status --short)` followed by `failed (ctrl+o to expand)`

## TRANSCRIPT-003 Aggregate a Calls-Only Group

claudetto draws a collapsed group of calls as one row that counts the calls per verb and names equal subjects once with `×n`.

Given a group of three Read calls and one Grep call
When the terminal draws the group collapsed
Then the row reads `Read 3 files (a.ts · b.ts ×2), searched 1 pattern (foo)`

## TRANSCRIPT-004 Draw Nothing for a Collapsed Result

claudetto draws no row for a collapsed tool result, since its call's row stands for it.

Given a collapsed tool result
When the terminal draws it
Then nothing is drawn

## TRANSCRIPT-005 Leave an Expanded Row to the Engine

claudetto leaves a tool row drawn expanded (ctrl+o, `--verbose`) to the engine's own drawing.

Given a tool call drawn expanded
When the terminal draws it
Then the one-line row is not drawn
