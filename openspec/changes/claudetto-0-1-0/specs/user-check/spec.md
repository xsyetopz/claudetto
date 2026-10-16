# Spec Delta: `user-check`

## Purpose

Makes sure that a reply gives the user the exact `!` command of a check that only the user can run, after a permission check denies a call.

## ADDED Requirements

### Requirement: Block a reply with no command after a denial

The plugin SHALL keep each call that a permission check denies in the session.
When the session has a denied call and the reply has no `!` command, the `Stop` hook SHALL block the stop one time, with a reason that names the denied calls.
Each `Stop` SHALL clear the denied calls, and a stop with `stop_hook_active` SHALL not be blocked.

#### Scenario: Denied call and no command

- **WHEN** auto mode denies `just sandbox` and the reply has no `!` command
- **THEN** the stop is blocked, and the reason names `just sandbox`

#### Scenario: A continuation of a block

- **WHEN** the stop is the continuation of a block
- **THEN** the stop is not blocked

### Requirement: A `!` command from syntax, not words

The hook SHALL find a `!` command from the Markdown syntax of the reply: a code item that starts with `!`, or a line of a code block that starts with `!`.
The hook SHALL match no word of the reply, so that it works in each language.
The hooks SHALL make no model call.

#### Scenario: A reply in another language

- **WHEN** the reply is in Japanese and has the code item `` `! just sandbox > /tmp/out.txt 2>&1` ``
- **THEN** the stop is not blocked
