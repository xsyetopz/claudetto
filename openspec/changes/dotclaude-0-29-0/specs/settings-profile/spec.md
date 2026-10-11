## MODIFIED Requirements

### Requirement: Keys in the plugin and in the wiki

The plugin `settings.json` SHALL hold each recommended key that Claude Code accepts in a plugin settings file.
The wiki SHALL document each other recommended key as a plain `settings.json` snippet.
Only the `configure` skill SHALL write a user or project settings file, and only after the user confirms the diff of that file (design D13).
No code SHALL back up or roll back a user settings file, and no `profile.json` or other dotclaude settings file SHALL exist.

#### Scenario: Plugin file

- **WHEN** a test reads the plugin `settings.json`
- **THEN** every key in it is one that Claude Code accepts in a plugin settings file
- **AND** the file validates against the generated schema

#### Scenario: No writer

- **WHEN** a test searches `plugins/` outside `configure` for code that writes a Claude Code settings file
- **THEN** it finds none

## ADDED Requirements

### Requirement: Output style key

The snippet SHALL set `outputStyle` to `dotclaude:dotclaude`, so that `/config` shows the style that the plugin forces (design D7).
The wiki SHALL give the reason, and say that the forced style applies with no key.

#### Scenario: Snippet value

- **WHEN** a test reads the snippet
- **THEN** `outputStyle` is `dotclaude:dotclaude`

### Requirement: No main-session cache key

The snippet SHALL NOT set `promptCacheTtl`, so that Claude Code gives a subscription its 1-hour cache and an API key its 5-minute cache (design D8).

#### Scenario: Snippet value

- **WHEN** a test reads the snippet
- **THEN** it has no `promptCacheTtl` key

### Requirement: Agents delete their own temp folders

The snippet SHALL NOT deny each recursive `rm`, because a deny rule wins over an allow and an agent cannot delete its own temp folders (design D22).
The guard SHALL allow a recursive delete under `$TMPDIR` and SHALL deny a recursive delete of a path outside the workspace and `$TMPDIR`.

#### Scenario: Temp folder

- **WHEN** an agent runs a recursive `rm` on a folder under `$TMPDIR`
- **THEN** the call runs

#### Scenario: Home folder

- **WHEN** an agent runs a recursive `rm` on the home folder
- **THEN** the guard denies the call and gives the reason

### Requirement: Auto mode by default

The snippet SHALL set `permissions.defaultMode` to `auto` (design D22).

#### Scenario: Snippet mode

- **WHEN** a test reads the snippet
- **THEN** `permissions.defaultMode` is `auto`

### Requirement: Permission rules for destructive commands only

The `permissions` lists of the snippet SHALL hold the dangerous and destructive commands of the system, of `git`, and of other tools that design D22 lists, as exact prefix rules, and no other command, because an ask rule overrides auto mode.
The guard SHALL ask for a recursive delete of the home folder, a root or drive root, or a path outside the workspace and `$TMPDIR`, in `bash`, `zsh`, PowerShell, and `cmd` forms.

#### Scenario: Destructive git command

- **WHEN** an agent runs `git reset --hard HEAD~1` in auto mode
- **THEN** the permission prompt shows

#### Scenario: Dangerous delete on each shell

- **WHEN** an agent runs `rm -rf ~`, `Remove-Item -Recurse -Force C:\Users\me`, or `rd /s /q C:\`
- **THEN** the permission prompt shows for each call, with the reason

#### Scenario: Routine command

- **WHEN** an agent runs `git status`, `rm -f build.log`, or `rm -rf "$TMPDIR/probe"` in auto mode
- **THEN** no permission rule and no guard of dotclaude asks

### Requirement: No wildcard rule on command flags

The snippet SHALL NOT hold a permission rule that finds a flag with `*` around a letter, such as `Bash(rm -*r*)`, because `*` also matches spaces, so the rule matches each `rm` with a dash and an `r` anywhere later in the command line.
The guard SHALL parse the flags of each part of the command, and SHALL ask or deny only on a recursive flag (design D22).

#### Scenario: Plain delete

- **WHEN** an agent runs `rm -f "$TMPDIR/probe/clear-debug.log" && tmux new-session -d -s probe1`
- **THEN** no permission prompt shows

### Requirement: Traced switches only

Each key and `env` entry of the snippet SHALL have an effect that a trace in the bundle of the supported Claude Code version shows, and the wiki SHALL name the trace.
A key with no traced effect SHALL leave the snippet.

#### Scenario: Untraced key

- **WHEN** the wiki gives no trace for a key of the snippet
- **THEN** the snippet test fails and names the key
