# session-handoff Specification

## Purpose
A session leaves a short handoff before its context is lost, and the next session receives it once. Loss by a typed `/clear` is the case that failed.

## Requirements

### Requirement: Handoff before a Clear

The system SHALL write a handoff file when the agent calls the handoff tool, before the plugin clears the session. A `/clear` the person types SHALL write no file for a read-back. When the user has set a `/goal` and not cleared it, the system SHALL run `/goal <condition>` after the plugin's clear and before it sends the read-back.

#### Scenario: Typed Clear after a Short Session

- **WHEN** the user types `/clear` in a session that has no earlier handoff
- **THEN** the next session injects no handoff text

#### Scenario: Clear with Nothing to Keep

- **WHEN** the session has no user turn
- **THEN** no file is written and no error is shown

#### Scenario: A Goal Survives the Handoff

- **WHEN** the user ran `/goal all tests pass` and the agent then calls the handoff tool
- **THEN** the plugin runs `/clear`, then `/goal all tests pass`, then sends the read-back

#### Scenario: A Cleared Goal Stays Cleared

- **WHEN** the user ran `/goal all tests pass`, then `/goal clear`, and the agent calls the handoff tool
- **THEN** the plugin runs `/clear` and no `/goal`

#### Scenario: A Goal the Engine Refuses

- **WHEN** the `/goal` after the clear is refused
- **THEN** one line names the goal and the cause, and the read-back is still sent

### Requirement: Handoff before a Compaction

The system SHALL write a handoff file in a `session.compact` hook, from the event's `messages`, before an automatic, manual, or plugin compaction of the main conversation runs. A `precompute` installs nothing, a subagent's compaction (`agentId`) leaves the main conversation as it was, and a handover installs Claude's own handoff, so none of the three gets a code-built file.

#### Scenario: Auto Compaction

- **WHEN** an automatic or manual compaction of the main conversation starts
- **THEN** a handoff file exists before the compaction runs

#### Scenario: No File for a Precompute or a Subagent

- **WHEN** the compaction is a `precompute`, or it carries an `agentId`
- **THEN** no handoff file is written

### Requirement: Handoff Content

Every handoff SHALL have one layout, whether Claude or code wrote it: a fixed title line `# Handoff`, a source line, then the nine `##` sections in the order Goal, Standing Instructions, Decisions Log, Current State, In Progress, Next Steps, Key Files And Symbols, Gotchas And Dead Ends, Open Questions. No other `#` or `##` heading SHALL appear.

#### Scenario: The Source Line

- **WHEN** a handoff is written
- **THEN** the source line SHALL read `Written by Claude at <UTC time>.` for the tool's file and `Built by claudetto from the transcript at <UTC time>, with no model call.` for the code-built file

#### Scenario: A Section with Nothing to Fill It

- **WHEN** a section has no content
- **THEN** the code-built file SHALL fill each section it cannot fill with the line `None found in the transcript.`, and the tool's file SHALL fill each section the tool has no field for with `None given.`

#### Scenario: Claude Wrote One

- **WHEN** Claude wrote a file in the template layout under `.claude/claudetto/handoffs/` in this session
- **THEN** the compaction hook keeps that file and writes no code-built file beside it (`handoff.test.ts`, "a file Claude wrote is kept and no code-built one goes beside it")

#### Scenario: Fallback

- **WHEN** Claude wrote none
- **THEN** the code-built file has the same title and the same nine headings in the same order, and each section code cannot fill holds `None found in the transcript.`

#### Scenario: Two Files Compared

- **WHEN** a code-built file and a Claude-written file are compared
- **THEN** their headings, as a list of lines starting with `#`, are equal

#### Scenario: The Sections Come from a Named Template

- **WHEN** the nine sections are cited
- **THEN** they are those of `samzilverberg/claude-handoff` (MIT)

#### Scenario: The Code-Built Fallback Fills What Code Can Read

- **WHEN** code builds the handoff from the messages (`who96/claude-code-context-handoff`, MIT)
- **THEN** the recent turns go under Current State, the touched file paths go under Key Files And Symbols, the human prompts go under Standing Instructions, and the text of each `AskUserQuestion` call goes under Decisions Log
- **AND** every other section holds `None found in the transcript.`

### Requirement: Claudetto Names the Nine Sections

Claudetto SHALL show the whole handoff template in the injected `context_management` text of the handoff state: the handoff tool name, the handoff folder, the title line, and the nine headings at their level. It SHALL NOT show the file name pattern, because the tool names the file. The template SHALL come from the same code the fallback writer uses, so the two cannot differ.

#### Scenario: The Template Code

- **WHEN** a reader looks for the code that holds the template
- **THEN** it is `layout` in `hooks/handoff/layout.ts`

#### Scenario: No Hook Writes the File for Claude

- **WHEN** the compaction writer runs
- **THEN** no hook can write the file for Claude, because the compaction writer makes no model call (requirement "Writer Cost"), and code reads no decision and no reason out of a transcript

#### Scenario: Nudge in the Surface

- **WHEN** a session runs with the handoff state
- **THEN** the `context_management` block shows the handoff tool name, the handoff folder, the title line, and the nine `##` headings, and it costs no extra request (`handoff.test.ts`, "the handoff block is the only one added, and the engine's context_management section is left out")

#### Scenario: One Source

- **WHEN** a heading of the template changes in `layout.ts`
- **THEN** both the `context_management` text and the code-built file change with it

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

The system SHALL inject the handoff that the handoff tool wrote in the first turn of the session the plugin's own clear starts, and after a `resume`, and SHALL NOT inject it again in that session. The injection is a `$.prompt.submit` queued after the plugin's own clear, because `session.start` does not fire on `/clear`.

#### Scenario: Second Prompt

- **WHEN** the handoff was injected in the first turn
- **THEN** no later turn of that session carries it again

### Requirement: No Silent Failure

The system MUST log a notice to the user when a handoff write fails, when a resume is dropped, or when an injection fails. A failed code-built write SHALL log one line that begins `No handoff was written` and holds the reason and the cause. The code does not check the size of a written file.

#### Scenario: Failed Write

- **WHEN** the write of the file throws
- **THEN** the user sees one line that holds the reason and the cause (`handoff.test.ts`, "a write that fails tells the user in one line")

#### Scenario: Dropped Resume

- **WHEN** the submit of the read-back fails or is refused
- **THEN** the user sees one line, and the handoff file stays on disk (`handoff.test.ts`, "a submit the session refuses tells the user in one line and does not fail the start")

### Requirement: Writer Cost

The code-built writer SHALL make no model request. The Claude-written handoff is written inside a turn that already runs, so it adds output tokens and no request. A separate summarizer request exists only if the compaction path chooses one.

#### Scenario: No Model Call

- **WHEN** the code-built writer runs
- **THEN** no request to a model is made by the writer

### Requirement: One File Name

Every handoff file SHALL be named `handoff-YYYY-MM-DDTHH-MM-SS.md` in UTC, the name the read-back accepts. When Claude writes a handoff in this session with another name under the handoff folder, the compaction hook SHALL copy its text to a file with a valid name and show the user one line that names both files, so the next session injects Claude's handoff and never an older file in its place.

#### Scenario: A Failed Copy

- **WHEN** the copy fails
- **THEN** the hook SHALL show one line that names the misnamed file and the cause, and SHALL write no other file

#### Scenario: Misnamed Claude File

- **WHEN** Claude wrote `.claude/claudetto/handoffs/handoff-20261031T-14-1.md` in this session
- **THEN** the compaction hook writes its text to a validly named file, and the user sees one line that names both files (`handoff.test.ts`, "a misnamed handoff Claude wrote is copied to a valid name, and one line names both files")

#### Scenario: Misnamed File Cannot Be Read

- **WHEN** the misnamed file cannot be read
- **THEN** no file is written, and the user sees one line that names the misnamed file and the cause (`handoff.test.ts`, "a misnamed handoff that cannot be read writes no file, and one line names it and the cause")

#### Scenario: Read-Back after a Misnamed File

- **WHEN** the next session starts after that session
- **THEN** it injects the newest validly named file, which is the one just written, and not an older one (`handoff.test.ts`, "the next session reads the copy back, and not an older valid file")

### Requirement: Core's Context Note Is Removed

With the handoff state on, claudetto SHALL remove core's `context_management` system section, because it tells the model not to hand off mid-task, against the handoff block in the same request.

#### Scenario: Section Answered

- **WHEN** a session runs with the handoff state
- **THEN** the system prompt holds no "you don't need to wrap up early or hand off mid-task" sentence

### Requirement: A Handoff Tool Ends the Session's Work

Claudetto SHALL register a handoff tool that takes five required text fields: `goal`, `standing`, `state`, `decisions`, and `next_prompt`. It SHALL write the file, and, once the session is idle, clear the session, set the user's `/goal` again, and submit the handoff and the next prompt once. The tool SHALL NOT add the user's prompts to the file.

#### Scenario: Agent Calls the Tool

- **WHEN** the agent calls the handoff tool at the end of its tasks
- **THEN** the file is written, the session is cleared at idle, and the new session's first turn holds the handoff and the next prompt, with no history crossing over (`call.test.ts`, "the tool writes the file with its fields under the nine headings and no other")

#### Scenario: One Shot

- **WHEN** the new session's first turn ends
- **THEN** no second clear or submit runs from the same call

### Requirement: Git State Is Dated

A handoff, and the code-built fallback, SHALL state branch, ahead or behind count, and push state as of the time it was written, with that time, and the read-back SHALL tell the agent to run `git status -sb` before it reports branch or push state.

#### Scenario: Remote Moved After the Handoff

- **WHEN** a handoff says "`main` ahead 3, not pushed, as of 12:25 UTC" and `origin/main` moved after that
- **THEN** the next report states push state only after a fresh `git status -sb`

#### Scenario: Fallback File

- **WHEN** the code-built fallback is written
- **THEN** its git lines carry the write time

### Requirement: The Tool Registers Again after an Early Refusal

The system SHALL register the handoff tool at `session.start`. When the engine refuses the registration before the session binds, the system SHALL register it again after the start has gone on. When that second registration is refused too, the tool SHALL stay unregistered and the code-built handoff SHALL still work.

#### Scenario: Registered at the Start

- **WHEN** a session starts
- **THEN** the handoff tool is registered (`handoff.test.ts`, "session.start registers the handoff tool")

#### Scenario: Early Refusal

- **WHEN** the first registration is refused
- **THEN** one more registration runs after the start, and no line is shown

#### Scenario: Both Refused

- **WHEN** both registrations are refused
- **THEN** the session starts and the tool is absent

### Requirement: A Resume Reads Back Only a Newer Handoff Once

The system SHALL read the newest validly named handoff back on a `resume` only when its file time is not older than the resumed transcript's file time. It SHALL save the file name in the store before it submits, and SHALL NOT read back the name the store holds. A handoff older than the resumed transcript was written before that session's last turn, so the session holds its work already.

#### Scenario: Newer Handoff

- **WHEN** a session resumes and the newest handoff is newer than the transcript and not taken
- **THEN** the read-back is submitted once (`handoff.test.ts`, "a resume reads the newest fresh handoff back once")

#### Scenario: Handoff Older Than the Transcript

- **WHEN** the resumed transcript is newer than the handoff
- **THEN** nothing is injected (`handoff.test.ts`, "a resume of a session whose transcript is newer than the handoff injects nothing")

#### Scenario: Second Start of the Same Session

- **WHEN** the store already holds the newest name
- **THEN** nothing is injected and no line is shown

#### Scenario: No Handoff Folder

- **WHEN** the project has no handoff folder
- **THEN** nothing is injected and no error is shown (`handoff.test.ts`, "a project with no handoff folder yet takes nothing in and shows no error")

### Requirement: The Handoff Tool Refuses a Bad Call

The handoff tool SHALL refuse a call and clear nothing in three cases. While a handoff runs, a second call SHALL get "A handoff is already in progress. End your turn." When a required field (`goal`, `standing`, `state`, `decisions`, `next_prompt`) is empty after trimming, the result SHALL name the missing fields, and no file SHALL be written. When the write or the redaction fails, the result SHALL name the path and the cause and say that nothing was cleared.

#### Scenario: Second Call

- **WHEN** a call arrives while an earlier call's clear and submit have not run
- **THEN** it gets the in-progress result and no second clear or submit runs (`call.test.ts`, "a second call while one runs runs no second clear and no second submit")

#### Scenario: Missing Field

- **WHEN** a call leaves `state` empty
- **THEN** the result says "Nothing was written. Call the tool again with: state." (`call.test.ts`, "a call without a required field writes nothing and names the field")

#### Scenario: Write Fails

- **WHEN** the write fails
- **THEN** the result holds the path and the cause, and no clear runs (`call.test.ts`, "a write that fails comes back as the result and clears nothing")

#### Scenario: Handoff Again

- **WHEN** the first clear has run
- **THEN** the tool can hand off again (`call.test.ts`, "the tool can hand off again after the first clear")

### Requirement: The Tool Ends the Turn

After the file is written, the handoff tool SHALL end the main loop's current turn with `$.turn.abort`, so no request reads the whole context only to answer the tool result. The clear and the submit SHALL run from a timer after the session is idle. When the abort fails, the user SHALL see one line, and the clear and the submit SHALL still run. A failed clear SHALL submit nothing and show one line that names the file. A submit that fails after the clear SHALL show one line that names the file.

#### Scenario: Turn Aborted

- **WHEN** the tool call is accepted
- **THEN** the turn ends and the clear and the submit wait for idle (`call.test.ts`, "the turn ends with no further request, and the clear and the submit wait for the idle")

#### Scenario: Clear Fails

- **WHEN** the clear is refused
- **THEN** nothing is submitted and one line says the handoff is in its file (`call.test.ts`, "a failed clear submits nothing and says so")

#### Scenario: Submit Refused

- **WHEN** the submit is refused
- **THEN** the user sees one line (`call.test.ts`, "a submit the session refuses tells the user in one line")

### Requirement: Secrets Are Redacted before They Are Kept

Every text the handoff path keeps or sends SHALL pass the secret scanner (`secrets.ts`) first: the code-built file, the tool's file and next prompt, and a handoff file before its read-back. When the scanner cannot run, the tool SHALL refuse with the unsaved result, and the code-built writer SHALL show one "No handoff was written" line.

#### Scenario: Key in a Tool Field

- **WHEN** a tool field holds an API key
- **THEN** the file and the next prompt hold the redaction and not the key (`call.test.ts`, "a key in a field is redacted in the file and in the next prompt")

#### Scenario: Key in the Transcript

- **WHEN** a user statement holds a key and the code builds the handoff
- **THEN** the file does not hold it (`handoff.test.ts`, "a key in a statement is redacted in the handoff")

#### Scenario: Key in a File Read Back

- **WHEN** a handoff file on disk holds a key
- **THEN** the read-back text does not hold it (`handoff.test.ts`, "a key in a handoff file is redacted before the read-back injects it")

### Requirement: The Code-Built Handoff Has Caps

The code-built handoff SHALL keep the last 12 turns under Current State, the last 20 touched file paths under Key Files And Symbols, and the last 100 human prompts under Standing Instructions. It SHALL cut each quoted text, and each question under Decisions Log, to 600 characters and end the cut with an ellipsis. Human prompts SHALL come from the whole transcript file, so an instruction older than the last 12 turns stays.

#### Scenario: Old Instruction

- **WHEN** an instruction is older than the last twelve turns
- **THEN** it is still under Standing Instructions (`handoff.test.ts`, "an instruction older than the last twelve turns stays in the handoff")

#### Scenario: Long Turn

- **WHEN** a turn holds 700 characters
- **THEN** its quote holds the first 600 and an ellipsis

### Requirement: The Handoff Command

The plugin SHALL ship `commands/handoff.md`, whose description is "Hand this work to a fresh context." and whose body tells the model to finish the step in hand and then call `mcp__claudetto__handoff` as its last tool call.

#### Scenario: Person Types the Command

- **WHEN** the person types `/handoff`
- **THEN** the model finishes the step in hand and calls the handoff tool last
