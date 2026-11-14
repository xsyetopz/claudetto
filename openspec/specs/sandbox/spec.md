# sandbox Specification

## Purpose
Setup turns on Claude Code's built-in sandbox with a block that blocks the destructive and the credential reads and lets the rest pass, written to the user's settings file.

## Requirements

### Requirement: Setup Turns On the Built-in Sandbox With Least Friction

The setup command SHALL offer a "Sandbox" group that writes one `sandbox` block into the user's `settings.json`, through the fill and replace choice of the other groups. The block SHALL list what is dangerous, not what is safe, with the keys that the scenario "The Keys of the Block" lists. Setup SHALL NOT add a per-tool entry, such as one tool's cache folder.

#### Scenario: The Keys of the Block

- **WHEN** setup writes the `sandbox` block
- **THEN** it holds `enabled: true`, `allowUnsandboxedCommands: true`, `enableWeakerNetworkIsolation: true`, `filesystem.allowWrite` `["~/", "/Volumes/"]` with the temp folder, `filesystem.denyWrite` to every file a later process runs or loads, `filesystem.denyRead` to secret stores, `filesystem.allowRead` `["~/Library/Keychains/login.keychain-db"]`, `network.allowedDomains` `["*"]`, `network.allowMachLookup` `["*"]`, `network.allowLocalBinding` `true`, `network.allowAllUnixSockets` `true`, and `excludedCommands` `["ps *", "top *", "sysctl *", "launchctl list", "just *"]`
- **AND** `excludedCommands` names only commands that fail inside the sandbox under every key: `ps` and `top` are setuid root, `sysctl` reads a fixed name list, and `just verify` opens a PTY the sandbox refuses; a `git *` entry does not take effect
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

#### Scenario: The Login Keychain for gh and git push

- **WHEN** a sandboxed `gh` reads its login, or a sandboxed `git push` over HTTPS asks the credential helper `gh auth git-credential`
- **THEN** it logs in, because `allowRead` reopens `~/Library/Keychains/login.keychain-db` inside the denied folder
- **AND** with `denyRead` alone, `gh auth status` prints "Failed to log in" and `git push --dry-run` fails "could not read Username" (fake API, 2.1.322, 2026-11-12)
- **AND** the entry is the person's choice, 2026-11-12: "Yes, add the one-file allowRead"; no token goes into a new file

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

The block SHALL NOT set `autoAllowBashIfSandboxed` or `failIfUnavailable`, and claudetto SHALL NOT run its own `sandbox-exec` profile, proxy, or `CLAUDE_CODE_SHELL_PREFIX`. `excludedCommands` SHALL hold only commands that no sandbox key can make run: `ps *`, `top *`, `sysctl *`, `launchctl list`, and `just *`.

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

### Requirement: Git Writes Run Inside the Sandbox Where the Engine Lets Them

claudetto SHALL end the two git refusals of the sandbox that a hook can end, and SHALL leave the engine's protection of `.git/config` and `.git/hooks` in place. Setup SHALL write no settings key for `.git`, and claudetto SHALL NOT keep a list of git commands that run outside the sandbox.

#### Scenario: What the Engine Keeps Closed

- **WHEN** a sandboxed command writes `.git/config` or a file under `.git/hooks` of a repository in the working folder, as `git config --local`, `git remote add`, the config half of `git branch -m`, and a `git clone` or `git init` inside the working folder do
- **THEN** the write fails with "Operation not permitted", also with `sandbox.filesystem.allowGitConfig: true` in the settings (fake API, 2.1.322, 2026-11-11)
- **AND** the retry outside the sandbox goes through the permission flow, as the scenario "The Retry Outside the Sandbox" states

#### Scenario: A Repository That Is There at the Start

- **WHEN** the session starts in a repository and a sandboxed command runs `git commit`, `git worktree add`, `git worktree remove` of a worktree the session added, or `git -c key=value`
- **THEN** the command passes with no prompt

#### Scenario: A Clone

- **WHEN** a sandboxed `git clone` targets a folder outside the working folder, such as one beside it
- **THEN** it passes, and the clone takes a commit, a config write, and a hook file
- **AND** a repository cloned into the working folder outside the sandbox then takes a sandboxed commit and `git worktree add`

#### Scenario: The Worktrees Folder Is Gone

- **WHEN** a Bash call holds `git worktree add`
- **THEN** before the call runs, claudetto creates the `worktrees` folder of the repository of the project root on the host
- **AND** the add passes inside the sandbox, where it failed with "could not create leading directories" after the worktrees of the session's start were removed

#### Scenario: The Folder Became a Repository After the Start

- **WHEN** the project root held no `.git` at the session's first Bash call and holds one after a later Bash call
- **THEN** that call's result carries one reminder, once per root: git writes fail inside the sandbox until Claude Code restarts, the person restarts in the folder with `claude --continue`, and until then a git write runs with `dangerouslyDisableSandbox: true`
- **AND** a session that started in a repository gets no reminder

#### Scenario: The Limits That Stay

- **WHEN** a sandboxed command adds a worktree under the name of one that existed at the start and was removed since, or removes a worktree of the start
- **THEN** it fails with "Operation not permitted", and its retry outside the sandbox is the route

### Requirement: The Per-User Temp Folder Is Open and the Tool Cache in It Stays Closed

Setup's Sandbox group SHALL allow writes under `/private/var/folders`, where macOS keeps each person's temp and cache folders, and SHALL deny writes to `xcrun_db*` in the temp folder, because that file names the developer tools that run later.

#### Scenario: A Tool Writes Its Temp File

- **WHEN** a sandboxed command writes into the folder that `getconf DARWIN_USER_TEMP_DIR` prints, as a compiler, a Java library, and each tool that ignores `$TMPDIR` do
- **THEN** the write passes, where it failed with "Operation not permitted" (fake API, 2.1.322, 2026-11-11)

#### Scenario: The Tool Cache

- **WHEN** a sandboxed command writes a file named `xcrun_db` or `xcrun_db-<id>` in that folder
- **THEN** the write fails with "Operation not permitted"
- **AND** the tool that tried it still runs and prints its own output after the message

### Requirement: What the Sandbox Keeps Closed Goes Through the Retry

claudetto SHALL leave closed the paths the engine closes at the root of the working folder and the PATH folder of Homebrew, and SHALL add no text of its own for a refused write, because each request already names the retry.

#### Scenario: An Editor Folder at the Root

- **WHEN** a sandboxed command creates or changes `.vscode`, `.idea`, or `.claude/commands` at the root of the working folder
- **THEN** it fails with "Operation not permitted", also with an `allowWrite` entry that names the folder
- **AND** the same folder one level down or beside the working folder passes

#### Scenario: A Homebrew Install

- **WHEN** a sandboxed command writes under `/opt/homebrew`
- **THEN** it fails, and `brew --version`, `brew list`, and `brew install --dry-run` pass

#### Scenario: Headless Chrome

- **WHEN** a sandboxed command runs headless Chrome
- **THEN** Chrome exits with an error and writes no file, also with `/private/var/folders` writable and `network.allowAllUnixSockets: true`

#### Scenario: The Retry

- **WHEN** one of these commands fails inside the sandbox
- **THEN** its output holds "Operation not permitted", which the engine's own text in the request names as the evidence for a retry with `dangerouslyDisableSandbox: true`
- **AND** the permission flow decides that retry, as the scenario "The Retry Outside the Sandbox" states
