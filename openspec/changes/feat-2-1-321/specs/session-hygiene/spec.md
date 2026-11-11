## ADDED Requirements

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
- **THEN** the sweep logs it and judges the next project

#### Scenario: A Dry Run

- **WHEN** the sweep runs with `--dry-run`
- **THEN** the report names what would go and nothing is removed

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Marked Temp Folders Go

**Reason**: The rule removed only a folder that held a `.created-by-claudetto` marker, and none of the 9,567 folders in the temp folder held one, so a dry run of the sweep found nothing there to remove.

**Migration**: The requirement "Idle Temp Entries Go" removes a temp entry by its age and its open files. A `temp` rule of the trash file still chooses the names, and `probeCleanupPeriodMinutes` still sets the age.
