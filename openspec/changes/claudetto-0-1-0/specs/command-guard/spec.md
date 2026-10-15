# Spec Delta: `command-guard`

## Purpose

Moves a `Bash` call that only prints a file to the `Read` tool, without a deny of the other parts of a compound command.

## ADDED Requirements

### Requirement: Deny only a pure print

The guard SHALL deny a `Bash` call only when each part of the command only prints a file.
A compound command with a part that does other work SHALL run.

#### Scenario: A compound command

- **WHEN** Claude runs `bun test && cat out.txt`
- **THEN** the command runs with no deny

#### Scenario: A pure print

- **WHEN** Claude runs `cat src/a.ts`
- **THEN** the guard denies the call and names the `Read` tool in its reason

### Requirement: No over-refusal of common forms

The guard SHALL NOT deny a `git` global option with a separate value, or a `git checkout --` of a file.

#### Scenario: `git -C`

- **WHEN** Claude runs `git -C repo status`
- **THEN** the command runs with no deny

#### Scenario: Restore a file

- **WHEN** Claude runs `git checkout -- bun.lock`
- **THEN** the command runs with no deny

### Requirement: Parser holes

The shell parser SHALL read the command behind `env -S`, BSD `env -P`, ANSI-C quotes, quoted heredoc delimiters, and the wrappers `noglob`, `coproc`, and `caffeinate`.

#### Scenario: `env -S`

- **WHEN** a command is `env -S 'cat a.txt'`
- **THEN** the parser reads `cat a.txt` as the command

### Requirement: No AI-policy ask

The guard SHALL NOT ask about the AI policy of a repository of another owner.

#### Scenario: A repository of another owner

- **WHEN** Claude runs `gh pr create` in a repository of another owner
- **THEN** the guard gives no AI-policy ask

### Requirement: Valid rewrite input

When a hook rewrites a tool input, it SHALL send the whole input with the types of the tool input schema, because Claude Code 2.1.300 drops unknown keys and refuses a wrong type.

#### Scenario: A rewrite

- **WHEN** a hook returns `updatedInput`
- **THEN** the input passes the schema of the tool, and the call runs
