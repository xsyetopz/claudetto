# sandbox Specification

## Purpose
Setup turns on Claude Code's built-in sandbox with a block that blocks the destructive and the credential reads and lets the rest pass, written to the user's settings file.

## Requirements

### Requirement: Setup Turns On the Built-in Sandbox With Least Friction

The setup command SHALL offer a "Sandbox" group that writes one `sandbox` block into the user's `settings.json`, through the fill and replace choice of the other groups. The block SHALL list what is dangerous, not what is safe, with the keys that the scenario "The Keys of the Block" lists. Setup SHALL NOT add a per-tool entry, such as one tool's cache folder.

#### Scenario: The Keys of the Block

- **WHEN** setup writes the `sandbox` block
- **THEN** it holds `enabled: true`, `allowUnsandboxedCommands: true`, `enableWeakerNetworkIsolation: true`, `filesystem.allowWrite` `["~/", "/Volumes/"]` with the temp folder, `filesystem.denyWrite` to every file a later process runs or loads, `filesystem.denyRead` to secret stores, `network.allowedDomains` `["*"]`, `network.allowMachLookup` `["*"]`, and `network.allowLocalBinding` `true`
- **AND** `allowUnsandboxedCommands: true` lets a command the sandbox blocks, such as `claude -p` reading its login from the Keychain, retry outside it, and the permission flow decides each retry
- **AND** `enableWeakerNetworkIsolation: true` is the person's choice, 2026-11-10: "allow both"
- **AND** `network.allowLocalBinding` `true` lets a test server or a fake API bind a localhost port (the person's choice, 2026-11-09)

#### Scenario: A Write Outside the Allowed Paths

- **WHEN** a sandboxed Bash command writes a path in `denyWrite`, such as `~/.zshrc`, `~/.ssh`, or `~/Library/LaunchAgents`
- **THEN** the write fails with "operation not permitted" and no prompt is raised (observed on the fake API, 2026-11-09)

#### Scenario: A Write to a Tool Cache

- **WHEN** a sandboxed command writes any tool's cache or state under the home folder or a mounted volume, such as `~/.npm`, `~/.cargo`, or `/Volumes/DevAudioStore/npm-cache`
- **THEN** the write succeeds with no prompt and no entry for that tool (a new folder under `~/` passed on the fake API, 2026-11-09)

#### Scenario: A Cache Folder Named by an Env Var

- **WHEN** `BUN_INSTALL_CACHE_DIR`, `npm_config_cache`, `PIP_CACHE_DIR`, `GOMODCACHE`, `GOCACHE`, or `XDG_CACHE_HOME` names a folder under `~/` or `/Volumes/`
- **THEN** setup writes no entry for it, because `allowWrite` already covers it

#### Scenario: A File That Runs Later

- **WHEN** setup writes `denyWrite`
- **THEN** it lists the shell startup files (`~/.zshrc`, `~/.zshenv`, `~/.zprofile`, `~/.bashrc`, `~/.bash_profile`, `~/.profile`, `~/.config/fish`), `~/.gitconfig` and `~/.config/git`, `~/.ssh`, `~/Library/LaunchAgents`, and the `PATH` folders under home (`~/.local/bin`, `~/.bun/bin`, `~/bin`)
- **AND** a write to `~/.bashrc` or `~/.gitconfig` fails, where with no entry it passed on the fake API (2026-11-09)

#### Scenario: A Read of a Credential Path

- **WHEN** a sandboxed command reads a path in `denyRead`: `~/Library/Keychains`, `~/.aws`, `~/.azure`, `~/.config/gcloud`, `~/.netrc`, `~/.git-credentials`
- **THEN** the read fails with "Operation not permitted" and no prompt is raised
- **AND** `~/.ssh` and `~/.gnupg` stay readable, because a signed commit reads its key there; `~/.ssh` stays in `denyWrite` (the user's choice, 2026-11-09: "Keep ~/.ssh and ~/.gnupg readable, but block writes to ~/.ssh (signing keeps working)")

#### Scenario: A System Service

- **WHEN** a sandboxed command needs a macOS service, such as `pgrep`, `scutil --dns`, `pbpaste`, or `diskutil list`
- **THEN** it runs, because `allowMachLookup` `["*"]` becomes `(global-name-prefix "")` (`chunk-fcp0yk24.js`, 2.1.319); on the fake API these four returned 0 with the entry and 3, 1, 1, 1 without it (2026-11-09)

#### Scenario: A Go Tool Verifies a TLS Certificate

- **WHEN** a sandboxed Go program such as `gh` verifies a certificate through `com.apple.trustd.agent`
- **THEN** the trust service answers, under `enableWeakerNetworkIsolation` alone and under `allowMachLookup` `["*"]` alone; with neither, the check fails `x509: OSStatus -26276` (an offline Go `x509.Verify` probe on the fake API, 2.1.321, 2026-11-10)

#### Scenario: A Request to Any Host

- **WHEN** a sandboxed command requests a host that no list names
- **THEN** the request reaches the host with no prompt

#### Scenario: The Retry Outside the Sandbox

- **WHEN** Claude calls Bash with `dangerouslyDisableSandbox`
- **THEN** the retry runs outside the sandbox only when the permission flow allows it: auto mode runs it when the classifier does not flag it and denies it when the classifier flags it, and default mode does not run it (cc-inspect `cli`, 2.1.322: `accept`/`classifier`, `permission_denied`/`classifier`, and `permission_denied`/`sandboxOverride`)

#### Scenario: A User's Own List

- **WHEN** the user's file already holds `sandbox.filesystem.allowWrite` and the choice is fill
- **THEN** the user's list stays as it is, and the keys the user did not set are written

### Requirement: The Sandbox Is Quiet and Is the Built-in One

The block SHALL NOT set `autoAllowBashIfSandboxed` or `failIfUnavailable`, and claudetto SHALL NOT run its own `sandbox-exec` profile, proxy, or `CLAUDE_CODE_SHELL_PREFIX`. `excludedCommands` SHALL hold only read-only commands that no sandbox key can make run: `ps *`, `top *`, `sysctl *`, and `launchctl list`.

#### Scenario: The Design Rule

- **WHEN** a key is chosen or cut
- **THEN** it follows the user's rule (2026-11-06): "we want least friction, so having to manually add domains is fucking annoying. we want least annoying and nagging sandbox. "just block the truly destructive stuff and let the rest pass free"", and the own wrapper stays dropped on the user's word, "perhaps using built-in sandbox is worth keeping, just heavily customizing it.", because Seatbelt refuses a profile applied under a profile with a deny rule
- **AND** the user's rule of 2026-11-09 holds: "these frictions usually should not be hand-written inclusions/exclusions for the sandbox. they should be able to pass through as normal"

#### Scenario: Default Auto-Allow

- **WHEN** a sandboxed Bash command runs and no `Bash` allow rule exists
- **THEN** it runs with no prompt

#### Scenario: No Prefix

- **WHEN** a session starts with the plugin
- **THEN** `CLAUDE_CODE_SHELL_PREFIX` is not set by claudetto

#### Scenario: What No Key Fixes

- **WHEN** the agent runs `ps -ax`, `top -l1`, `sysctl -n hw.ncpu`, or `launchctl list`, which fail sandboxed even with `allowMachLookup` `["*"]` (fake API, 2026-11-09; `ps` and `top` are setuid root, and `sysctl` reads only a fixed name list)
- **THEN** each runs through `excludedCommands` with no prompt

#### Scenario: A Command That Writes or Sends Stays In

- **WHEN** a command can write files, push, or send data, such as `gh *`, `git push *`, `curl *`, or `docker *`
- **THEN** it is not in `excludedCommands` and runs sandboxed

### Requirement: The Sandbox Keys Come Through a File, Not a Hook or the Plugin Settings

claudetto SHALL deliver `sandbox` keys by writing the user's `settings.json`, because the other two routes do not carry them: a plugin-root `settings.json` drops `sandbox`, and a `settings.read` hook sets `enabled` and `allowUnsandboxedCommands` but not `filesystem` or `network`.

#### Scenario: The Plugin Settings File

- **WHEN** a plugin's root `settings.json` holds a `sandbox` block
- **THEN** Bash runs unsandboxed

#### Scenario: A settings.read Hook

- **WHEN** a `settings.read` hook adds `filesystem.allowWrite` and `network.allowedDomains` to the settings value
- **THEN** a write to the allowed path fails and a request to the allowed host is denied
