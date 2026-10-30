## Purpose

A session leaves a short handoff before its context is lost, and the next session receives it once. Loss by a typed `/clear` is the case that failed.

## ADDED Requirements

### Requirement: Handoff before a Clear

The system SHALL write a handoff file when a session ends with reason `clear`, before the context is dropped.

#### Scenario: Typed Clear after a Short Session

- **WHEN** the user types `/clear` in a session that has no earlier handoff
- **THEN** a file `handoff-<UTC stamp>.md` exists under `.claude/claudetto/handoffs/`
- **AND** the next session injects its text once

#### Scenario: Clear with Nothing to Keep

- **WHEN** the session has no user turn
- **THEN** no file is written and no error is shown

### Requirement: Fits the End Bound

The writer SHALL finish inside the time bound that `session.end` gives (`next.budget`), so it MUST NOT call a model at session end.

The bound reaches the read and not the write. `$.fs.write` is `(path: string, text: string) => Promise<void>` in the vendored types (`plugins/claudetto/.claude-plugin/types/claude-code/index.d.ts:3350`), so it takes no timeout and a write cannot be cut off through the Mod API. What the writer does instead is reserve time for it: `WRITE_RESERVE_MS` is 400 and `forTail` is `remainingMs - WRITE_RESERVE_MS` capped at 10,000 (`plugins/claudetto/src/register.ts:39` and `:90`), so the `tail` read carries the timeout and the write keeps the reserve. This is the most the API allows, and the Slow Disk scenario below is met for the case that is detectable.

#### Scenario: Slow Disk

- **WHEN** no time is left of the bound the event gives, so the read cannot start inside it
- **THEN** the writer writes nothing and logs one line that names the occasion and the cause (`register.ts:91-94`)
- **AND** a write that is itself slow is not cut off, because `$.fs.write` takes no timeout

#### Scenario: Messages Unreadable at End

- **WHEN** `$.session.messages` returns nothing at `session.end`
- **THEN** the writer reads the transcript file of the session
- **AND** this holds without a branch, because the transcript file is the writer's only source: `register.ts:96` reads it with `tail` and nothing in the plugin calls `$.session.messages`, so there is no path on which an empty reading of that call changes what is written

### Requirement: Handoff before a Compaction

The system SHALL write a handoff file in `classic.PreCompact`, before an automatic or manual compaction runs. `2.1.311` awaits the `PreCompact` hooks before the summary request starts, and the default bound of the hooks is 600,000 ms (`design.md`, Handoff Hooks). Whether that bound holds for a mod handler is not read, so the writer is kept short.

#### Scenario: Auto Compaction

- **WHEN** an automatic or manual compaction starts
- **THEN** a handoff file exists before the compaction request is sent

### Requirement: Handoff Content

The handoff written by Claude SHALL use the nine sections of `samzilverberg/claude-handoff` (MIT): Goal, Standing instructions, Decisions log, Current state, In progress, Next steps, Key files and symbols, Gotchas and dead ends, Open questions. The code-built fallback holds only what code can read from the messages: recent messages and file paths from tool input (`who96/claude-code-context-handoff`, MIT).

#### Scenario: Claude Wrote One

- **WHEN** Claude wrote a file with the nine sections under `.claude/claudetto/handoffs/` in this session
- **THEN** the session end keeps that file and writes no code-built file beside it
- **AND** the next session injects it with the line that Claude wrote it, and not the line that code built it

#### Scenario: Fallback

- **WHEN** Claude wrote none
- **THEN** the code-built file is written, and it says that it holds no decisions

### Requirement: Claudetto Names the Nine Sections

Claudetto SHALL name the folder and the nine headings in the injected `context_management` text of the handoff state, because no hook can write that file for Claude: `classic.SessionEnd` and `classic.PreCompact` make no model call (requirement "Writer Cost"), and code reads no decision and no reason out of a transcript.

#### Scenario: Nudge in the Surface

- **WHEN** a session runs with the handoff state
- **THEN** the `context_management` block names the handoff folder and the nine headings, and it costs no extra request

### Requirement: Handoff Points, Does Not Copy

The handoff written by Claude SHALL reference specs, plans, issues, commits, and diffs by path or URL instead of copying their text, and SHALL redact secrets such as keys and passwords. Both rules are from `mattpocock/skills` `handoff` (MIT).

#### Scenario: Plan Exists

- **WHEN** the session worked from a plan file
- **THEN** the handoff names the plan path and does not paste its text

#### Scenario: Secret in the Session

- **WHEN** the session text holds a key or a password
- **THEN** the handoff holds neither

### Requirement: Stale Handoff Is Listed, Not Loaded

The system SHALL list a handoff older than the stale limit and SHALL NOT inject it. The starting limit is 7 days, borrowed from `m4cd4r4/clear-resume` (MIT), and it changes only with our own evidence.

#### Scenario: Old File

- **WHEN** the newest handoff is older than the limit
- **THEN** the next session shows one line with its path and age, and injects nothing

### Requirement: Read Once

The system SHALL inject the newest handoff in the next session of the same project after `clear` or `resume`, and SHALL NOT inject it again in that session. The injection runs from the one-shot timer of `onClear`, because Claude Code refuses `$.prompt.submit` inside `classic.SessionStart` (`design.md`). The step queue is removed, and this timer is not.

#### Scenario: Second Prompt

- **WHEN** the handoff was injected in the first turn
- **THEN** no later turn of that session carries it again

### Requirement: No Silent Failure

The system MUST log a notice to the user when a handoff write fails, when a resume is dropped, or when an injection fails.

#### Scenario: Failed Write

- **WHEN** the write of the file returns size 0
- **THEN** the user sees one line that names the file and the cause

#### Scenario: Dropped Resume

- **WHEN** the submit of the read-back fails or is refused
- **THEN** the user sees one line, and the handoff file stays on disk

### Requirement: Writer Cost

The code-built writer SHALL make no model request. The Claude-written handoff is written inside a turn that already runs, so it adds output tokens and no request. A separate summarizer request exists only if the compaction path chooses one.

#### Scenario: No Model Call

- **WHEN** the code-built writer runs
- **THEN** no request to a model is made by the writer
