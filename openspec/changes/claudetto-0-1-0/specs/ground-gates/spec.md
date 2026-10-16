# Spec Delta: `ground-gates`

## Purpose

Gives Claude the facts of the repository and of the session, and stops a call that repeats work or acts past a rejection.
Each gate reads structure: git state, the lockfile, file stats, and tool inputs.
No gate matches words of natural language.
The evidence is in the wiki page `Failure-Gaps-0.1.0` and in D60 of `Decisions-Engine`.

## ADDED Requirements

### Requirement: The session starts with the git state

At `SessionStart`, the plugin SHALL give Claude the output of `git describe`, the branch, the version in the manifests, and whether the tag of that version exists.

#### Scenario: A version with no tag

- **WHEN** the manifests have `0.1.0-alpha.1`, and the tag `0.1.0-alpha.1` does not exist
- **THEN** the context says that the version has no tag

### Requirement: An ask on an edit of `[Unreleased]` for a version with no tag

When Claude edits the `[Unreleased]` section of `CHANGELOG.md`, and the version in the manifests has no tag, the plugin SHALL ask the user.
The reason SHALL name the section of that version.

#### Scenario: The release is in progress

- **WHEN** the version in the manifests has no tag, and Claude adds a line under `[Unreleased]`
- **THEN** the user gets an ask that names the section of that version

### Requirement: An ask on a package that does not exist

When a `Bash` command adds or installs a package, the plugin SHALL parse it with `src/kernel/shell.ts`.
When the lockfile does not have the package, and the registry has no package with that name, the plugin SHALL ask the user.

#### Scenario: A made-up package

- **WHEN** Claude runs `bun add left-padx`, and the registry has no `left-padx`
- **THEN** the user gets an ask that names `left-padx`

### Requirement: A rejected call is final in the session

The plugin SHALL keep a hash of the `tool_input` of each call that the user rejected.
`PreToolUse` SHALL deny a call with the same tool and the same hash in the same session.

#### Scenario: The same call after a rejection

- **WHEN** the user rejected `git push --force`, and Claude calls it again with the same input
- **THEN** the call is denied, and the reason says that the user rejected it

### Requirement: No read of an unchanged range again

The plugin SHALL keep, for each agent, the path, the `mtime`, the size, and the line ranges of each `Read`.
When the file did not change, and earlier reads cover the new range, the plugin SHALL deny the `Read`, and the reason SHALL give the path and the earlier range.
A handoff, a compaction, or the clear of old tool results SHALL empty the record.

#### Scenario: A full read after the same full read

- **WHEN** Claude reads `src/a.ts` in full, makes no edit, and reads it in full again
- **THEN** the second read is denied

#### Scenario: A part of a range that Claude read

- **WHEN** Claude read lines 1 to 200 of an unchanged file, and asks for lines 50 to 80
- **THEN** the read is denied

#### Scenario: A changed file

- **WHEN** the `mtime` of the file changed after the last read
- **THEN** the read runs

#### Scenario: After a handoff

- **WHEN** a handoff ran after the last read
- **THEN** the read runs

### Requirement: A re-read after a rejected write

When the user rejected a `Write` or an `Edit` of a file, the plugin SHALL deny the next edit of that file until Claude reads it again.

#### Scenario: An edit after a rejection

- **WHEN** the user rejected an `Edit` of `a.ts`, and Claude edits `a.ts` again with no read
- **THEN** the edit is denied, and the reason tells Claude to read the file

### Requirement: The served model

The status line SHALL show a mark when the model of the last response is not the model that the session requested.

#### Scenario: A substitute model

- **WHEN** the session requested `claude-opus-5-5`, and the response came from another model
- **THEN** the status line shows the mark and the served model
