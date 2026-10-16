# Spec Delta: `ai-policy`

## Purpose

Makes Claude read the AI policy of a repository of another owner before it contributes there, and follow that policy.
Local work in a fork or a private clone is never gated.
The slice reads no policy text for meaning.
Claude reads the files and records one verdict.
The slice uses only argv, tool names, and URL structure.

## ADDED Requirements

### Requirement: Gate only actions that reach an external upstream

An action that sends work to a repository whose owner is not the GitHub login SHALL be denied until a verdict exists.
The actions are `git push`, a `gh` write, a GitHub MCP write, and a network client write to a GitHub host that names a repository.
An organization where the login has the role `admin` SHALL count as the user's own.
When the lookup of the organizations fails, each organization SHALL be external.

#### Scenario: A push to an external origin

- **WHEN** Claude runs `git push` in a checkout whose push remote is a repository of another owner with no verdict
- **THEN** the call is denied with the list of files

#### Scenario: A push to an organization of the user

- **WHEN** Claude runs `git push` to a repository of an organization where the login has the role `admin`
- **THEN** the call passes with no verdict

### Requirement: List the policy files in the deny

The deny of an action with no verdict SHALL list the policy files and ask Claude to read each one.

#### Scenario: The deny lists the files

- **WHEN** a push is denied for a missing verdict
- **THEN** the message names each policy file found

### Requirement: Ask consent for a silent verdict

An upstream action at an external repository with the verdict `silent` SHALL get an `ask` from `tool.check`, for each action.
The ask names the repository and is not remembered.
The verdicts `allowed` and `conditions` SHALL not ask, and `forbidden` SHALL deny.

#### Scenario: A silent push asks each time

- **WHEN** Claude runs `git push` twice at a repository with the verdict `silent`
- **THEN** each call gets an `ask` with the repository name

#### Scenario: An edit never asks

- **WHEN** Claude runs `Edit` in a checkout with the verdict `silent`
- **THEN** the call passes with no ask

### Requirement: Find the policy files by name

The policy files SHALL be found by their names and places only, with no scan of the text.
The names SHALL include `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursorrules`, `.cursor/rules`, `CONTRIBUTING*`, `CONTRIBUTION*`, `CONVENTIONS*`, `HACKING*`, `AI_POLICY*`, `CODE_OF_CONDUCT*`, `README*`, the templates, and each file with `AI` or `LLM` as a word in its name.

#### Scenario: A policy file with `AI` in its name

- **WHEN** an external repository has `policies/ai-policy.md`
- **THEN** the deny lists that file

### Requirement: Never gate local work

The slice SHALL NOT deny `Edit`, `Write`, `NotebookEdit`, or a local `Bash` command in any checkout, also when the verdict is `forbidden`.
Local commands include `git commit`, `git fetch`, builds, redirects, and the `gh` groups `auth`, `config`, `alias`, `completion`, and `extension`, and the verbs `checkout`, `clone`, and `fork`.

#### Scenario: An edit in a forbidden checkout

- **WHEN** the verdict is `forbidden` and Claude uses `Edit` on a file in the checkout
- **THEN** the call passes

#### Scenario: A commit in a forbidden checkout

- **WHEN** the verdict is `forbidden` and Claude runs `git commit`
- **THEN** the call passes

### Requirement: Record a checked verdict

The tool `ai_policy` SHALL accept `allowed`, `silent`, `conditions`, or `forbidden`.
It SHALL refuse a verdict when `read` leaves out a listed file.
It SHALL refuse a verdict other than `silent` when the `quote` is not word for word in a listed file.
A stored verdict SHALL be reused only when the hash of the files is the same.

#### Scenario: A policy file changes

- **WHEN** a policy file changes after a verdict
- **THEN** the next action asks Claude to read the files again

### Requirement: Resolve the target of a push

The target of `git push` SHALL come from the named remote or URL.
Without one, it SHALL come from the push remote of the branch, then `remote.pushDefault`, then `origin`, by `git remote get-url --push`.
A push to a repository of the GitHub login SHALL pass.
A remote that is a path, or that `git` cannot find, SHALL pass.

#### Scenario: A push to the own fork

- **WHEN** the verdict of the parent is `forbidden` and Claude runs `git push` to the fork of the login
- **THEN** the call passes

### Requirement: Cover every `gh` write

A `gh` call SHALL be gated by its target when it is not a read and not a local verb.
The target SHALL come from `-R`, then from the checkout, and a fork SHALL give its parent.

#### Scenario: A pull request from the own fork

- **WHEN** Claude runs `gh pr create` in the own fork whose parent has the verdict `forbidden`
- **THEN** the call is denied

### Requirement: Cover network clients

A `curl`, `wget`, `http`, `https`, `xh`, or `xhs` call that writes to a GitHub host SHALL be gated by the repository in the URL path.
The hosts are `github.com`, `api.github.com`, and `uploads.github.com`.
A URL with no repository path, or with a shell expansion, SHALL be unclear.

#### Scenario: A write with `curl`

- **WHEN** Claude runs `curl -X POST` to `api.github.com/repos/O/R/issues` for a forbidden repository
- **THEN** the call is denied

### Requirement: Protect the verdict store

A file tool, a redirect, or a command that names `.claudetto/policy` SHALL be denied when it is not a read, also when the check fails.
The check SHALL use the path segments, and a glob after `.claudetto` SHALL count.

#### Scenario: A write to the store

- **WHEN** Claude writes `~/.claudetto/policy/O-R.json` with `Write`
- **THEN** the call is denied

### Requirement: Fail closed on an upstream action only

When the folder, the remote, or the address of an upstream action is unknown, and any verdict is `forbidden`, the call SHALL be denied.
When the check fails at `tool.call`, a call that can reach an upstream SHALL be denied, and each other call SHALL pass.
When the check fails at `tool.check`, such a call SHALL get an `ask`.

#### Scenario: An engine error on an edit

- **WHEN** the check throws on `Edit`
- **THEN** the call passes

#### Scenario: An engine error on a push

- **WHEN** the check throws on `git push`
- **THEN** the call is denied with the message that the check failed

#### Scenario: An engine error at the consent check

- **WHEN** the check of `tool.check` throws on `git push`
- **THEN** the call gets an `ask`

### Requirement: Check each push with a pre-push hook

`/claudetto:setup` SHALL write the `env` keys of a config-based `pre-push` hook.
The hook SHALL pass a push to a repository of the user, and SHALL reject a push with the verdict `forbidden` or with no verdict.
A push with the verdict `silent` SHALL pass only with a one-time consent that the slice armed at the `ask` of `tool.check`.
The slice SHALL clear the consent at the next tool call.

#### Scenario: A push from a script

- **WHEN** a script that Claude runs calls `git push` to a repository with no verdict
- **THEN** the hook rejects the push

#### Scenario: A consent is used once

- **WHEN** the user approves the `ask` for a push, and Claude pushes twice
- **THEN** the hook passes the first push and rejects the second

### Requirement: Deny a bypass of the push hook

The slice SHALL deny a `Bash` command that runs `git push` and skips or changes the hook.
The forms are `--no-verify` (also a unique start of it), `-c hook.*`, `core.hooksPath`, a change of `GIT_CONFIG_*`, `env -i`, and `env -u` of such a name.

#### Scenario: A push with no verify

- **WHEN** Claude runs `git push --no-verify`
- **THEN** the call is denied

### Requirement: Check only the pushes of Claude

The slice SHALL set `CLAUDETTO_AGENT_CALL` with `$.env.set` while a `Bash` call of Claude runs, and SHALL remove it after the call.
The `pre-push` hook SHALL pass each push when the name is not set, so that a `!` command of the user passes.
The slice SHALL deny a `Bash` command that sets or removes the name.

#### Scenario: A push of the user

- **WHEN** the user types `! git push` to a repository with no verdict
- **THEN** the hook passes the push

#### Scenario: A change of the marker

- **WHEN** Claude runs `unset CLAUDETTO_AGENT_CALL; ./push.sh`
- **THEN** the call is denied

### Requirement: Blank the GitHub tokens for a script

When a `Bash` call of Claude runs a program that the slice cannot read, in a checkout that is not the user's and has no verdict `allowed` or `conditions`, the slice SHALL set `GH_TOKEN` and `GITHUB_TOKEN` to a value that is not a token, and SHALL restore them after the call.
This is a soft barrier, because a script can find a token in another place.

#### Scenario: A build in a closed checkout

- **WHEN** Claude runs `./build.sh` in a checkout with the verdict `forbidden`
- **THEN** the script gets no GitHub token in `GH_TOKEN` or `GITHUB_TOKEN`

### Requirement: Offer the hard stop

When Claude records the verdict `silent` or `forbidden` for a checkout on this disk, and the settings do not turn the sandbox on and deny `github.com` and `*.github.com`, the reply of `ai_policy` SHALL tell Claude to offer `/claudetto:setup sandbox`.

#### Scenario: A forbidden checkout with no sandbox

- **WHEN** Claude records `forbidden` for an external checkout with no sandbox settings
- **THEN** the reply names `/claudetto:setup sandbox`

### Requirement: Ask when the target cannot be found

When the remote of a push or a `gh` write cannot be found, and the session folder is in an external repository, `tool.check` SHALL ask.
When the command cannot be read, the slice SHALL ask in the same case.
Otherwise the call SHALL pass to the hook.

#### Scenario: A remote that cannot be read

- **WHEN** Claude runs `git push nosuch` in an external checkout, and the remote lookup fails
- **THEN** the call gets an `ask`
