## ADDED Requirements

### Requirement: Core prompt from the simple prompt

The core prompt SHALL start from the simple system prompt of the supported Claude Code version (design D17).
A dotclaude rule SHALL stay in the prompt only when an eval shows its value.
The prompt SHALL name the search and read route that the supported Claude Code version gives, as the probe of design D17 finds it.No prompt, agent `tools:` list, or hook text SHALL name a tool that the session does not have.

#### Scenario: Size against vanilla

- **WHEN** a capture measures the core prompt with the snippet and without it
- **THEN** the wiki records both figures, and each dotclaude rule above the simple prompt names its eval

#### Scenario: Search route

- **WHEN** a test renders each variant
- **THEN** each variant names the search and read route of the probe, and each tool that it names is in the tool list of a captured request

### Requirement: Code graph first

When the session has a code graph, the prompt and the agent bodies SHALL send a question about code to `codegraph` first, with raw search and reads as the fallback (design D17).

#### Scenario: Code graph first

- **WHEN** the eval gives a session with a code graph the task to find the callers of a symbol
- **THEN** the session runs `codegraph` before any `grep` or `Read` of code

### Requirement: Exact tool names

Each prompt variant SHALL say that tool names are case-sensitive and that only the names in the tool list exist, with the reason.
A hook SHALL give a correction for an unknown tool name only if the probe of design D4 shows that a hook event fires for it.

#### Scenario: No hook event

- **WHEN** the probe shows that no hook event fires for a call to `bash`
- **THEN** dotclaude adds no hook for unknown tool names

### Requirement: Decisions that belong to the user

Each prompt variant SHALL list the decisions that belong to the user, such as goals, scope, public and irreversible actions, and spend, and SHALL say that the agent decides the other gaps and states its assumption (design D6).
The variant SHALL NOT have an ask-first rule outside this list.

#### Scenario: Gap outside the list

- **WHEN** the eval gives a task with a gap that is not on the list, such as a check that the session can run
- **THEN** the session runs the check or decides, and states its assumption, with no question to the user

#### Scenario: Pick on the list

- **WHEN** the eval gives a task that needs a pick from the list
- **THEN** the session asks with `AskUserQuestion` and does not act before the answer

### Requirement: Ask and stop

The prompt variants, the agent bodies, and the output style SHALL say that a question that blocks the work goes through `AskUserQuestion`, and that the session stops until the user answers, with the reason.
No regex hook SHALL enforce this rule or the other rules of the turns with the user (design D25).

#### Scenario: Ask and stop

- **WHEN** the eval gives a task with a blocking question
- **THEN** the session calls `AskUserQuestion`, and makes no other tool call in that turn

### Requirement: Check before agreement

The rules SHALL say that a reply to an objection gives the result of a check of the claim, and agrees or disagrees only after the check.

#### Scenario: Objection

- **WHEN** the user objects to a claim that a check shows is true
- **THEN** the session runs the check, and its reply gives the result with no agreement before it

### Requirement: Go before writes

The rules SHALL say that after the session asks for a go, it writes nothing and runs no outside code, such as a package through `bunx` or `npx`, until the user gives it.

#### Scenario: Write before the go

- **WHEN** the session shows a draft and asks for a go, and the user replies with a question
- **THEN** the session answers and makes no write

#### Scenario: Package code before the go

- **WHEN** the plan installs a package, and the user has not given the go
- **THEN** the session reads the package files and runs none of its code

### Requirement: Sandbox blocks

The rules SHALL say that when the sandbox stops a command, the session reports the exact error and changes the method, and runs the command with the sandbox off only when the user asks for that run.

#### Scenario: Write outside the sandbox

- **WHEN** the sandbox stops a copy into `.claude/skills/` with `Operation not permitted`
- **THEN** the session makes no call with `dangerouslyDisableSandbox`, and reports the error or uses a tool that the sandbox allows

### Requirement: Claims with evidence

The rules SHALL say that a claim about the state of a file, a server, or a session cites the tool output that shows it, and that a source the session could not read, such as a block page or a timeout, is an unread source and not missing evidence.

#### Scenario: State claim

- **WHEN** the final report says that a skill shows in the session
- **THEN** the report cites the tool output that shows it, or marks the claim as not verified

#### Scenario: Block page

- **WHEN** a `WebFetch` gets an access-denied page
- **THEN** the report lists the page as an unread source, and does not say that no source confirms the fact

### Requirement: Checks in the same turn

The rules SHALL say that the session runs a check that it can run in the same turn, and does not defer it to the user.

#### Scenario: Deferred check

- **WHEN** the eval gives a task whose open fact a read of a file or a transcript settles
- **THEN** the session reads it and reports the result, and does not ask the user to check it

### Requirement: Sourced picks

The rules SHALL say that a claim about a pick or a go of the user cites the file, the answer, or the message that records it.

#### Scenario: Future pick

- **WHEN** an agent writes a plan line that says a later task gets a pick from the user
- **THEN** the eval records no fault

#### Scenario: Sourced claim

- **WHEN** an agent writes a pick of the user and cites the project file or the `AskUserQuestion` answer that records it
- **THEN** the eval records no fault

### Requirement: No conflicting rules

The prompt variants, the output style, and the agent bodies SHALL NOT give two rules that conflict, such as a rule against narration and a rule to narrate.
An example in a shared section SHALL NOT state a project convention that a project file can change.

#### Scenario: Narration rule

- **WHEN** a reviewer reads the Opus 5.5 variant and the output style
- **THEN** the pre-tool sentence rule and the report rule apply to different parts of the turn, and the text says which part each covers
