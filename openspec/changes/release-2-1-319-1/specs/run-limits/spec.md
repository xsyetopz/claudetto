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
