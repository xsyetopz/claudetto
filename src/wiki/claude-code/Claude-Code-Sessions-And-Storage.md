# Claude Code Sessions and Storage

A session is one saved conversation.
Claude Code writes it to a file on your disk as you work.
You can leave and come back to continue, or branch the conversation to try another path.

## Example

You close the terminal in the middle of a task.
The next day you run `claude --continue` in the same folder.
The conversation, the model, and the permission mode come back.

## Resume and Branch

Source: [Manage Sessions](https://code.claude.com/docs/en/sessions).

| Item | Mark | What it does |
| --- | --- | --- |
| `claude --continue`, `-c` | ✅ | Reopens the newest session of the current folder. |
| `claude --resume [value]`, `-r` | ✅ | Opens the picker, or resumes by session ID, name, or transcript path. |
| `claude --from-pr [value]` | ✅ | Opens a picker with the sessions that link to a pull request. |
| `claude --fork-session` | ✅ | With `--resume` or `--continue`, copies the history to a new session ID. |
| `/branch [name]` | ✅ | Copies the conversation and switches to the copy, and the "allow for this session" grants carry over. |
| `--session-id <uuid>` | ✅ | Uses a UUID that you give for a new session. |
| `-n`, `--name <name>` | ✅ | Names the session in the picker and the terminal title. |
| `--no-session-persistence` | ✅ | Writes nothing, in print mode only. |
| `--resume-session-at <message id>` | 🔍 | A hidden flag that resumes only up to one message. |
| `--reply-on-resume` | 🔍 | A hidden flag that asks the model to reply at once when the transcript ends with a user message. |
| `--rewind-files <user-message-id>` | 🔍 | A hidden flag that restores the files to the state at a message and then exits, and it needs `--resume`. |
| `claude attach`, `logs`, `stop`, `rm`, `respawn` | ✅ | Control background sessions (see [CLI](Claude-Code-CLI)). |
| `CLAUDE_CODE_RESUME_INTERRUPTED_TURN` | ✅ | Resumes a turn that a crash cut off. |

A resumed session restores the history, the model, the agent, the permission mode, an active goal, and scheduled tasks.
It does not restore the values of `--mcp-config`, `--settings`, `--plugin-dir`, `--fallback-model`, or `--add-dir`, so pass them again.
If you resume one session in two terminals, the messages mix in one transcript.

## Where Files Live

Source: [Explore the .claude Directory](https://code.claude.com/docs/en/claude-directory#application-data).
`CLAUDE_CONFIG_DIR` moves `~/.claude`.
The `<project>` name is the folder path with every character other than a letter or a digit changed to `-`.
A name over 200 characters is cut and gets a hash.
`CLAUDE_CODE_PROJECT_DIR_NAME` sets the name by hand, and it needs `CLAUDE_CONFIG_DIR`.

The last column shows whether Claude Code deletes the item after `cleanupPeriodDays`.

| Path under `~/.claude/` | Mark | Content | Cleaned |
| --- | --- | --- | --- |
| `projects/<project>/<session>.jsonl` | ✅ | The transcript. | ✅ |
| `projects/<project>/<session>/subagents/` | ✅ | The transcripts of subagents. | ✅ |
| `projects/<project>/<session>/tool-results/` | ✅ | Large tool outputs and MCP images. | ✅ |
| `projects/<project>/memory/` | ✅ | Auto memory. | ❌ |
| `*.orphaned-<time>-<id>.jsonl`, `*.jsonl.superseded-<time>` | ✅ | Transcripts that Claude Code set aside. | ✅ |
| `file-history/<session>/` | ✅ | Snapshots from before edits, with the 100 newest checkpoints. | ✅ |
| `plans/`, `debug/`, `paste-cache/`, `uploads/<session>/`, `dev-mods/<session>/`, `session-env/` | ✅ | Plan files, debug logs, pastes, uploads, mods that Claude wrote, and session data. | ✅ |
| `tasks/`, `shell-snapshots/`, `backups/` | ✅ | Task lists, shell setup, and copies of `~/.claude.json` (5 are kept). | ✅ |
| `sessions/` | ✅ | One small file for each running session, removed at exit. | ❌ |
| `history.jsonl` | ✅ | Every prompt you typed. | ❌ |
| `stats-cache.json`, `remote-settings.json`, `policy-limits.json`, `cache/changelog.md` | ✅ | Usage totals, cached organization settings, organization limits, and the changelog. | ❌ |
| `.credentials.json`, `agent-memory/`, `jobs/`, `daemon/` | ✅ | Files that you should keep. | ❌ |
| `settings.json`, `plugins/`, `skills/`, `agents/`, `CLAUDE.md` | ✅ | Your configuration. | ❌ |
| `state/`, `mods/`, `bridge-spawn/`, `seed-admin/`, `downloads/`, `cache/model-catalog/` | 🔍 | Seen on a `2.1.303` machine or named in the bundle, and no docs page describes them. | Unknown |

`~/.claude.json`, next to the folder, holds app state, the sign-in, and personal MCP servers.
The default retention is 30 days, and the minimum is 1.
The scratchpad of a session is in the temp folder (`/private/tmp/claude-<uid>/<project>/<session-id>/scratchpad/` on macOS), and `claude purge` does not touch it.
The files are plain text, so a secret that a tool prints goes into the transcript.

## Controls

| Item | Mark | Effect |
| --- | --- | --- |
| `cleanupPeriodDays`, `desktopSessionCleanupPeriodDays` | ✅ | Set how long Claude Code keeps files. |
| `CLAUDE_CODE_SKIP_PROMPT_HISTORY` | ✅ | Writes no transcript and no history in any mode. |
| `CLAUDE_CODE_TRANSCRIPT_LOCAL_GC` | ✅ | Limits the transcript size of `-p` and SDK sessions. |
| `claude purge [path]` | ✅ | Deletes the transcripts, tasks, file history, and config entry of a project, with the flags `--all`, `--dry-run`, `-i`, and `-y`. |
| `/export` | ✅ | Exports a conversation. |

## See Also

- [Sessions Transcript](Claude-Code-Sessions-Transcript)
- [Context and Compaction](Claude-Code-Context-And-Compaction)
- [CLI](Claude-Code-CLI)
- [Env Vars](Claude-Code-Env-Vars)
