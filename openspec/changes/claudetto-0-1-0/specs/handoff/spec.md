# Spec Delta: `handoff`

## Purpose

Keeps a long session going at a low cost: a handoff file replaces the compaction summary, so the session never stops with "Prompt is too long" and keeps what the next part of the work needs.

## ADDED Requirements

### Requirement: Handoff replaces compaction by default

When Claude Code compacts the main thread with the trigger `auto` or `manual`, `claudetto` SHALL replace the summary with a handoff.
The new context SHALL hold one user message with the text of the first user message and the handoff, and the tail.
The first user message and the handoff SHALL be in one message, because `num_turns` counts each user message that a hook gives back (`handoff-turns-301.md`).
This SHALL work in the TUI, in plain `-p`, and in `-p --input-format stream-json`.

#### Scenario: Auto handoff in plain `-p`

- **WHEN** a plain `-p` run reaches the compaction threshold
- **THEN** the handoff replaces the summary, the run continues, and the run keeps its `result` and its cost

#### Scenario: A subagent compacts

- **WHEN** a subagent thread compacts
- **THEN** `claudetto` does not change the compaction

### Requirement: The tail stays whole

The new context SHALL keep, as the original engine messages, each message from the first assistant message of the last reply with a tool use to the end.
The handoff prompt SHALL name each tool call of the first message of the tail and say that its result stays in the context,
because the fork sees neither the call nor its result (`handoff-cost-301.md`).

#### Scenario: The newest tool result is not in the fork

- **WHEN** the handoff is written from a transcript that does not have the newest tool result
- **THEN** the tail still holds that result, and the model does not repeat the step

#### Scenario: A reply in two assistant messages

- **WHEN** the last reply has two tool uses, which Claude Code keeps as two assistant messages
- **THEN** the tail starts at the first of the two, so each tool result keeps its call and Claude Code repairs none (`handoff-p-301.md`)

### Requirement: A tail call is marked `RAN`

The handoff prompt SHALL ask to mark each tool call of the tail `RAN`, not `DONE`, because the call can have failed (`sandbox-handoff-301.md`).
The handed text SHALL say that the result of each `RAN` step is in the messages after the handoff.

#### Scenario: A tail call that the guard denied

- **WHEN** the handoff is written while a tool call of the tail has no result in the fork
- **THEN** the handoff marks that call `RAN` and states no result or error for it

### Requirement: No tail after an ended turn

When the last message is an assistant reply with no tool use, the turn has ended, and the new context SHALL keep no tail (`handoff-retention-301.md`).

#### Scenario: A manual compaction between two turns

- **WHEN** the user runs `/compact` after a turn that read large files
- **THEN** the new context has one user message with the first user message and the handoff, and the next turn does not start a second compaction

### Requirement: Done steps stay done

The handoff SHALL mark each step that is done as `DONE`, with the exact values that its tool results gave.
The handoff prompt SHALL tell the model not to call a fact from a tool result unverified or unseen.
The message that hands over SHALL tell the model not to run a done step again only because its result is not in the context.
A full repeat of a done step SHALL count as a failure in the handoff eval.

#### Scenario: A done read

- **WHEN** the handoff marks the read of chunk 1 as `DONE` with its first line
- **THEN** the next part of the session does not read chunk 1 again in full

### Requirement: Small re-checks

The handoff is a summary that the model wrote, so a fact in it can be wrong.
The message that hands over SHALL let the model confirm a fact that decides the result, with the smallest call that shows the fact, such as a `Read` with `limit` 1, or one run of a check command.

#### Scenario: A wrong fact in the handoff

- **WHEN** the handoff gives a wrong value for a fact that decides the result
- **THEN** the model can confirm the fact with one small call and give the right value

### Requirement: Ground check of quoted values

The handoff prompt SHALL tell the model to quote each exact value in backticks, copied from the tool result.
Before it hands over, `claudetto` SHALL look for each backticked value of 4 characters or more, paired inside one line, in the messages of the session.
For each value that is not there, `claudetto` SHALL log the miss and add a warning to the handed message that asks for the smallest call that shows the value.

#### Scenario: A changed value

- **WHEN** the handoff quotes `amber-falcon-24` and the tool result gave `amber-falcon-42`
- **THEN** the handed message warns about `amber-falcon-24`, the model reads 1 line, and the model gives `amber-falcon-42`

#### Scenario: A paraphrased value

- **WHEN** the handoff quotes a value in words that no tool result holds
- **THEN** the warning costs at most one small call, and the result stays correct

### Requirement: Works with MiniSpec

When a MiniSpec change is active, the handoff SHALL follow the `minispec` spec: it names the change folder and the next open task, and it writes the file to `minispec/changes/<name>/handoff.md`.
The checked tasks in `tasks.md` SHALL be the record of the done work, so the handoff does not repeat them in full.

#### Scenario: A handoff during a change

- **WHEN** a handoff runs while a MiniSpec change is active
- **THEN** the handoff file is in the change folder, and it names the next open task

### Requirement: Checked handoff file

`claudetto` SHALL write the handoff to a file, and SHALL check that the file exists and is not empty before it changes the context.
A handoff file SHALL be 10 lines or less in the context.

#### Scenario: The write fails

- **WHEN** the handoff file does not exist or is empty after the write
- **THEN** `claudetto` gives the compaction back to Claude Code, and the context is not changed by `claudetto`

### Requirement: Fallback to the built-in compaction

When there is no request to fork from, such as after a resume, a `haiku` completion SHALL write the handoff from a digest of the messages of at most 15,000 tokens.
When the handoff cannot be written, `claudetto` SHALL give the compaction back to Claude Code.
The cases are: a digest that does not fit, an empty reply, and an API error.

#### Scenario: Manual compact after a resume

- **WHEN** the user runs `/compact` as the first prompt after `--resume`
- **THEN** the completion writes the handoff, and the run keeps each labeled value and its `result`

### Requirement: Digest of large results

When all tool results do not fit in the digest, each result that is smaller than an equal share of the room SHALL stay whole.
Each other result SHALL keep its first line, its last line, and each labeled line, and SHALL then fill its share with lines from its start and its end.
After the session, the prompt SHALL list the labeled lines of each cut result again, under its call, because the completion can miss a line in a long digest (`handoff-retention-301.md`).

#### Scenario: One large read and one small read

- **WHEN** the session read a file of 30,000 lines and a file of 2 lines, and there is nothing to fork
- **THEN** the digest has the small file whole, and the start, the end, and each labeled line of the large file

### Requirement: Trigger with a safety margin

The auto handoff SHALL trigger below the client block limit by at least the largest growth of one API call plus the cost of the write turn.
For the Opus, Sonnet, and Fable models the trigger SHALL be at or below 225,000 tokens.
For Haiku it SHALL be at or below 100,000 tokens.

#### Scenario: A long turn

- **WHEN** one turn makes many API calls and the context grows past the trigger in the middle of the turn
- **THEN** the handoff runs before the next request, and no request stops with "Prompt is too long"

### Requirement: Manual handoff command

`claudetto` SHALL give a manual handoff command, `/handoff`.
In a session with a terminal surface, the command SHALL write and check the file, clear the chat, and submit the resume prompt in one step.
In `-p`, and when the file cannot be written, the command SHALL use the compaction path: it runs `/compact`, and the handoff hook replaces the compaction.

#### Scenario: Manual handoff in the TUI

- **WHEN** the user runs the handoff command in the TUI
- **THEN** the chat is cleared, and the next prompt starts from the handoff file

### Requirement: Handoff command steps after its turn

Claude Code refuses a clear, a submit, and a compaction in the hook of a command,
and `turn.complete` does not fire after a command that a hook answers (`handoff-p-301.md`).
So a `$.clock.after` timer SHALL run the clear and the submit, or `/compact`, after the hook.
`$.session.compact` is not available in `-p`, so the compaction path runs `/compact`.
A clear starts a new session with no session start, so `claudetto` SHALL register the command again after the clear.

#### Scenario: A second handoff in one session

- **WHEN** the user runs the handoff command a second time after the first clear
- **THEN** the command is still there, and it hands over again

#### Scenario: Handoff in `-p`

- **WHEN** `claude -p "/handoff"` runs on a resumed session
- **THEN** the handoff hook replaces the compaction before the process ends

### Requirement: Visible progress

In the TUI, the handoff SHALL show its progress in the way that compaction does, with a status line while the file is written and a final notice in the transcript.
In `-p`, it SHALL draw nothing.

#### Scenario: Handoff in the TUI

- **WHEN** an auto handoff runs in the TUI
- **THEN** a status line shows while the file is written, and a notice names the file at the end

### Requirement: Opt-in compaction profile

`claudetto` SHALL give one setting, the `compaction` option of the plugin, that turns the handoff off and uses the built-in compaction.
With this setting, `claudetto` SHALL set the compaction to its cheapest form that it can set.
That form is the compaction of Claude Code with no change, because its summary request reads the prompt cache.
The manual handoff command SHALL then not be there.

#### Scenario: Compaction chosen

- **WHEN** the user sets the compaction profile
- **THEN** compaction runs as built in, and no handoff file is written

### Requirement: Managed environments

Claude Code gives `session.compact` only to the plugins in the managed `appendPlugins` list when managed settings are present, a managed MCP file exists, or the login is Team or Enterprise.
In that case, a plugin that a person installs does not get the hook.
`claudetto` SHALL then say once at session start that the handoff of a compaction is off, and SHALL name the `appendPlugins` entry that turns it on.

#### Scenario: The hook cannot run

- **WHEN** the session starts with a Team login and `claudetto` is not in `appendPlugins`
- **THEN** the user sees one notice, and the built-in compaction stays on
- **AND** `/handoff` stays, because the guard does not skip `command.run`

#### Scenario: A managed MCP file only

- **WHEN** the only managed fact is a managed MCP server file, which the mod API does not show
- **THEN** no notice shows

#### Scenario: The organization lists `claudetto`

- **WHEN** the managed settings list `claudetto` in `enabledPlugins` and `appendPlugins`
- **THEN** the handoff runs, and no notice shows

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
