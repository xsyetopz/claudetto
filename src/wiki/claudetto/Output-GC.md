# Output GC

This page describes how the core plugin `claudetto` records the files that a session makes outside the project, and how it removes the files that nothing uses.
It is for a user who wants to know what the sweep removes and for a contributor who edits the `gc` slice.

## What the Sweep Is For

Claude and its agents make folders and files outside the project: `mktemp` folders, worktrees, repository copies, sandbox config folders, and scratch files.
Nobody removes them, so they fill the disk.
The `gc` slice records each one when a session makes it, and a sweep removes the ones that nothing uses.

## What Is Recorded

A `tool.call` hook watches the `Bash` and `Write` tools.
It records these outputs:

| Kind | Source |
| --- | --- |
| `temp` | The path that `mktemp` prints. |
| `worktree` | The path of `git worktree add`. |
| `copy` | The target of `git clone` and `cp -r`. |
| `config` | The value of `CLAUDE_CONFIG_DIR=` in a command. |
| `scratch` | The file of a `Write` call inside a temp folder. |

A path that starts with `~` or `$` is not recorded, because the hook cannot expand it.
Each record holds the path, the kind, the session id, the time, and the working folder.
The records of one session are in `~/.claudetto/gc/<session id>.json`.

## What the Sweep Removes

The sweep removes a path only when all these rules are true:

1. The path is in a record.
2. The path is strictly inside an allowed root.
   The roots are the temp folder of the user and the `.claude/worktrees/` folder of the project where the session ran.
3. The path is not a symlink, and no part of its real path leaves the root.
4. No live session needs it.
   A session is live when its file in `sessions/` of the config folder names a running process.
   A path stays when it belongs to a live session, or when the folder of a live session is inside it.
5. The path is older than 7 days.
   After that, the sweep removes the oldest unused paths until the unused paths take at most 5 GiB.

The sweep never removes a path by a name pattern.
A path that is outside each root, or that is a symlink, stays.
The report names it with the status `skip`, and its record is dropped.
After a removed worktree, the sweep runs `git worktree prune` in the project.
The two bounds are in [Bounds](Bounds).

## When the Sweep Runs

- At session start, in the `session.start` hook.
- At session end, in the `session.end` hook.
  The ending session does not count as live, so its own outputs can go when they are old enough.
  The sweep stays under the time budget that Claude Code leaves at the end of a session.
- On request, with the bin `claudetto-gc` or the command `/claudetto:gc`.

The hooks write the report to the debug log.
A report names each path with its size, the count of removed paths, and the space that the sweep freed.

## The Dry Run

```bash
claudetto-gc --dry-run
```

The dry run lists each path with its size and the total.
It removes nothing and changes no record.
Run it before the first sweep to see what the sweep removes.

## Related Pages

- [Bounds](Bounds): the age bound and the size bound.
- [Architecture](Architecture): the slices of the core plugin.
