## MODIFIED Requirements

### Requirement: Lightest Option Wins

The lookup SHALL run the Context7 CLI `ctx7`, never the Context7 MCP server, and its standing context SHALL stay below the server's, which stood at 907 characters of the first request on Claude Code `2.1.314` (`openspec/changes/archive/2026-10-31-release-0-1-0/decisions.md`, D35). The old `find-docs` skill is not restored as it was (D15, D35).

#### Scenario: Choice Recorded

- **WHEN** the lookup ships
- **THEN** `openspec/changes/archive/2026-10-31-release-0-1-0/decisions.md` holds the standing size of each option and the pick
