# run-limits Specification

## Purpose
A run cannot burn usage without bound. The design is borrowed from `agent-usage-guard` (MIT) and `loop-breaker` of `mishgoldenberg/claude-mods` (MIT), and the defaults are theirs, each copied with its source line into `design.md`, "Run Limits". This spec states no value, and our own rows change them later.

## Requirements

### Requirement: Hold Subagent Fan-Out

The system SHALL hold a subagent start through the `agent.spawn` hook when the starts in the window pass the cap, with a `deny` reason that names the count and the setting to change (`AgentSpawnResult.deny` is a `string` per `clawdipedia` route `extend/mod-api/agent`). The length of the window and the default of the cap come from `design.md`, "Run Limits".

#### Scenario: Burst

- **WHEN** the cap is reached inside the window
- **THEN** the next start is denied with the count and how to raise the cap

### Requirement: Cap Calls at Heavy Context

The system SHALL cap tool calls per period when the context is heavy, and SHALL tell the model why. The period, the cap, and the meaning of heavy come from `agent-usage-guard` as `design.md`, "Run Limits", records it.

#### Scenario: Heavy Context Loop

- **WHEN** the calls in the period pass the cap at heavy context
- **THEN** the next call is held and the model receives one line with the reason

### Requirement: Refuse Repeated Failures

After the same call fails the fail limit, the system SHALL refuse an identical retry and tell the model to stop and report. The starting values of `failLimit` and `editLimit` are those of `loop-breaker` as `design.md`, "Run Limits", records them, and this spec states neither.

#### Scenario: Identical Failure at the Limit

- **WHEN** the same command has failed `failLimit` times with the same error
- **THEN** the next identical call is refused with the earlier error as the reason

### Requirement: Background Tasks at Stop

At Stop, the system SHALL report each background task still running, using `background_tasks` from the Stop input.

#### Scenario: Running Monitor

- **WHEN** a monitor still runs at Stop
- **THEN** the reply lists it

### Requirement: End Stuck Agents

The system SHALL end a subagent that `design.md`, "Run Limits", defines as stuck. This requirement states no limit, and it is not built while the time half of that definition is unmeasured and no reading shows how a mod ends a foreground subagent.

#### Scenario: Source of the Definition

- **WHEN** the definition is written
- **THEN** it reads `loop-breaker` and the one self-report that calls an agent stuck after "an hour or more with no real changes", or in a loop of the same action (a comment on r/claudeai of 2026-10-27, line 90 of the saved page, kept outside this repo), which is not a measurement

#### Scenario: Stuck Agent

- **WHEN** a running subagent meets that definition
- **THEN** the system ends it and tells the model why in one line

### Requirement: Limits Are Settings

The cap, the window, and the fail limits SHALL come from `userConfig`, and the user SHALL be able to override each. The default of the window is the value that `design.md`, "Run Limits", records.

#### Scenario: Override

- **WHEN** the user sets a cap in `userConfig`
- **THEN** the system uses it in place of the default

### Requirement: Open Items at Stop

At Stop, the system SHALL block a stop once when the final reply holds an open Markdown task item (`- [ ]`) or ends on a question, unless each open item carries a blocker the hook can verify: a `! <command>` for the user to run, a denial that a tool result in this turn holds, or an open `AskUserQuestion`. It SHALL read only that syntax and the turn's tool results, and a `userConfig` switch MUST turn it off.

#### Scenario: Prose That Mentions a Remaining Budget

- **WHEN** the reply says "Remaining budget is fine." in prose and then lists finished edits as plain bullets
- **THEN** the stop passes, because the reply holds no `- [ ]` item and does not end on a question

#### Scenario: A Done Task Item

- **WHEN** the reply lists `- [x] add the test` and no `- [ ]` item
- **THEN** the stop passes

#### Scenario: A Blocker Word with No Verifiable Blocker

- **WHEN** an open item reads `- [ ] add the permission check to gate.ts` or `- [ ] write the approval test`
- **THEN** the stop is blocked and the item is listed, because a word in the item is not a blocker

#### Scenario: Open Items Under Any Heading

- **WHEN** `- [ ]` items sit under `## Open`, `## What I Need from You`, or no heading, and carry no `! <command>`
- **THEN** the stop is blocked and the items are listed

#### Scenario: An Offer in Prose

- **WHEN** the reply ends with "Want me to write the test next?"
- **THEN** the stop is blocked and the block names the offer as work to do or to give a blocker for

#### Scenario: The Request List the Output Style Prescribes

- **WHEN** the reply lists `- [ ] Send what the empty message was meant to say.` under `## What I Need from You`, with no `! <command>`
- **THEN** the stop is blocked and the item is listed, and a `- [ ]` item that carries `! <command>` passes

#### Scenario: A Paid Run That Waits for the User

- **WHEN** an open item names a paid run and gives the exact `! <command>` to approve it
- **THEN** the stop passes

#### Scenario: An Open Item with No Denial in the Turn

- **WHEN** an open item has no `! <command>`, no `AskUserQuestion` is open, and no tool result in this turn holds a denial
- **THEN** the stop is blocked, and the block says that this turn holds no denial, command, or open question to block on

#### Scenario: The Second Stop

- **WHEN** the model answers the block and stops again with `stop_hook_active` set
- **THEN** the stop passes

#### Scenario: A Stop Another Hook Blocks

- **WHEN** a hook beneath this one already blocks the stop
- **THEN** that block stands and this check adds nothing

#### Scenario: Switched Off

- **WHEN** the user turns the switch off in `userConfig`
- **THEN** no reply is read at Stop and no stop is blocked by this check

### Requirement: A Stop Loop with No Progress Ends the Turn

At the first Stop block that follows a stretch with no file change, claudetto SHALL end the turn with `preventContinuation` and a `stopReason` that names the loop and says `/goal clear` drops the goal. A stretch runs from the last Stop to this one. A write that ran SHALL set a flag and every Stop SHALL clear it. This replaces the count of three blocks in a row.

#### Scenario: Goal That Never Meets

- **WHEN** a `/goal` turn writes no file
- **THEN** the turn ends after the first check, and `/goal clear` stays the user's choice

#### Scenario: Every Stretch Writes

- **WHEN** every stretch of a goal writes a file
- **THEN** claudetto never stops it

#### Scenario: Progress Without a Write

- **WHEN** a stretch's progress is `Bash` only or read-only, or its write was denied or failed
- **THEN** the flag stays clear and the turn ends at the next Stop block

#### Scenario: Another Stop Hook

- **WHEN** a user's own Stop hook blocks after a stretch with no write
- **THEN** claudetto ends the turn, because that block has the same shape
- **AND** claudetto's own open-items block is not stopped, and a Stop with no block changes nothing

### Requirement: A Stop on an API Error Notifies

With `notificationsEnabled` not `false`, a stop that an API error ended SHALL raise one notification that names the error. It SHALL NOT raise a notification for the permission, idle, or elicitation notices, which stay with the native channel (`feature-map.md`, "Decisions of the user, 2026-11-05", task 3.5).

#### Scenario: API Error

- **WHEN** a turn stops on an API error
- **THEN** one notification names the error

#### Scenario: Switched Off

- **WHEN** `notificationsEnabled` is `false`
- **THEN** no notification is raised

### Requirement: Named Files Exist

Before a reply or a subagent's final report reaches the person, the system SHALL check each absolute or `~/` file that a `! <command>` step in an inline code span or a fenced block names, and SHALL block the stop when one does not exist. The block MUST name the path and the command. It SHALL skip the operands the command makes (`mkdir`, `touch`, the last operand of `cp` and `mv`, a `git clone` destination, a redirect target) and a relative path.

#### Scenario: A Step Names a File That Was Never Written

- **WHEN** the reply says to run `! bun /tmp/probe-cmds-scripts/dump.ts` and that file does not exist
- **THEN** the stop is blocked and the reason names `/tmp/probe-cmds-scripts/dump.ts` and the command

#### Scenario: The File Exists

- **WHEN** the same reply is given and the file exists
- **THEN** the stop passes

#### Scenario: The Command Makes the Path

- **WHEN** the reply says to run `! mkdir -p /tmp/x` and `/tmp/x` does not exist
- **THEN** the stop passes

#### Scenario: A Relative Path

- **WHEN** the reply says to run `! bun scripts/dump.ts`
- **THEN** the stop passes, because the working directory of the step is unknown

#### Scenario: A Subagent's Final Report

- **WHEN** a subagent's final report names a missing file in a `! <command>` step
- **THEN** the subagent's stop is blocked with the same reason, before the lead reads the report

### Requirement: Uncommitted Session Changes Block the Stop Once

At a Stop that no earlier check blocked and that `stop_hook_active` does not mark, claudetto SHALL run `git status` on the files the session's file tools wrote. When any is still changed and the permission chain would not deny `git commit`, the Stop SHALL be blocked once. The block names the files and tells the agent to commit each finished, checked slice as its own commit, and to leave failing work uncommitted with the reason.

#### Scenario: Edited and Uncommitted

- **WHEN** the session edited `src/a.ts`, git reports it modified, and the turn ends
- **THEN** the Stop is blocked with a text naming `src/a.ts` that asks for one commit per revertable slice

#### Scenario: The User Said Not to Commit

- **WHEN** the same files are uncommitted but the ledger holds a `no-commit` constraint
- **THEN** the Stop is not blocked

#### Scenario: Committed

- **WHEN** the session edited `src/a.ts` and committed it before the turn ended
- **THEN** the Stop is not blocked
