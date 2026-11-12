# session-hygiene Specification

## Purpose
Remove stale files that claudetto and Claude Code leave under `~/.claude/` and in the project.

## Requirements

### Requirement: Stale Generated Files Go

Hygiene SHALL remove stale files that programs generate under `~/.claude/`, by a list of paths and age limits in code, each with its source. It SHALL NOT touch a settings file, a credentials file, `CLAUDE.md`, a skill, an agent, a plugin install, or a transcript newer than its limit (D11).

#### Scenario: Listed Path

- **WHEN** a listed path holds a file past its limit
- **THEN** the file is removed and counted in the report

#### Scenario: Unlisted Path

- **WHEN** a file is under a path that is not listed
- **THEN** it is left

### Requirement: Dry Run First

Hygiene SHALL print what it would remove with `--dry-run`, and the automatic run SHALL never block a session start.

#### Scenario: Dry Run

- **WHEN** hygiene runs with `--dry-run`
- **THEN** it lists the files and removes none

### Requirement: Retention per Kind

Each kind hygiene removes SHALL have its own retention key in the plugin's `userConfig`, named in Claude Code's style: `sessionTempCleanupPeriodDays` and `probeCleanupPeriodMinutes`. A key's value of 0 SHALL turn its kind off. An unset day key SHALL follow `cleanupPeriodDays`, and an unset `probeCleanupPeriodMinutes` SHALL be 60. `hygieneEnabled: false` SHALL start no hygiene process.

#### Scenario: Kind Off

- **WHEN** `probeCleanupPeriodMinutes` is 0 and a `fswatch-probe-*` folder is a day old
- **THEN** the folder stays and the other kinds are still swept

#### Scenario: Hygiene Off

- **WHEN** `hygieneEnabled` is `false` and a session starts
- **THEN** no hygiene process runs

### Requirement: Temp Root Is Found, Not Assumed

Hygiene SHALL look for Claude Code's temp folder `claude-<uid>` under `CLAUDE_CODE_TMPDIR`, `/tmp`, and the system temp folder. It SHALL sweep each real path once, and only a folder that exists and that the user owns.

#### Scenario: Two Candidates, One Folder

- **WHEN** two candidates resolve to the same real folder
- **THEN** it is swept once

#### Scenario: Folder of Another User

- **WHEN** a candidate folder is owned by another uid
- **THEN** it is not swept

### Requirement: Roots Are Guarded

Hygiene SHALL refuse a root inside `~/.claude/projects` or `~/.claude/plugins`, and a root that is the home folder itself.

#### Scenario: Home as Project

- **WHEN** the project root resolves to the home folder
- **THEN** hygiene removes nothing and reports the refusal

### Requirement: No Request Growth

Hygiene SHALL add no model call, tool, command, skill, or prompt text. The prompt bytes that `just prompt-bytes` prints from fixed inputs SHALL read the same totals before and after a hygiene change.

#### Scenario: Capture After a Change

- **WHEN** `just prompt-bytes` runs after a hygiene change
- **THEN** its totals equal the readings taken before it

### Requirement: Build Folders Go by a Trash File

Hygiene SHALL remove a project folder that a rule of `hygiene/trash.toml` names, in the gitleaks config format, and a `gcroot` rule SHALL name a symlink that points into `/nix/store/`.

#### Scenario: Rule Names a Nix Root

- **WHEN** a `gcroot` rule matches a symlink that points into `/nix/store/`
- **THEN** the symlink is a match

### Requirement: A Project Trash File Replaces or Extends the Plugin's

A project file `.claude/claudetto/trash.toml` SHALL replace the plugin's file, and with `[extend] useDefault = true` it SHALL add its rules to the plugin's, where `disabledRules` drops a rule by id.

#### Scenario: Project File Replaces the Rules

- **WHEN** the project holds `.claude/claudetto/trash.toml` without `useDefault`
- **THEN** only its rules apply

#### Scenario: Extending

- **WHEN** the project file sets `[extend] useDefault = true` and lists a rule id in `disabledRules`
- **THEN** the plugin's rules apply except that rule, plus the project's rules

### Requirement: The Trash Walk and Age Limit

The walk SHALL start at the project, at each project `.claude.json` lists, and at each folder that Mole's `~/.config/mole/purge_paths` lists, with a leading `~` read as the home folder, and SHALL skip a listed folder that hygiene refuses as a root. The walk SHALL stop at a match, SHALL skip `.git`, SHALL NOT follow a link, and SHALL NOT enter `~/.claude/projects` or `~/.claude/plugins`. The age limit SHALL be 7 days, or `--trash-days`, where 0 turns the kind off.

#### Scenario: Kind Off

- **WHEN** `--trash-days` is 0
- **THEN** no build folder is removed

#### Scenario: Another Checkout Under a Purge Path

- **WHEN** `purge_paths` lists a folder holding an idle checkout with an old ignored `node_modules`
- **THEN** the `node_modules` is removed ("an old build folder in an idle checkout under a Mole purge path is swept", "a purge path written with ~ is read from the home folder")

#### Scenario: A Project Claude Code Lists

- **WHEN** `.claude.json` lists an idle checkout with an old ignored `node_modules`, and `purge_paths` does not
- **THEN** the `node_modules` is removed ("an old build folder in an idle checkout that Claude Code lists is swept")

#### Scenario: A Listed Project in Use

- **WHEN** the index of a listed checkout changed within the age limit, or a process runs in it
- **THEN** its build folders stay

#### Scenario: The Home Folder as a Project

- **WHEN** `.claude.json` lists the home folder
- **THEN** the walk does not start there ("a listed project that is the home folder is not walked")

#### Scenario: Claude Code's Own Folders

- **WHEN** `purge_paths` lists `~/.claude`, and checkouts under `~/.claude/plugins` and `~/.claude/projects` hold old ignored build folders
- **THEN** none is removed ("the walk skips ~/.claude/plugins and ~/.claude/projects inside a purge path")

### Requirement: Mole Clears Caches

After the sweep, hygiene SHALL run `mo clean` with no terminal on stdin, so Mole clears user caches without a prompt and skips the caches that need `sudo`; with `--dry-run` it SHALL run `mo clean --dry-run`. The report SHALL end with Mole's exit code, or, when `mo` is not on `PATH`, with its install command.

#### Scenario: Unattended Clean

- **WHEN** hygiene runs and `mo` is on `PATH`
- **THEN** `mo clean` runs with stdin that is no terminal, and the report names its exit code ("the sweep runs mo clean with no terminal on stdin and reports its exit")

#### Scenario: Mole Missing

- **WHEN** `mo` is not on `PATH`
- **THEN** the report names `brew install mole` ("a missing mo names its install command")

### Requirement: A Build Folder Match Stays Unless Safe

A match SHALL stay unless the conditions of the scenarios below hold.

#### Scenario: A Match Stays

- **WHEN** a match is not in a git checkout, is in the checkout the session works in, has a process in its checkout or holding a file inside it, is not ignored by git, or has the checkout's git index or a file inside changed within the age limit
- **THEN** it stays

#### Scenario: Old Ignored Build Folder

- **WHEN** an ignored `node_modules` sits in another checkout, no process holds it, and nothing in it or in that checkout's index is newer than 7 days
- **THEN** it is removed and counted under its rule id

#### Scenario: Own Checkout

- **WHEN** the folder is in the checkout the session works in
- **THEN** it stays

#### Scenario: Process List Unreadable

- **WHEN** `lsof` exits with an error
- **THEN** no build folder is removed

### Requirement: Heartbeat Files Go in a Day

Hygiene SHALL remove each file under `.claude/claudetto/heartbeat/` older than one day. The limit SHALL not follow `cleanupPeriodDays`.

#### Scenario: Old Heartbeat

- **WHEN** a heartbeat file is two days old
- **THEN** it is removed and counted as `heartbeat`
- **AND** the test is `tools/hygiene/sweep.test.ts`, "a heartbeat file older than a day goes and a newer one stays"

#### Scenario: Fresh Heartbeat

- **WHEN** a heartbeat file is an hour old
- **THEN** it stays

### Requirement: Idle Temp Entries Go

Hygiene SHALL remove a top-level file or folder of Claude Code's temp folder `claude-<uid>` when a `temp` rule of the trash file names it, nothing in it changed within `probeCleanupPeriodMinutes` (60 when unset), and no process holds a file in it open. It SHALL keep the entries Claude Code owns, and SHALL remove no temp entry when the open files cannot be read. The entry SHALL need no marker file.

#### Scenario: An Idle Folder

- **WHEN** `claude-<uid>/cos-fx-1` holds no file changed in the last 60 minutes and no process holds a file in it
- **THEN** the folder is removed and counted under its rule id

#### Scenario: A Folder in Use

- **WHEN** a file in the folder changed 10 minutes ago, or a process holds a file in it open
- **THEN** the folder stays

#### Scenario: Claude Code's Own Entry

- **WHEN** the entry is `-Users-me-project`, `bash-edit-diff`, `plugin-tool-staging`, `cc-socks`, or a nested `claude-<uid>`
- **THEN** this rule leaves it, because the rule's allowlist in the trash file names it

#### Scenario: An Entry That Cannot Be Removed

- **WHEN** `rm` fails on one idle entry
- **THEN** the failure is logged, the entry is left out of the report, and the other entries are removed

#### Scenario: Process List Unreadable

- **WHEN** `lsof` exits with an error
- **THEN** no temp entry is removed

#### Scenario: An Entry Vanishes During the Search

- **WHEN** another process removes an entry while the sweep searches the temp folder for recent changes
- **THEN** the other idle entries are still named and removed

#### Scenario: An Entry the Search Cannot Read

- **WHEN** the search fails on one entry for a reason other than that it vanished
- **THEN** that entry stays, and the others are named and removed

#### Scenario: A Second Dry Run

- **WHEN** a sweep removed every idle entry and a dry run follows at once
- **THEN** the dry run names no temp entry

### Requirement: The Sweep Starts at Each Session Start

Hygiene SHALL start its sweep at a `SessionStart` of source `startup`, `resume`, `clear`, or `compact`, so a session that runs for days still sweeps. The start SHALL NOT wait for the sweep.

#### Scenario: A Resume or a Compaction

- **WHEN** a session resumes or compacts
- **THEN** the sweep runs in the project with the session id

### Requirement: Local Branches Nothing Needs Go

Hygiene SHALL delete a local branch of the session's project and of each project `.claude.json` lists when no worktree of the checkout has it checked out, it is not the default branch, its newest commit is older than `trashCleanupPeriodDays` (7 when unset), and `git cherry` finds each of its commits in the default branch, by `origin/HEAD` when set and by `main` or `master` otherwise. It SHALL name each deleted branch in the report, and in a dry run SHALL name it and delete nothing.

#### Scenario: A Merged Branch

- **WHEN** every commit of an old branch is in the default branch and no worktree has it checked out
- **THEN** the branch is deleted

#### Scenario: A Branch With Work

- **WHEN** the branch holds a commit the default branch lacks, is checked out in a worktree, or is the current branch
- **THEN** it stays

#### Scenario: A New Branch

- **WHEN** the newest commit of a branch with nothing of its own is newer than the age limit
- **THEN** it stays

### Requirement: Remote Branches Go Only on Request

Hygiene SHALL name each remote branch of `origin` that nothing needs only when `--remote` is passed, and SHALL delete it only when `--remote` is passed without `--dry-run`. The automatic sweep SHALL NOT pass `--remote`.

#### Scenario: What Nothing Needs

- **WHEN** a remote branch is not the default branch, no open pull request names it as head, and no worktree of the checkout has it checked out
- **THEN** it is one nothing needs when a merged pull request of the repository has its newest commit as head, or `git cherry` finds each of its commits in the default branch

#### Scenario: A Merged Pull Request

- **WHEN** a merged pull request has the tip of `origin/fix/x` as head and no open pull request names the branch
- **THEN** `--remote --dry-run` names it and `--remote` deletes it

#### Scenario: An Open Pull Request

- **WHEN** an open pull request names the branch as head
- **THEN** it stays

#### Scenario: No Request

- **WHEN** the sweep runs without `--remote`
- **THEN** no remote branch is named or deleted

#### Scenario: A Remote That Does Not Answer

- **WHEN** `git ls-remote` of one project waits for credentials past 60 seconds
- **THEN** the call is stopped and logged, that project's remote branches stay, and the next project is judged
- **AND** the lab test is `trash.test.ts`, "a call that runs past its limit is stopped and logged, and answers nothing"

### Requirement: Agent Worktrees Nothing Needs Go

Hygiene SHALL remove a worktree that Claude Code made for an agent, with its branch, when git lists it without a lock, `git status` shows no change in it, and `git cherry` finds each of its commits in the current branch of the checkout. It SHALL do this in the session's project and in each project `.claude.json` lists, and SHALL name each unlocked agent worktree that stays, with its size and the reason.

#### Scenario: Integrated Work

- **WHEN** the lead cherry-picked every commit of `.claude/worktrees/agent-a0123456789abcdef` and the worktree is clean and unlocked
- **THEN** `git worktree remove` removes it, its branch `worktree-agent-a0123456789abcdef` is deleted, and the report counts its bytes

#### Scenario: Work That Is Nowhere Else

- **WHEN** the worktree holds an uncommitted change, or a commit the current branch lacks
- **THEN** the worktree and its branch stay, and the report names the path, the size, and the reason

#### Scenario: An Agent Still Runs

- **WHEN** git lists the worktree as locked
- **THEN** it stays and the report leaves it out

#### Scenario: A Folder That Is Gone

- **WHEN** git marks the record of an agent worktree `prunable`, because its folder is gone
- **THEN** the record is neither removed nor named, since it holds no file

#### Scenario: Another Project

- **WHEN** `.claude.json` lists a project other than the session's
- **THEN** its agent worktrees are judged by the same rule

#### Scenario: A Listed Project That Is Gone

- **WHEN** `.claude.json` lists a project whose folder no longer exists
- **THEN** the sweep logs it once, runs no git call in it, and judges the next project
- **AND** the lab test is `worktrees.test.ts`, "a listed project whose folder is gone is logged once and left out, and the next project stays"

#### Scenario: A Dry Run

- **WHEN** the sweep runs with `--dry-run`
- **THEN** the report names what would go and nothing is removed
