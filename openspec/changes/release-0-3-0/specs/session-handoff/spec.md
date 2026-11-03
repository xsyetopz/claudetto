## MODIFIED Requirements

### Requirement: Handoff before a Clear

The system SHALL write a handoff file when the agent calls the handoff tool, before the plugin clears the session. A `/clear` the person types SHALL write no file for a read-back.

#### Scenario: Typed Clear after a Short Session

- **WHEN** the user types `/clear` in a session that has no earlier handoff
- **THEN** the next session injects no handoff text

#### Scenario: Clear with Nothing to Keep

- **WHEN** the session has no user turn
- **THEN** no file is written and no error is shown

### Requirement: Read Once

The system SHALL inject the handoff that the handoff tool wrote in the first turn of the session the plugin's own clear starts, and after a `resume`, and SHALL NOT inject it again in that session. The injection is a `$.prompt.submit` queued after the plugin's own clear, because `session.start` does not fire on `/clear`.

#### Scenario: Second Prompt

- **WHEN** the handoff was injected in the first turn
- **THEN** no later turn of that session carries it again

### Requirement: Handoff before a Compaction

The system SHALL write a handoff file in a `session.compact` hook, from the event's `messages`, before an automatic, manual, or plugin compaction of the main conversation runs. A `precompute` installs nothing, a subagent's compaction (`agentId`) leaves the main conversation as it was, and a handover installs Claude's own handoff, so none of the three gets a code-built file.

#### Scenario: Auto Compaction

- **WHEN** an automatic or manual compaction of the main conversation starts
- **THEN** a handoff file exists before the compaction runs

#### Scenario: No File for a Precompute or a Subagent

- **WHEN** the compaction is a `precompute`, or it carries an `agentId`
- **THEN** no handoff file is written

### Requirement: Handoff Content

Every handoff SHALL have one layout, whether Claude or code wrote it. The layout is a fixed title line `# Handoff`, then a fixed source line, then the nine `##` sections of `samzilverberg/claude-handoff` (MIT) in this order: Goal, Standing instructions, Decisions log, Current state, In progress, Next steps, Key files and symbols, Gotchas and dead ends, Open questions. No other `#` or `##` heading SHALL appear. The code-built fallback fills only what code can read from the messages (`who96/claude-code-context-handoff`, MIT): the recent turns go under Current state, and the touched file paths go under Key files and symbols. Each section that code cannot fill SHALL hold one fixed line that says code could not read it.

#### Scenario: Claude Wrote One

- **WHEN** Claude wrote a file in the template layout under `.claude/claudetto/handoffs/` in this session
- **THEN** the session end keeps that file and writes no code-built file beside it
- **AND** the next session injects it with the line that Claude wrote it, and not the line that code built it

#### Scenario: Fallback

- **WHEN** Claude wrote none
- **THEN** the code-built file has the same title and the same nine headings in the same order, and its Decisions log says that code could not read decisions

#### Scenario: Two Files Compared

- **WHEN** a code-built file and a Claude-written file are compared
- **THEN** their headings, as a list of lines starting with `#`, are equal

### Requirement: Claudetto Names the Nine Sections

Claudetto SHALL show the whole handoff template in the injected `context_management` text of the handoff state: the file name pattern, the title line, and the nine headings at their level. The template SHALL come from the same code the fallback writer uses, so the two cannot differ. No hook can write the file for Claude, because the compaction writer makes no model call (requirement "Writer Cost"), and code reads no decision and no reason out of a transcript.

#### Scenario: Nudge in the Surface

- **WHEN** a session runs with the handoff state
- **THEN** the `context_management` block shows the handoff folder, the file name pattern, the title line, and the nine `##` headings, and it costs no extra request

#### Scenario: One Source

- **WHEN** a heading of the template changes in code
- **THEN** both the `context_management` text and the code-built file change with it, and a test shows they match

## REMOVED Requirements

### Requirement: Fits the End Bound

**Reason**: No writer runs at session end: a typed `/clear` writes no file, and the compaction writer reads `messages` with no `tail` read to bound.
**Migration**: None needed. The handoff tool and the compaction writer write the file.

## ADDED Requirements

### Requirement: One File Name

Every handoff file SHALL be named `handoff-YYYY-MM-DDTHH-MM-SS.md` in UTC, the name the read-back accepts. When Claude writes a handoff in this session with another name under the handoff folder, the session end SHALL copy its text to a file with a valid name and show the user one line that names both files, so the next session injects Claude's handoff and never an older file in its place.

#### Scenario: Misnamed Claude File

- **WHEN** Claude wrote `.claude/claudetto/handoffs/handoff-20261031T-14-1.md` in this session
- **THEN** the session end writes its text to a validly named file, and the user sees one line that names both files

#### Scenario: Misnamed File Cannot Be Read

- **WHEN** the misnamed file cannot be read
- **THEN** the session end writes the code-built file with a valid name, and the user sees one line that names the misnamed file and the cause

#### Scenario: Read-Back after a Misnamed File

- **WHEN** the next session starts after that session
- **THEN** it injects the newest validly named file, which is the one just written, and not an older one

### Requirement: Core's Context Note Is Removed

With the handoff state on, claudetto SHALL remove core's `context_management` system section, because it tells the model not to hand off mid-task, against the handoff block in the same request.

#### Scenario: Section Answered

- **WHEN** a session runs with the handoff state
- **THEN** the system prompt holds no "you don't need to wrap up early or hand off mid-task" sentence

### Requirement: A Handoff Tool Ends the Session's Work

Claudetto SHALL register a handoff tool that takes the goal, the state with proof, the decisions and why, the ruled-out approaches, the check command, the files touched, and the next prompt. It SHALL add the user's recent prompts word for word, write the file, and, once the session is idle, clear the session and submit the handoff and the next prompt once.

#### Scenario: Agent Calls the Tool

- **WHEN** the agent calls the handoff tool at the end of its tasks
- **THEN** the file is written, the session is cleared at idle, and the new session's first turn holds the handoff and the next prompt, with no history crossing over

#### Scenario: One Shot

- **WHEN** the new session's first turn ends
- **THEN** no second clear or submit runs from the same call

### Requirement: A Typed Clear Gets No Read-Back

A `/clear` that the person types SHALL get no handoff read-back, so each handoff holds no earlier one and `/clear` keeps its meaning. A typed `/clear` is told apart by the composer origin of its command.

#### Scenario: Typed Clear

- **WHEN** the person types `/clear`
- **THEN** the next session's first request holds no handoff text

#### Scenario: Handoff after a Read-Back

- **WHEN** a session that started from a handoff writes its own handoff
- **THEN** the new file does not contain the earlier handoff's text
