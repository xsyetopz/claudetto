# Session Hygiene

This page tells what the `hygiene` slice of the core plugin `claudetto` does at the start of a session and after each edit.
A user reads it to learn which files and folders claudetto removes.
A contributor reads it before an edit of `plugins/claudetto/modules/session/hygiene/`.

## The Cleanup at Session Start

The `session.start` hook starts the cleanup and does not wait for it, so it does not block the start of the session.
The cleanup is one `sh` script.
It removes only what it can show is not in use.
It finds the age of a folder from its modification time.
A session is live when a file in `~/.claude/sessions` (or `$CLAUDE_CONFIG_DIR/sessions`) names its id, or when it is the current session.

| What | Where | Rule |
| --- | --- | --- |
| Leftover probe folders | `fswatch-probe-*` in `<CLAUDE_CODE_TMPDIR or /tmp>/claude-<uid>` | Older than `PROBE_MAX_AGE_MIN` (60 minutes). A bug of Claude Code leaves them (anthropics/claude-code#104170) |
| Session folders | `claude-<uid>/*/<uuid>` in the same folder | Older than `cleanupPeriodDays` (30 days when the setting is not set), and not live |
| Gate logs and other session files | `<tmp>/claudetto/*/<uuid>.*` | The same rule as session folders |
| Worktrees | `<project>/.claude/worktrees/*` | See below |

The probe sweep has a timeout of `SWEEP_TIMEOUT_MS` (60,000 ms).

### Worktrees

A worktree goes with `git worktree remove` only when all of these are true:

- No session file has its `cwd` in the worktree.
- It is older than the age.
- It is a `git` worktree.
- It is clean, with no changed, untracked, or git-ignored file, because `git worktree remove` deletes the git-ignored files, such as `.env`.
  The files in a folder that a tool makes again do not count: `node_modules`, `.venv`, `__pycache__`, `dist`, `build`, `target`, `.next`, and `coverage`.
- It has no commit that is not on another branch or a remote.

Otherwise the cleanup keeps it and names the reason: live, young, not a worktree, dirty, unmerged, or not removed.

### The Messages

The hook writes one line to the log of the interface, which the model does not read.
The line is the `CLEANED` message:
``claudetto cleanup removed 2 folders, 1 file of 3 MB.``
It names only what the cleanup removed, with the count and the noun in the same number, and it adds the size when bytes went.
When the cleanup removes nothing, or fails, the hook writes no line.

## The Edit Ledger

Claude cannot know that a file changed after its last edit when the user or a tool changed it.
Another Claude session of the project can also change a file.
The slice keeps one ledger for the project for this.

The ledger is a value of the private store of the plugin (`$.store`), under the key `ledger:<project key>`.
The store is one file for each plugin, with mode `0o600`, so the ledger is private to the user, and it stays when the temp folder is recreated.
The project key is the base name of the project root and a hash of its path.
Each line holds the path, the hash of the file (FNV-1a, 64 bits), the session, the agent (`main`, or the agent type), and `via`: `edit` for an `Edit` or `Write`, and `bash` for the capture of a `Bash` call.
A stored line with no valid `via` is dropped.
Each session of the project reads the same value, because each `get` reads the store file from disk.
The reader is in `plugins/claudetto/modules/project/domain/ledger.ts`, because the `guard` and `notes` slices read it too ([Guard](Guard)).

1. Before each `Edit` or `Write`, the `classic.PreToolUse` hook adds a line of `edit` with the hash of the content that the call will write.
   For a `Write` that is the `content`, and for an `Edit` it is the file with `old_string` replaced.
   It adds none when the read fails or `old_string` does not match.
2. After each `Edit` or `Write` that succeeds, the `classic.PostToolUse` hook adds a line.
   After each `Bash` call, it adds a line for each file of `git status` whose time of change is after the start of the call.
   A `get` and a `set` of the store are not atomic together, so a write that lost a race to another write runs again, at most `LEDGER_WRITE_TRIES` (5) times.
   The ledger holds at most `LEDGER_MAX_FILES` (2000) lines, which is about 0.5 MB of the 4 MiB of the store, and the oldest line goes first.
Notes on the ledger:

- A file that a tool changed counts as a change of the user, because no ledger line holds it.
- The `protect` slice reads the ledger too: a protected file that a line of `edit` holds with its current hash is the effect of an `Edit` or `Write`, and a `Bash` call does not undo it.

## Moved Plan Files

The `protect` slice leaves `ARCHIVE_DIR` (`openspec/changes/archive`) out of its search, so a plan or spec file that a `Bash` call moved there looks deleted.
Before it writes a deleted file back, the slice looks for a file with the same text.
It reads `openspec/changes/archive/*-<name>/<rel>` for a deleted `openspec/changes/<name>/<rel>`, which is the layout of `openspec archive`, and then the plan files of `openspec/` with the same name, archive included.
A file with the same text moved, so no hook was skipped, and the slice writes nothing back.
The same holds for the delete of a duplicate whose exact text is in the archive.
A delete with no copy of the text, and a moved file whose text changed (a box ticked on the way), are still written back.

## Heading Case

After an `Edit` or a `Write` of a `.md` file, the same hook sets the Chicago Title Case of each ATX heading (`#` to `######`) in the file.
The front matter, a fenced code block, a code span, a word with a digit or an inner capital, and a path stay as typed.
The hook sets the case before it hashes the file, so the ledger holds the file as it stays.
The model gets one line that names the file and the count, and it must read the file again before the next `Edit`.
A file over `HEADINGS_FILE_MAX` characters stays as it is.

## Related Pages

- [Guard](Guard)
- [Agents](Agents)
- [Bounds for Slices](Bounds-Slices#hygiene)
- [Controls](Controls)
