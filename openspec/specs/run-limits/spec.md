# run-limits Specification

## Purpose
A run cannot burn usage without bound. The design is borrowed from `agent-usage-guard` (MIT) and `loop-breaker` of `mishgoldenberg/claude-mods` (MIT), and the defaults are theirs, each copied with its source line into `design.md`, "Run Limits". This spec states no value, and our own rows change them later.

## Requirements

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

At Stop, the system SHALL report the background tasks still running, using `background_tasks` from the Stop input, when the set of their ids and statuses differs from the set it last reported. It SHALL report each task in the set, and SHALL NOT report the same set again. A Stop that a stop hook already continued SHALL report nothing.

#### Scenario: Running Monitor

- **WHEN** a monitor still runs at Stop
- **THEN** the reply lists it

#### Scenario: The Same Set Twice

- **WHEN** the next Stop holds the same tasks with the same statuses
- **THEN** the list is not added again, and a task whose status changed, or a new task, is listed
- **AND** the lab tests are `limits/stop.test.ts`, "a changed list of background tasks is added once" and "a task whose status changed is listed again, and a new task joins the list"

### Requirement: Limits Are Settings

The window, the heavy-call cap, and the fail limits SHALL come from `userConfig`, and the user SHALL be able to override each. The default of the window is the value that `design.md`, "Run Limits", records. The start cap, the depth cap, and the time cap of a subagent are Claude Code's own keys in the `env` block that setup writes, and `userConfig` holds none of them.

#### Scenario: Override

- **WHEN** the user sets a cap in `userConfig`
- **THEN** the system uses it in place of the default

### Requirement: Open Items at Stop

At Stop, the system SHALL block a stop once when the final reply holds an open Markdown task item (`- [ ]`) that carries no `! <command>`, unless an `AskUserQuestion` of the turn is open. The block SHALL list each item and SHALL tell the model to ask each through the ask tool the session lists and to delete it from the reply. The system SHALL also block a stop once when the final reply holds more than one `! <command>` item. A `userConfig` switch MUST turn the check off.

#### Scenario: Prose That Mentions a Remaining Budget

- **WHEN** the reply says "Remaining budget is fine." in prose and then lists finished edits as plain bullets
- **THEN** the stop passes, because the reply holds no `- [ ]` item

#### Scenario: A Done Task Item

- **WHEN** the reply lists `- [x] add the test` and no `- [ ]` item
- **THEN** the stop passes

#### Scenario: A Blocker Word with No Verifiable Blocker

- **WHEN** an open item reads `- [ ] add the permission check to gate.ts` or `- [ ] write the approval test`
- **THEN** the stop is blocked and the item is listed, because a word in the item is not a blocker

#### Scenario: Open Items Under Any Heading

- **WHEN** `- [ ]` items sit under `## Open`, `## What I Need From You`, or no heading
- **THEN** the stop is blocked and the items are listed

#### Scenario: An Item Is a Question

- **WHEN** a reply holds a `- [ ]` item
- **THEN** the block says the item is a question, to ask it through the ask tool, and to delete it from the reply
- **AND** the lab test is `limits/open-items.test.ts`, "a checkbox item is a question, and the block names each item"

#### Scenario: An Open Ask

- **WHEN** an `AskUserQuestion` of the turn has no answer yet, which means asked and not yet answered
- **THEN** the stop passes
- **AND** a question of an earlier turn, a refused call, and a denial in a tool result SHALL excuse no item
- **AND** the lab tests are `limits/open-items.test.ts`, "an open AskUserQuestion is the blocker of an open item", "a refused call in the turn, a host-denied Glob or Grep included, excuses no item", and "a question of an earlier turn excuses nothing"

#### Scenario: A Headless Session

- **WHEN** the session is headless and an item carries no `! <command>`
- **THEN** no ask block is raised, because no one can answer, and a session with no one to answer SHALL get no such block
- **AND** the lab test is `limits/open-items.test.ts`, "a headless session, which has no AskUserQuestion, gets no ask block for a question item and still gets the command block"

#### Scenario: An Offer in Prose

- **WHEN** the reply ends with "Want me to write the test next?" and holds no `- [ ]` item
- **THEN** this check passes, because the check SHALL read only that item syntax and the turn's tool calls, with the item under any bullet or number

#### Scenario: An Open Item with No Denial in the Turn

- **WHEN** an open item has no `! <command>`, no `AskUserQuestion` is open, and a tool result in this turn holds a denial or none does
- **THEN** the stop is blocked, and the block tells the model to ask the item and delete it, because a denial excuses nothing

#### Scenario: The Request List the Output Style Prescribes

- **WHEN** the reply lists `- [ ] Send what the empty message was meant to say.` under `## What I Need From You`, with no `! <command>`
- **THEN** the stop is blocked and the item is listed, and a plain `- ` bullet that carries `! <command>` passes

#### Scenario: A Command in a Checkbox

- **WHEN** the reply lists `- [ ] ! gh auth login` under `## What I Need From You`
- **THEN** the stop is blocked, and the block lists the line and says to move it into a `- ! <command>` bullet with no checkbox, because nobody ticks a checkbox in a reply (the person, 2026-11-09)

#### Scenario: Two Commands at Once

- **WHEN** the reply lists two `- ! <command>` bullets under `## What I Need From You`
- **THEN** the stop is blocked once, the block names both commands, and the block SHALL tell the model to keep the one the work needs first and to ask for the next after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09)
- **AND** a reply with one `- ! <command>` bullet passes

#### Scenario: A Paid Run That Waits for the User

- **WHEN** an open item names a paid run and gives the exact `! <command>` to approve it
- **THEN** the stop passes

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

### Requirement: Only a Write That Ran Is the Agent's

The slice tracker SHALL mark a file as written by the agent only when a file tool's write to it succeeded, and SHALL NOT mark a file that a `Bash` sweep found changed. A denied or failed write SHALL leave the file unmarked.

#### Scenario: Denied Write

- **WHEN** each `Write` to `.claude/skills/openspec-propose/SKILL.md` was denied by the sandbox
- **THEN** no Stop text says "(you last wrote it)" for that file

#### Scenario: File the Session Never Edited

- **WHEN** `package.json` changed on disk but no file tool of the session wrote it
- **THEN** it is not listed under the uncommitted files the agent changed

### Requirement: Other Edits Are Committed Under Their Source

When a changed file is not the agent's, the Stop text SHALL tell the agent to commit it as its own commit whose message names its likely source (the person, a formatter, an install), unless the ledger holds a `no-commit` constraint. It SHALL NOT tell the agent to leave the file out.

#### Scenario: A Dependency Bump Nobody Claimed

- **WHEN** `package.json` and `bun.lock` changed by an install and the agent's own slice is committed
- **THEN** the Stop text asks for a separate commit that names the install as the source

#### Scenario: The Person Said Not to Commit

- **WHEN** the ledger holds a `no-commit` constraint
- **THEN** the Stop text does not ask for the commit

### Requirement: A Headless Session Is Not Asked to Commit

The uncommitted-changes block SHALL NOT be raised when the permission chain denies `git commit`, or when it answers `ask` in a session with no one to answer. It SHALL be raised when it answers `ask` in a session that has someone to answer.

#### Scenario: Headless Ask

- **WHEN** the commit check answers `ask` and the session is headless
- **THEN** the Stop passes
- **AND** the lab tests are `slices.test.ts`, "a commit that needs an answer lets the stop pass in a headless session" and "a commit that needs an answer blocks the stop in a session that has someone to answer"

### Requirement: An Interrupt Is Not a Failure

A tool failure that the person's interrupt caused SHALL NOT count toward the fail limit. A call with no `tool_use_id`, which is a query, SHALL NOT be held or counted.

#### Scenario: Interrupts

- **WHEN** the person interrupts the same call `failLimit` times
- **THEN** the next identical call is not refused
- **AND** the lab tests are `limits/hold.test.ts`, "a user's interrupt is not counted as a failure" and "a query without a tool_use_id is never held"

### Requirement: The Status Line Gets a Heartbeat and a Window File

Each step of a turn SHALL write the clock time to `.claude/claudetto/heartbeat/<session>.txt` under the project, and each measured turn SHALL write `.claude/claudetto/statusline/<session>.json` holding the compaction window (`rawMaxTokens` from the local `summary` breakdown, which sends no request) and, when the config holds one, the theme.

#### Scenario: A Measured Turn

- **WHEN** a turn is measured and the config holds a `theme` row
- **THEN** the line file holds `window` and `theme`
- **AND** the lab tests are `limits/line-file.test.ts`, "each measured turn writes the compaction window and the theme for the status line, from the free summary" and "a session with no theme row writes the window alone"

### Requirement: A Failed Status Line Write Costs Only the Refresh

A failed write of the heartbeat or window file SHALL cost only that refresh and SHALL NOT fail the turn.

#### Scenario: A Write Fails

- **WHEN** the write of a heartbeat or line file fails
- **THEN** the turn goes on

### Requirement: A Session Name Is Safe in a File Name

A session name SHALL map each character outside letters, digits, `_`, and `-` to `_`.

#### Scenario: A Name with a Slash

- **WHEN** the session name holds a `/`
- **THEN** the file name holds `_` in its place

### Requirement: A Closing Stop Waits for or Removes the Session's Leftovers

At a Stop that no earlier check blocked, the system SHALL read the tasks the agent's own calls started (a task whose id appears in a tool result of the agent), and SHALL block once when a shell or monitor of its own still runs and the reply does not name its id, listing it and telling the agent to stop it with `TaskStop`. A background subagent, and a task the reply names, SHALL be waited on with no block. A `stop_hook_active` Stop SHALL NOT block.

#### Scenario: A Monitor the Reply Does Not Name

- **WHEN** the agent started a monitor and the reply does not name its id
- **THEN** the Stop is blocked once and nothing is removed
- **AND** the lab tests are `cleanup.test.ts`, "the agent's own shell and monitor that the reply does not name block the stop, and nothing is removed" and "a task the reply names, or a background subagent, is waited on: no block and nothing removed"

### Requirement: A Closing Stop Removes the Session's Leftovers

At each stop of the lead, the system SHALL remove the agent worktrees that nothing needs, as `session-hygiene` defines them. When no task of the agent runs, it SHALL also remove the worktrees and branches the agent created, with plain `git worktree remove` and `git branch -d`, so what holds work stays. It SHALL block once to name what stays of what the agent or a worker it started made, unless the reply names each. A stop SHALL NOT name another session's agent worktree; the hygiene report does.

#### Scenario: A Dirty Worktree

- **WHEN** a worktree the agent added holds uncommitted changes and its branch has an unmerged commit
- **THEN** both stay and the Stop names them
- **AND** the lab test is `cleanup.test.ts`, "an integrated worker worktree and a merged branch go; a dirty worktree, an unmerged branch, and a worker worktree with new commits stay and the stop names them"

#### Scenario: Another Session's Worker

- **WHEN** an unlocked agent worktree holds a commit the lead's branch lacks and no `Agent` call of this session started its worker
- **THEN** the worktree stays and the Stop passes without naming it
- **AND** the lab test is `cleanup.test.ts`, "a worker worktree with new commits that this session did not start stays and the stop does not name it"

#### Scenario: Workers Still Run

- **WHEN** the lead stops while a background worker runs and another worker's unlocked worktree holds only commits the lead's branch has
- **THEN** that worktree and its branch are removed, and the Stop names nothing
- **AND** the lab test is `cleanup.test.ts`, "an integrated worker worktree goes while another worker still runs"

### Requirement: A Subagent Removes Only Its Own Leftovers

A subagent's last turn SHALL remove only its own leftovers, from its own messages.

#### Scenario: A Sibling's Leftover

- **WHEN** a subagent ends and a leftover was made by the main agent
- **THEN** the subagent removes none of it

### Requirement: A Machine Short of Memory Holds New Work

Before each `Bash` or `Monitor` call and each subagent start, the system SHALL read the machine's free memory share, and below `memoryFreeMinPercent` (a `userConfig` option, default 20, 0 off) SHALL deny the call with a reason that names the free share and the five largest processes by pid and size and tells the agent to stop its own runs and wait. A command that is read-only, or whose every program is `kill`, SHALL pass. Where the share cannot be read, the call SHALL pass.

#### Scenario: Low Memory

- **WHEN** the free share is below the limit and a `Bash` call runs `bunx oxlint src/a.ts`
- **THEN** the call is denied, and the reason names the share and the largest processes

#### Scenario: Low Memory, a Kill

- **WHEN** the free share is below the limit and a `Bash` call runs `kill 4242` or `ps -ax`
- **THEN** the call goes on

#### Scenario: Low Memory, a Subagent

- **WHEN** the free share is below the limit and a subagent starts
- **THEN** the start is denied with the same reason

#### Scenario: Enough Memory, or the Limit Off

- **WHEN** the free share is at or above the limit, or `memoryFreeMinPercent` is 0, or the platform gives no share
- **THEN** the call goes on

### Requirement: A Word the Engine Refuses Names No Missing File

When the engine refuses to read an operand of a `! <command>` step as a path, the named-file check SHALL leave that operand out and SHALL still check the step's other paths, because a check that throws loses every check of that stop.

#### Scenario: A Search Pattern in a Step

- **WHEN** a reply holds `! grep -v "/\.git/" /tmp/list.txt` and `/tmp/list.txt` does not exist
- **THEN** the stop is blocked for `/tmp/list.txt`, and the block does not name the pattern
- **AND** the lab test is `named-files.test.ts`, "a search pattern the engine refuses to read as a path is not called missing"

### Requirement: A Paid Run Ends With the Budget Line

When a `Bash` call runs a model call that bills the account, which is `claude` with `-p` or `--print` or any program given `--paid`, the system SHALL end the call's result with the `Budget:` line, whatever band the last prompt carried, because no prompt follows a paid run in the same turn to carry it. Where the login supplies no reading, the result SHALL stay whole.

#### Scenario: A Paid Run

- **WHEN** a `Bash` call runs `claude -p "grade the cases"` and the engine reports a seven-day share of 41%
- **THEN** the result ends with `Budget: context 62% left, five-hour 23.5% used, seven-day 41% used`
- **AND** the lab test is `budget-run.test.ts`, "a run that calls the model ends with the Budget line, with no prompt between"

#### Scenario: Any Other Command

- **WHEN** a `Bash` call runs `echo claude -p`
- **THEN** the result is unchanged

### Requirement: A Running Command Is Stopped When One of Its Processes Grows Past a Memory Cap

While a `Bash` call runs, the system SHALL read the machine's processes every five seconds and, when a process that began after the call began holds more than `memoryProcessMaxPercent` (default 25, 0 off) of the machine's memory, SHALL stop the largest such process with `kill <pid>`. A process that began before the call SHALL stay, because it is not the call's.

#### Scenario: The Result Names the Stopped Process

- **WHEN** the system stops a process of the call
- **THEN** the call's result ends with a note that names its pid, program, and size and tells the agent to run a narrower part

#### Scenario: A Process Grows Past the Cap

- **WHEN** a `Bash` call runs `bunx oxlint src` and, five seconds in, a process that began with it holds 9 GB of a 32 GB machine
- **THEN** `kill 4242` runs, a larger process that began earlier is left alone, and the result names `4242` and `tsgolint`
- **AND** the lab test is `memory-watch.test.ts`, "a command whose process passes the cap is stopped by its pid, and the result says so"

#### Scenario: Nothing Passes the Cap

- **WHEN** every process of the call is under the cap, or `memoryProcessMaxPercent` is 0
- **THEN** no process is stopped, and with 0 no process list is read

### Requirement: A Task Item That Quotes a Command Step Is No Command for the Person

The Stop check for commands outside a `- ! <command>` bullet SHALL treat a `- [ ]` item as a command for the person only when the item text opens with `! ` or `` `! ``. An item that mentions a `! <command>` step later in its text, such as a task line copied from `tasks.md`, SHALL NOT be listed as a stray command.

#### Scenario: A Copied Task Line

- **WHEN** the reply holds `- [ ] 9.22 no "Budget" line follows a `! ` command` and no other command
- **THEN** the command check does not block the stop

#### Scenario: A Command Item

- **WHEN** the reply holds `- [ ] ! gh auth login`
- **THEN** the stop is blocked and the item is listed, because the item is a command in a checkbox

### Requirement: A Numbered Task Line Is No Question

The Stop check for questions typed as checklist items SHALL leave out a `- [ ]` item whose text opens with a task number such as `9.31`, because a report copies each unticked task of a task list whole and that line asks nothing.

#### Scenario: A Report of Unticked Tasks

- **WHEN** the reply holds `- [ ] 10.21 Run just check and just verify.` and `- [ ] Which region should I use?`
- **THEN** the stop is blocked for the region question only
- **AND** the lab test is `open-items-commands.test.ts`, "a numbered task line copied from a task list is no question, and an unnumbered item still is"

### Requirement: A Subagent's Worktree Is No Slice of the Session

The uncommitted-changes check SHALL leave out a file under `.claude/worktrees/` of the session's working directory, because a subagent wrote it in a worktree that the subagent's own stop commits.

#### Scenario: A Subagent's File

- **WHEN** a subagent edited `.claude/worktrees/agent-1/src/a.ts`, git reports it modified, and the main session's turn ends
- **THEN** the Stop is not blocked for that file
