## ADDED Requirements

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
- **AND** the lab tests are `limits/bound-output.test.ts`, "a long test run is cut to its head and tail, and the whole text is saved", "a command that is no test, build, or lint run is left whole", "an output that fits is left whole and saves nothing", "maxTestOutputChars 0 leaves every output whole", and "an output that cannot be saved is cut, and the cut line says so"

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

## MODIFIED Requirements

### Requirement: Background Tasks at Stop

At Stop, the system SHALL report the background tasks still running, using `background_tasks` from the Stop input, when the set of their ids and statuses differs from the set it last reported. It SHALL report each task in the set, and SHALL NOT report the same set again. A Stop that a stop hook already continued SHALL report nothing.

#### Scenario: Running Monitor

- **WHEN** a monitor still runs at Stop
- **THEN** the reply lists it

#### Scenario: The Same Set Twice

- **WHEN** the next Stop holds the same tasks with the same statuses
- **THEN** the list is not added again, and a task whose status changed, or a new task, is listed
- **AND** the lab tests are `limits/stop.test.ts`, "a changed list of background tasks is added once" and "a task whose status changed is listed again, and a new task joins the list"

### Requirement: Open Items at Stop

At Stop, the system SHALL block a stop once when the final reply holds an open Markdown task item (`- [ ]`, under any bullet or number) that carries no `! <command>`, unless an `AskUserQuestion` of the turn is open, which means asked and not yet answered. A question of an earlier turn, a refused call, and a denial in a tool result SHALL excuse no item. The block SHALL list each item and SHALL tell the model to ask each through the ask tool the session lists and to delete it from the reply. A session with no one to answer SHALL get no such block. The system SHALL also block a stop once when the final reply holds more than one `! <command>` item, and the block SHALL tell the model to keep the one the work needs first and to ask for the next after the person has run it, because the person's `!` runs and messages queue while the agent works (the person, 2026-11-09). The check SHALL read only that syntax and the turn's tool calls, and a `userConfig` switch MUST turn it off.

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
- **AND** the lab test is `limits/open-items.test.ts`, "a checkbox item is a question: the block says to ask it and delete the item"

#### Scenario: An Open Ask

- **WHEN** an `AskUserQuestion` of the turn has no answer yet
- **THEN** the stop passes
- **AND** a refused call, a denial in the turn, and a question of an earlier turn excuse nothing
- **AND** the lab tests are `limits/open-items.test.ts`, "an open AskUserQuestion is the blocker of an open item", "a refused call in the turn, a host-denied Glob or Grep included, excuses no item", and "a question of an earlier turn excuses nothing"

#### Scenario: A Headless Session

- **WHEN** the session is headless and an item carries no `! <command>`
- **THEN** no ask block is raised, because no one can answer
- **AND** the lab test is `limits/open-items.test.ts`, "a headless session, which has no AskUserQuestion, gets no ask block for a question item and still gets the command block"

#### Scenario: An Offer in Prose

- **WHEN** the reply ends with "Want me to write the test next?" and holds no `- [ ]` item
- **THEN** this check passes, because it reads only the item syntax

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
- **THEN** the stop is blocked once, the block names both commands, and tells the model to keep the one the work needs first and ask for the other in a later reply
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
