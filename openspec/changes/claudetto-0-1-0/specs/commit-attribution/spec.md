# Spec Delta: `commit-attribution`

## Purpose

Makes sure that Claude follows the attribution guidelines of the settings when Claude, and not the user, runs `git commit` or writes a pull request.
The user can turn each part off with the `attribution` setting.
The slice rewrites no call.

## ADDED Requirements

### Requirement: Reminder

The slice SHALL send the commit line and the pull request line to Claude as a reminder in the context, and in the task prompt of each new subagent.
The reminder SHALL follow the `attribution` setting of Claude Code, and a part that the user turned off SHALL NOT be in it.

#### Scenario: A model switch

- **WHEN** the session model changes from Opus to Sonnet
- **THEN** the next prompt gets a reminder with the commit line of Claude Sonnet

### Requirement: Model name from the kernel

The commit line SHALL name the model with the model parser of the kernel.

#### Scenario: A new model id

- **WHEN** the session model is `claude-sonnet-5-5`
- **THEN** the commit line names Claude Sonnet 5.5, not only `Claude`

### Requirement: Commit message hook

`/claudetto:setup` SHALL write the `env` keys of a config-based `commit-msg` hook of git 2.54 or later, after the `GIT_CONFIG_*` keys of the user.
The keys SHALL be four pairs: the `event`, `command`, and `enabled` keys of `hook.claudetto-attribution`, and `hook.commit-msg.enabled`.
A repository config SHALL NOT remove the check.

#### Scenario: A repository that turns the hook off

- **WHEN** a repository config sets `hook.claudetto-attribution.enabled` or `hook.commit-msg.enabled` to `false`, or sets another `command` or `event` for the hook
- **THEN** the two `enabled` pairs of the command scope win, and the hook still runs

#### Scenario: A second run of setup

- **WHEN** setup runs again, or runs on an older setup with two pairs
- **THEN** a second run changes nothing, and the older setup keeps its slots and gets the two new pairs

#### Scenario: An older git

- **WHEN** git is older than 2.54
- **THEN** git ignores the keys and the commit passes with no output

### Requirement: Commit message check

The hook SHALL read the commit lines that the slice recorded for `CLAUDE_CODE_SESSION_ID`, and it SHALL reject a message that does not end with one of them.
A line that is a whole line of the trailers SHALL also pass.
The hook SHALL pass when the session variable or the record is missing, or when the commit line is off.
The hook SHALL print a note that names the lines.

#### Scenario: A message with no line

- **WHEN** Claude runs `git commit -m "Fix it."` and the commit line is on
- **THEN** git rejects the commit and prints the note with the line

#### Scenario: A line before a trailer

- **WHEN** the message ends with the commit line and then `Signed-off-by: A <a@b.c>`
- **THEN** the commit passes

#### Scenario: A subagent on another model

- **WHEN** a subagent on another model commits with the commit line of its own model
- **THEN** the commit passes

#### Scenario: A commit outside Claude Code

- **WHEN** a commit runs in a shell with no `CLAUDE_CODE_SESSION_ID`
- **THEN** the hook passes

### Requirement: Bypass deny

When the commit line is on, the slice SHALL deny a `git commit` that Claude runs with `--no-verify` or `-n`, or with an override of `core.hooksPath` or `hook.*` through `-c` or `--config-env`.
The slice SHALL read the command with the shell reader of the kernel, and a deny SHALL give the reason.

#### Scenario: A skipped hook

- **WHEN** Claude runs `git commit --no-verify -m "x"`
- **THEN** the call is denied with a reason

#### Scenario: A removed variable

- **WHEN** Claude runs `env -u GIT_CONFIG_COUNT git commit -m "x"`
- **THEN** the call is denied with a reason

#### Scenario: A message with `-n`

- **WHEN** Claude runs `git commit -m "-n"`
- **THEN** the call passes

### Requirement: Deny a change of the hook config

When the commit line is on, the slice SHALL deny a command with a commit that assigns, exports (`export`, `declare`, `typeset`, `readonly`, `local`), or unsets a `GIT_CONFIG_*` variable, or that runs `env -u GIT_CONFIG_*`, `env -i`, or `env --ignore-environment` before `git`.
It SHALL deny `git commit-tree`, which writes a commit and runs no hook, with or without another commit in the command.

#### Scenario: A commit with no environment

- **WHEN** Claude runs `env -i git commit -m "Fix"` with the commit line on
- **THEN** the call is denied with the reason

#### Scenario: A commit tree

- **WHEN** Claude runs `git commit-tree HEAD^{tree} -m "Fix"` with the commit line on
- **THEN** the call is denied with the reason

### Requirement: Pull request check

When the pull request line is on, the slice SHALL read the body with `gh pr view --json body` after a `gh pr create` or `gh pr edit` call of Claude.
A body that lacks the line SHALL give Claude a note to fix it with `gh pr edit --body-file`.
A GitHub MCP tool that creates or updates a pull request SHALL be denied before the call when its `body` lacks the line.
The check after the call SHALL fail open.

#### Scenario: A pull request with no line

- **WHEN** Claude runs `gh pr create --body "text"` and the body lacks the line
- **THEN** Claude gets a note to add the line with `gh pr edit --body-file`

#### Scenario: A failed read

- **WHEN** `gh pr view` fails
- **THEN** Claude gets no note
