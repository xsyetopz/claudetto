# Worktrees

This page describes the `WorktreeCreate` and `WorktreeRemove` hooks of the core plugin `claudetto`.
It is for a user whose agents work in git worktrees and for a contributor who edits the `worktree` slice.

## Why the Plugin Has the Hooks

A `WorktreeCreate` hook replaces the creation of a worktree in Claude Code.
Claude Code then does not copy the files of `.worktreeinclude`, so the hook does the copy itself.

## Create

The hook `WorktreeCreate` makes the worktree with `git worktree add`:

- The folder is `.claude/worktrees/<name>` in the main checkout.
- The branch is `worktree-<name>`, and it starts at `HEAD`.
- The hook copies each file that `.worktreeinclude` names and that git ignores.
  A file that git does not ignore is not copied.
- The hook prints the path of the worktree on stdout.

A name with a path part, a folder with no repository, or a failed `git` call gives exit code 1 and a reason on stderr.
The setting `worktree.baseRef` is `head` in the [settings snippet](Settings-Snippet) too, for the case that the hook is off.

## Remove

The hook `WorktreeRemove` runs `git status --ignored` in the worktree.
It removes the worktree only when the status shows no file that a session made.
A file that `.worktreeinclude` copied does not count.
Any other file, ignored or not, and any change to a tracked file keep the worktree.
The hook then exits with code 1 and names the files on stderr.

After a removal, the hook deletes the branch with `git branch -d`.
A branch with unmerged commits stays.

## This Repository

The `.worktreeinclude` of this repository names the generated Claude Code types:
`.claude-plugin/types/` and `plugins/*/.claude-plugin/types/`.
A new agent worktree then has the types that `just typecheck` needs.
It still needs `bun install` for the dev dependencies.

## Related Pages

- [Output GC](Output-GC)
- [Settings Snippet](Settings-Snippet)
