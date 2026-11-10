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

At Stop, the system SHALL report the background tasks still running, using `background_tasks` from the Stop input, when the set of their ids and statuses differs from the set it last reported. It SHALL report each task in the set, and SHALL NOT report the same set again. A Stop that a stop hook already continued SHALL report nothing.

#### Scenario: Running Monitor

- **WHEN** a monitor still runs at Stop
- **THEN** the reply lists it

#### Scenario: The Same Set Twice

- **WHEN** the next Stop holds the same tasks with the same statuses
- **THEN** the list is not added again, and a task whose status changed, or a new task, is listed
- **AND** the lab tests are `limits/stop.test.ts`, "a changed list of background tasks is added once" and "a task whose status changed is listed again, and a new task joins the list"

### Requirement: End Stuck Agents

A subagent SHALL run no longer than `agentMaxMinutes` (default 15, 0 off) from its `agent.spawn`. Past the limit, the `tool.check` hook SHALL deny each tool call the subagent makes, with a reason that tells it to end, report what is done and what is left, and names the setting. The hook API offers no call that ends a subagent (`$.agent` holds `spawn`, `list`, and `register`; `$.turn.abort` ends only the main loop's turn), so a refused call ends one.

#### Scenario: Source of the Default

- **WHEN** the default is set
- **THEN** it rests on 36 delegated runs in `runs.jsonl` across three projects on 2026-11-10: median 313 seconds, 75th percentile 676, 90th 1385, longest 1592, with 6 past 15 minutes, and on the person calling a 28-minute run too long to help

#### Scenario: Overtime Subagent

- **WHEN** a subagent calls a tool past `agentMaxMinutes`
- **THEN** the call is denied, and a main-loop call at the same time still goes
- **AND** the lab tests are `limits/hold.test.ts`, "a subagent's call past agentMaxMinutes is refused, and the main loop's still goes", "with no option a subagent runs 15 minutes", and "agentMaxMinutes 0 turns the time limit off"

### Requirement: Limits Are Settings

The cap, the window, and the fail limits SHALL come from `userConfig`, and the user SHALL be able to override each. The default of the window is the value that `design.md`, "Run Limits", records.

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

### Requirement: Subagent Starts Stay Under the Environment's Cap

The `agent.spawn` hook SHALL deny a start when the number of running subagents has reached `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, with a reason that names the count. An agent that has ended SHALL NOT count. An unset, non-numeric, or non-positive value SHALL set no cap. The window cap of starts holds beside it.

#### Scenario: A Start Past the Cap

- **WHEN** the environment sets a cap of 2 and 2 subagents run
- **THEN** the third start is denied
- **AND** the lab tests are `limits/hold.test.ts`, "a start past the environment's cap of running subagents is refused", "an agent that has ended does not count against the cap", and "a start with no cap in the environment is not refused for the count of running subagents"

### Requirement: An Interrupt Is Not a Failure

A tool failure that the person's interrupt caused SHALL NOT count toward the fail limit. A call with no `tool_use_id`, which is a query, SHALL NOT be held or counted.

#### Scenario: Interrupts

- **WHEN** the person interrupts the same call `failLimit` times
- **THEN** the next identical call is not refused
- **AND** the lab tests are `limits/hold.test.ts`, "a user's interrupt is not counted as a failure" and "a query without a tool_use_id is never held"

### Requirement: Test and Build Output Is Cut to Its Head and Tail

When a `Bash` command starts a test, build, lint, or check run (`bun test`, `bun run build`, `just check`, `cargo test`, `go test`, `pytest`, `npm test`, `make`, `tsc`, `xcodebuild`, `gradle`, `mvn`, and the like), and its output is longer than `maxTestOutputChars` (default 8000), the hook SHALL keep the first 40% and the last 40% of that limit of each of `stdout` and `stderr`, and SHALL put a marker line with the count of characters cut between them.

#### Scenario: A Long Test Run

- **WHEN** `bun test` prints more than `maxTestOutputChars` characters
- **THEN** the result holds the head, a marker naming the saved file, and the tail
- **AND** the lab tests are `limits/bound-output.test.ts`, "a long test run is cut to its head and tail, and the whole text is saved", "a command that is no test, build, or lint run is left whole", "an output that fits is left whole and saves nothing", "maxTestOutputChars 0 leaves every output whole", and "an output that cannot be saved is still cut"

### Requirement: The Whole Cut Output Is Saved

When the hook cuts an output, it SHALL save the whole output to `.claude/claudetto/output/output-<id>.txt` and name that file in the marker. When the file cannot be saved, the marker SHALL say so.

#### Scenario: Save Fails

- **WHEN** the whole output cannot be saved
- **THEN** the output is still cut and the marker says it was not saved

### Requirement: Some Output Stays Whole

A value of `0` for `maxTestOutputChars` SHALL turn the cut off. A command that is no such run, and an output that fits, SHALL stay whole. An error result SHALL keep its error form.

#### Scenario: Cut Off

- **WHEN** `maxTestOutputChars` is `0`
- **THEN** every output stays whole

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

When none of the agent's own tasks runs, the system SHALL remove the `/tmp` folders that carry the session's marker, the worktrees the agent created, and the branches it created, with a plain `git worktree remove` and `git branch -d`, so what holds work stays. It SHALL block once to name what stays, unless the reply names each.

#### Scenario: A Dirty Worktree

- **WHEN** a worker's worktree holds uncommitted changes and its branch has an unmerged commit
- **THEN** both stay and the Stop names them
- **AND** the lab test is `cleanup.test.ts`, "a clean worker worktree and its merged branch go; a dirty worktree and an unmerged branch stay and the stop names them"

### Requirement: A Subagent Removes Only Its Own Leftovers

A subagent's last turn SHALL remove only its own leftovers, from its own messages.

#### Scenario: A Sibling's Leftover

- **WHEN** a subagent ends and a leftover was made by the main agent
- **THEN** the subagent removes none of it
