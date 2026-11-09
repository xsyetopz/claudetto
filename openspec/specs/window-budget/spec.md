# window-budget Specification

## Purpose
The five-hour and weekly windows are a budget that claudetto measures, so that every saving is shown in window points and not assumed. The method is borrowed from the Botfarm poll of the usage endpoint and from the statusline `rate_limits` fields.

## Requirements

### Requirement: The Weekly Share Slows the Session

When the seven-day share used is at or above 90%, the prompt hook SHALL state the share as a fact line, and the root prompt SHALL carry the instruction to start no subagent fan-out and no paid eval run, and to report the remaining share with each reply that spent more than one percent of it.

#### Scenario: Share at 99%

- **WHEN** the prompt hook reads a seven-day share of 99%
- **THEN** its line names the share and holds no instruction
- **AND** the root prompt tells the session to start no fan-out or paid run
