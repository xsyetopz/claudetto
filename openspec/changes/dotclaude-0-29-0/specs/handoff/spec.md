## ADDED Requirements

### Requirement: Trimmed session file

The handoff entry SHALL write a trimmed copy of the Claude Code session JSONL to `.claude/handoffs/` (design D19).
The copy SHALL keep the user turns, the final assistant text of each turn, and the tool calls, with each tool result cut to `HANDOFF_RESULT_MAX_BYTES`, except a tool result that the final assistant text cites.The handoff SHALL NOT change the source JSONL.

#### Scenario: Trim

- **WHEN** the handoff runs on a session with a tool result of 50 KB
- **THEN** the copy holds that result cut to `HANDOFF_RESULT_MAX_BYTES`, and the source JSONL is unchanged

### Requirement: Continuation prompt and OpenSpec state

The handoff SHALL add a continuation prompt with the goal, the next step, and the name and open tasks of the active OpenSpec change.
The continuation prompt SHALL say that the tool results that the final assistant text does not cite are cut, and that the earlier assistant text is the record (probe 1.9).

#### Scenario: Active change

- **WHEN** the handoff runs in a project with an active change that has 3 open tasks
- **THEN** the continuation prompt names the change and the 3 open tasks

### Requirement: Load in a new session

A new session SHALL load the handoff with `claude --resume` on the trimmed file, or as a prompt when the probe of design D19 shows that a trimmed file does not resume.
The wiki SHALL give the command.

#### Scenario: Resume

- **WHEN** the user loads a handoff in a new session
- **THEN** the first answer names the goal and the next open task

### Requirement: Compaction stays off

The snippet SHALL keep compaction off, because the handoff replaces it.

#### Scenario: Snippet

- **WHEN** a test reads the snippet
- **THEN** compaction is off
