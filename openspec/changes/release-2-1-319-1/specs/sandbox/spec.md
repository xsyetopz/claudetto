## MODIFIED Requirements

### Requirement: Setup Turns On the Built-in Sandbox With Least Friction

The setup command SHALL offer a "Sandbox" group that writes one `sandbox` block into the user's `settings.json`, through the fill and replace choice of the other groups. The block SHALL set `enabled: true`, `allowUnsandboxedCommands: false`, `enableWeakerNetworkIsolation: true`, `filesystem.allowWrite` to the temp folder and the usual tool caches, `filesystem.denyRead` to cloud-credential files, SSH keys, GnuPG keys, and keychains, and `network.allowedDomains` to `["*"]`.

#### Scenario: A Write Outside the Allowed Paths

- **WHEN** a sandboxed Bash command writes in the home folder outside `allowWrite`
- **THEN** the write fails with "operation not permitted" and no prompt is raised

#### Scenario: A Write to a Tool Cache

- **WHEN** a sandboxed command writes under `~/.cache`, `~/.bun`, or `/tmp`
- **THEN** the write succeeds with no prompt

#### Scenario: A Cache Folder Named by an Env Var

- **WHEN** `BUN_INSTALL_CACHE_DIR`, `npm_config_cache`, `PIP_CACHE_DIR`, `GOMODCACHE`, `GOCACHE`, or `XDG_CACHE_HOME` is set to a folder when setup runs, or `npm config get cache` names a folder
- **THEN** setup writes that folder into `sandbox.filesystem.allowWrite` with the fixed entries, and `bun install` or `npm view` writing there passes with no prompt
- **AND** with none of them set, setup writes no extra entry

#### Scenario: A Read of a Credential Path

- **WHEN** a sandboxed command reads a path in `denyRead`, such as `~/.ssh/config`, `~/.gnupg`, `~/Library/Keychains`, or `~/.aws`
- **THEN** the read fails with "Operation not permitted" and no prompt is raised

#### Scenario: A Go CLI over TLS

- **WHEN** a sandboxed `gh api user` runs on macOS
- **THEN** TLS verification succeeds through `com.apple.trustd.agent`, where today it fails with `x509: OSStatus -26276` (observed 2026-11-09)

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

The block SHALL NOT set `autoAllowBashIfSandboxed` or `failIfUnavailable`, and claudetto SHALL NOT run its own `sandbox-exec` profile, proxy, or `CLAUDE_CODE_SHELL_PREFIX`. The block SHALL set `excludedCommands` only to read-only inspection commands that the sandbox cannot run at all, and `network.allowMachLookup` only to services that a read-only command needs, each entry kept only after a run shows it passes.

#### Scenario: The Design Rule

- **WHEN** a key is chosen or cut
- **THEN** it follows the user's rule (2026-11-06): "we want least friction, so having to manually add domains is fucking annoying. we want least annoying and nagging sandbox. "just block the truly destructive stuff and let the rest pass free"", and the own wrapper stays dropped on the user's word, "perhaps using built-in sandbox is worth keeping, just heavily customizing it.", because Seatbelt refuses a profile applied under a profile with a deny rule
- **AND** the user's rule of 2026-11-09 holds: the sandbox should allow "any-but-genuinely-dangerous-and-destructive commands"

#### Scenario: Default Auto-Allow

- **WHEN** a sandboxed Bash command runs and no `Bash` allow rule exists
- **THEN** it runs with no prompt

#### Scenario: No Prefix

- **WHEN** a session starts with the plugin
- **THEN** `CLAUDE_CODE_SHELL_PREFIX` is not set by claudetto

#### Scenario: A Process Listing

- **WHEN** the agent runs `ps -ax`, `top -l1`, `pgrep -x zsh`, or `sysctl -n hw.ncpu`, which fail sandboxed today (`ps` and `top` are setuid root; `pgrep` lacks the sysmond lookup; `sysctl` lacks the name-to-OID read; observed 2026-11-09)
- **THEN** each prints its output with no prompt, through `excludedCommands`

#### Scenario: A Command That Writes or Sends Stays In

- **WHEN** a command can write files, push, or send data, such as `gh *`, `git push *`, `curl *`, or `docker *`
- **THEN** it is not in `excludedCommands` and runs sandboxed

#### Scenario: An Entry Not Yet Run

- **WHEN** an `excludedCommands` or `allowMachLookup` entry has no recorded passing run on the 2.1.319 engine
- **THEN** setup does not write it
