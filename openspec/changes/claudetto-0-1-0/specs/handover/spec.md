# Spec Delta: `handover`

## Purpose

Keeps a long session going at a low cost: a handover file replaces the compaction summary, so the session never stops with "Prompt is too long" and keeps what the next part of the work needs.

## ADDED Requirements

### Requirement: Handover replaces compaction by default

When Claude Code compacts the main thread with the trigger `auto` or `manual`, `claudetto` SHALL replace the summary with a handover.
The new context SHALL hold the first user message, one user message with the handover, and the tail.
This SHALL work in the TUI, in plain `-p`, and in `-p --input-format stream-json`.

#### Scenario: Auto handover in plain `-p`

- **WHEN** a plain `-p` run reaches the compaction threshold
- **THEN** the handover replaces the summary, the run continues, and the run keeps its `result` and its cost

#### Scenario: A subagent compacts

- **WHEN** a subagent thread compacts
- **THEN** `claudetto` does not change the compaction

### Requirement: The tail stays whole

The new context SHALL keep, as the original engine messages, each message from the last assistant message with a tool use to the end.
The handover prompt SHALL say that the last tool call and its result stay in the context.

#### Scenario: The newest tool result is not in the fork

- **WHEN** the handover is written from a transcript that does not have the newest tool result
- **THEN** the tail still holds that result, and the model does not repeat the step

### Requirement: Done steps stay done

The handover SHALL mark each step that is done as `DONE`, with the exact values that its tool results gave.
The handover prompt SHALL tell the model not to call a fact from a tool result unverified or unseen.
The message that hands over SHALL tell the model not to run a done step again only because its result is not in the context.
A full repeat of a done step SHALL count as a failure in the handover eval.

#### Scenario: A done read

- **WHEN** the handover marks the read of chunk 1 as `DONE` with its first line
- **THEN** the next part of the session does not read chunk 1 again in full

### Requirement: Small re-checks

The handover is a summary that the model wrote, so a fact in it can be wrong.
The message that hands over SHALL let the model confirm a fact that decides the result, with the smallest call that shows the fact, such as a `Read` with `limit` 1, or one run of a check command.

#### Scenario: A wrong fact in the handover

- **WHEN** the handover gives a wrong value for a fact that decides the result
- **THEN** the model can confirm the fact with one small call and give the right value

### Requirement: Ground check of quoted values

The handover prompt SHALL tell the model to quote each exact value in backticks, copied from the tool result.
Before it hands over, `claudetto` SHALL look for each backticked value of 4 characters or more, paired inside one line, in the messages of the session.
For each value that is not there, `claudetto` SHALL log the miss and add a warning to the handed message that asks for the smallest call that shows the value.

#### Scenario: A changed value

- **WHEN** the handover quotes `amber-falcon-24` and the tool result gave `amber-falcon-42`
- **THEN** the handed message warns about `amber-falcon-24`, the model reads 1 line, and the model gives `amber-falcon-42`

#### Scenario: A paraphrased value

- **WHEN** the handover quotes a value in words that no tool result holds
- **THEN** the warning costs at most one small call, and the result stays correct

### Requirement: Works with MiniSpec

When a MiniSpec change is active, the handover SHALL follow the `minispec` spec: it names the change folder and the next open task, and it writes the file to `minispec/changes/<name>/handover.md`.
The checked tasks in `tasks.md` SHALL be the record of the done work, so the handover does not repeat them in full.

#### Scenario: A handover during a change

- **WHEN** a handover runs while a MiniSpec change is active
- **THEN** the handover file is in the change folder, and it names the next open task

### Requirement: Checked handover file

`claudetto` SHALL write the handover to a file, and SHALL check that the file exists and is not empty before it changes the context.
A handover file SHALL be 10 lines or less in the context.

#### Scenario: The write fails

- **WHEN** the handover file does not exist or is empty after the write
- **THEN** `claudetto` gives the compaction back to Claude Code, and the context is not changed by `claudetto`

### Requirement: Fallback to the built-in compaction

When the handover cannot be written, `claudetto` SHALL give the compaction back to Claude Code.
The cases are: no request to fork from, an empty reply, and an API error.

#### Scenario: Manual compact after a resume

- **WHEN** the user runs `/compact` as the first prompt after `--resume`
- **THEN** the built-in compaction runs and succeeds

### Requirement: Trigger with a safety margin

The auto handover SHALL trigger below the client block limit by at least the largest growth of one API call plus the cost of the write turn.
For the Opus, Sonnet, and Fable models the trigger SHALL be at or below 225,000 tokens.
For Haiku it SHALL be at or below 100,000 tokens.

#### Scenario: A long turn

- **WHEN** one turn makes many API calls and the context grows past the trigger in the middle of the turn
- **THEN** the handover runs before the next request, and no request stops with "Prompt is too long"

### Requirement: Manual handover command

`claudetto` SHALL give a manual handover command.
In a session with a terminal surface, the command SHALL write and check the file, clear the chat, and submit the resume prompt in one step.
In `-p`, the command SHALL use the compaction path.

#### Scenario: Manual handover in the TUI

- **WHEN** the user runs the handover command in the TUI
- **THEN** the chat is cleared, and the next prompt starts from the handover file

### Requirement: Visible progress

In the TUI, the handover SHALL show its progress in the way that compaction does, with a spinner and a final notice.
In `-p`, it SHALL draw nothing.

#### Scenario: Handover in the TUI

- **WHEN** an auto handover runs in the TUI
- **THEN** a spinner shows while the file is written, and a notice names the file at the end

### Requirement: Opt-in compaction profile

`claudetto` SHALL give one setting that turns the handover off and uses the built-in compaction.
With this setting, `claudetto` SHALL set the compaction to its cheapest form that it can set.

#### Scenario: Compaction chosen

- **WHEN** the user sets the compaction profile
- **THEN** compaction runs as built in, and no handover file is written

### Requirement: Managed environments

Claude Code gives `session.compact` only to the plugins in the managed `appendPlugins` list when managed settings are present, a managed MCP file exists, or the login is Team or Enterprise.
In that case, a plugin that a person installs does not get the hook.
`claudetto` SHALL then say once at session start that the handover is off, and SHALL name the `appendPlugins` entry that turns it on.

#### Scenario: The hook cannot run

- **WHEN** the session starts with a Team login and `claudetto` is not in `appendPlugins`
- **THEN** the user sees one notice, and the built-in compaction stays on

#### Scenario: The organization lists `claudetto`

- **WHEN** the managed settings list `claudetto` in `enabledPlugins` and `appendPlugins`
- **THEN** the handover runs, and no notice shows

### Requirement: Managed setup help

On a machine with no organization in control, `claudetto` SHALL offer to add itself to `appendPlugins` and `enabledPlugins` in the managed settings file of the OS.
It SHALL show the exact JSON change, and SHALL give one `! sudo ...` command for the user to run, because the `Bash` tool cannot answer a password prompt.
The command SHALL merge into the file when the file exists, and SHALL create the file when it does not.

#### Scenario: A personal machine with no managed file

- **WHEN** the user asks for the managed setup and no managed settings file exists
- **THEN** `claudetto` shows the new file and one `! sudo` command that creates the file

### Requirement: Warning before a new managed file

Before it offers a new managed settings file, `claudetto` SHALL warn that the file turns on the guard, so each other plugin that is not in `appendPlugins` loses `session.compact`.

#### Scenario: Other plugins installed

- **WHEN** the user asks for the managed setup, no managed file exists, and another plugin uses `session.compact`
- **THEN** the warning names that plugin before the `! sudo` command shows

### Requirement: No managed setup where an organization is in control

When an organization manages Claude Code on the machine, `claudetto` SHALL NOT offer the managed setup, and SHALL tell the user to ask the admin for the `appendPlugins` entry.

#### Scenario: A machine that an organization manages

- **WHEN** the managed settings come from the server or from an MDM profile
- **THEN** `claudetto` gives no `sudo` command, and tells the user to ask the admin
