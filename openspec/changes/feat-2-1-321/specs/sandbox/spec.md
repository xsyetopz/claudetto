## ADDED Requirements

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
