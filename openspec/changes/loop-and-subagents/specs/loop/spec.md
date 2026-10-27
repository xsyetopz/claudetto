## Purpose

The claudetto `/loop` command: it runs a prompt again and again in the open session with bounds that the built-in `/loop` does not have.

## ADDED Requirements

### Requirement: Loop Command

`/loop [interval] <prompt>` SHALL answer in place of the built-in command, and `/loop stop` and `/loop status` SHALL end and show the loop.
A missing interval SHALL let the model pick each wait.

#### Scenario: Start

- **WHEN** the user runs `/loop 10m check the CI of PR 12`
- **THEN** claudetto saves the loop and sends the prompt as the first turn

### Requirement: Loop Bounds

A loop SHALL stop after its bound of turns, and SHALL stop when the 5-hour or the weekly share reaches the red band of `kernel/budget.ts`.
Each stop SHALL give one line that names the cause.

#### Scenario: Red Band

- **WHEN** a loop runs and the weekly share reaches the red band
- **THEN** the loop stops before the next turn, with a line that names the band

### Requirement: Cache-Aware Wait

A wait that the model picks SHALL be shorter than the prompt cache TTL in effect, or at least 20 minutes longer, because a wait just past the TTL pays the full write with little saving.
A wait for a command output SHALL use `Monitor`, not a timer.

#### Scenario: Wait Inside TTL

- **WHEN** the TTL in effect is 5 minutes and the model asks for a wait of 6 minutes
- **THEN** the wait is 4 minutes 30 seconds

### Requirement: Loop State

The loop SHALL keep its prompt, interval, count of turns, and bounds in `.claude/claudetto/loop.json`, and a `--resume` of the session SHALL restore it.

#### Scenario: Resume

- **WHEN** a session with a loop ends and the user runs `claude --resume`
- **THEN** the loop goes on with the count of turns that it had
