# Spec Delta: `worktree-hooks`

## Purpose

Makes and removes the git worktree of a session with the classic hooks `WorktreeCreate` and `WorktreeRemove`, and keeps each file that a session made.

## ADDED Requirements

### Requirement: Create a worktree from HEAD

The `WorktreeCreate` hook SHALL make a git worktree of the main repository from `HEAD`, on a new branch, and print its path.
It SHALL copy each file that `.worktreeinclude` names and git ignores, and it SHALL not copy a file that git does not ignore.
A name with a path part, or a folder with no repository, SHALL fail with a reason and make no worktree.

#### Scenario: A worktree with included files

- **WHEN** the repository has a `.worktreeinclude` that names an ignored file
- **THEN** the new worktree starts from `HEAD` and has a copy of that file
- **AND** the hook prints the path of the worktree

#### Scenario: A name with a path part

- **WHEN** the name of the worktree is `../x`
- **THEN** the hook fails with a reason, and no worktree is made

### Requirement: Remove only a worktree with no session file

The `WorktreeRemove` hook SHALL remove a worktree only when `git status --ignored` shows no file that a session made.
A file that `.worktreeinclude` copied SHALL not count.
When the worktree stays, the reason SHALL name the files.
A branch with commits that are not merged SHALL stay.

#### Scenario: Only copied files

- **WHEN** the worktree has only the files that `.worktreeinclude` copied
- **THEN** the hook removes the worktree

#### Scenario: A file of a session

- **WHEN** a session made a file in the worktree, also an ignored file
- **THEN** the worktree stays, and the reason names the file

#### Scenario: A worktree that is gone

- **WHEN** the folder of the worktree does not exist
- **THEN** the hook exits with 0
