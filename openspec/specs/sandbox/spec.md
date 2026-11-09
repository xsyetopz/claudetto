# sandbox Specification

## Purpose
Setup turns on Claude Code's built-in sandbox with a block that blocks the destructive and the credential reads and lets the rest pass, written to the user's settings file.

## Requirements

### Requirement: Setup Turns On the Built-in Sandbox With Least Friction

The setup command SHALL offer a "Sandbox" group that writes one `sandbox` block into the user's `settings.json`, through the fill and replace choice of the other groups. The block SHALL set `enabled: true`, `allowUnsandboxedCommands: false`, `filesystem.allowWrite` to the temp folder and the usual tool caches, `filesystem.denyRead` to cloud-credential files, and `network.allowedDomains` to `["*"]`.

#### Scenario: A Write Outside the Allowed Paths

- **WHEN** a sandboxed Bash command writes in the home folder outside `allowWrite`
- **THEN** the write fails with "operation not permitted" and no prompt is raised

#### Scenario: A Write to a Tool Cache

- **WHEN** a sandboxed command writes under `~/.cache`, `~/.bun`, or `/tmp`
- **THEN** the write succeeds with no prompt

#### Scenario: A Cache Folder Named by an Env Var

- **WHEN** `BUN_INSTALL_CACHE_DIR`, `npm_config_cache`, `PIP_CACHE_DIR`, `GOMODCACHE`, `GOCACHE`, or `XDG_CACHE_HOME` is set to a folder when setup runs
- **THEN** setup writes that folder into `sandbox.filesystem.allowWrite` with the fixed entries, and `bun install` writing there passes with no prompt
- **AND** with none of them set, setup writes no extra entry

#### Scenario: A Read of a Credential Path

- **WHEN** a sandboxed command reads a path in `denyRead`
- **THEN** the read fails with "Operation not permitted" and no prompt is raised

#### Scenario: A Request to Any Host

- **WHEN** a sandboxed command requests a host that no list names
- **THEN** the request reaches the host with no prompt

#### Scenario: The Retry Outside the Sandbox

- **WHEN** Claude calls Bash with `dangerouslyDisableSandbox`
- **THEN** the command runs sandboxed, the write denies still hold, and no approval is asked

#### Scenario: A User's Own List

- **WHEN** the user's file already holds `sandbox.filesystem.allowWrite` and the choice is fill
- **THEN** the user's list stays as it is, and the keys the user did not set are written

### Requirement: The Sandbox Is Quiet and Is the Built-in One

The block SHALL NOT set `autoAllowBashIfSandboxed`, `excludedCommands`, or `failIfUnavailable`, and claudetto SHALL NOT run its own `sandbox-exec` profile, proxy, or `CLAUDE_CODE_SHELL_PREFIX`.

#### Scenario: The Design Rule

- **WHEN** a key is chosen or cut
- **THEN** it follows the user's rule (2026-11-06): "we want least friction, so having to manually add domains is fucking annoying. we want least annoying and nagging sandbox. "just block the truly destructive stuff and let the rest pass free"", and the own wrapper stays dropped on the user's word, "perhaps using built-in sandbox is worth keeping, just heavily customizing it.", because Seatbelt refuses a profile applied under a profile with a deny rule

#### Scenario: Default Auto-Allow

- **WHEN** a sandboxed Bash command runs and no `Bash` allow rule exists
- **THEN** it runs with no prompt

#### Scenario: No Prefix

- **WHEN** a session starts with the plugin
- **THEN** `CLAUDE_CODE_SHELL_PREFIX` is not set by claudetto

### Requirement: The Sandbox Keys Come Through a File, Not a Hook or the Plugin Settings

claudetto SHALL deliver `sandbox` keys by writing the user's `settings.json`, because the other two routes do not carry them: a plugin-root `settings.json` drops `sandbox`, and a `settings.read` hook sets `enabled` and `allowUnsandboxedCommands` but not `filesystem` or `network`.

#### Scenario: The Plugin Settings File

- **WHEN** a plugin's root `settings.json` holds a `sandbox` block
- **THEN** Bash runs unsandboxed

#### Scenario: A settings.read Hook

- **WHEN** a `settings.read` hook adds `filesystem.allowWrite` and `network.allowedDomains` to the settings value
- **THEN** a write to the allowed path fails and a request to the allowed host is denied
