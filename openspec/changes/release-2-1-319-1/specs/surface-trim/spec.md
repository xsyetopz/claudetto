## ADDED Requirements

### Requirement: Tool Results Stay Folded

Claudetto SHALL NOT make the transcript draw a tool result in full outside the ctrl+o transcript, `--verbose`, or a row the person expanded. No `ui.render` hook SHALL set `isExpanded` on a `ToolGroup`.

#### Scenario: A Search Run

- **WHEN** the agent runs `grep -rn x .` with 127 lines of output, then an MCP search, in the default view
- **THEN** each result shows at most the engine's fold and "(ctrl+o to expand)"

#### Scenario: The Hook Is Gone

- **WHEN** `plugins/claudetto/hooks/` is read
- **THEN** no hook sets `isExpanded`, and `fold.ts` and its entry in `register.ts` are deleted

#### Scenario: The Person Asks for All

- **WHEN** the person presses ctrl+o
- **THEN** every result shows in full, as the engine draws it
