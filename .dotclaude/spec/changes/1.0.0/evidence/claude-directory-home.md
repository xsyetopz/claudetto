# P28 `~/.claude.json` and `~/.claude/`

This part of the [P28 report](claude-directory.md) covers the home folder.
The short names in the column "Source" are in the main file.
"Git" is "Never" for each entry here, because the folder is outside any repository.

## Authored files

| Entry | What it does | Writes | Read | Control | Source |
| - | - | - | - | - | - |
| `~/.claude.json` | App state, OAuth state, UI toggles, personal MCP servers, and one entry for each project (trust, history, MCP servers). | Claude Code | At launch. | `claude purge` removes the entry of one project. Claude Code keeps the five newest earlier copies in `backups/`. | `cd` |
| `~/.claude/CLAUDE.md` | Personal instructions for all projects. | You | At launch, before project files. It does not count for the `AGENTS.md` check. | `claudeMdExcludes`, `--setting-sources`, `CLAUDE_CODE_DISABLE_CLAUDE_MDS`. | `mem` |
| `~/.claude/rules/*.md` | Personal rules for all projects. | You | Before project rules. | `claudeMdExcludes`. Not read from `~/.claude/` when `user` is not in `--setting-sources` (not traced). | `mem` |
| `~/.claude/settings.json` | Permissions, hooks, env vars, and model defaults for all projects. The built-in `AGENTS.md` plugin options are read only from here, `--settings`, or managed settings. | You | At launch. | `--settings`, `--setting-sources`. | `cd`, `mem` |
| `~/.claude/skills/`, `commands/`, `agents/`, `output-styles/`, `workflows/` | The same as the project folders, for all projects. | You | The same as the project folders. | The same as the project folders. | `cd` |
| `~/.claude/agent-memory/` | Memory of subagents. Keep it. | Claude Code | When the subagent runs. | The `memory` field of the agent. | `cd` |
| `~/.claude/keybindings.json` | Custom keyboard shortcuts. | You | Not in the fetched pages. | Not in the fetched pages. | `cd` |
| `~/.claude/themes/*.json` | Custom color themes. | You | Not in the fetched pages. | Not in the fetched pages. | `cd` |
| `~/.claude/projects/<project>/memory/` | Auto memory: `MEMORY.md` and one file for each topic. The first 200 lines or 25 KB of `MEMORY.md` load at the start of a session. Topic files load on demand. All worktrees of one repository share it. | Claude Code | At launch (`MEMORY.md` only). | `autoMemoryEnabled`, `autoMemoryDirectory`, `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CODE_PROJECT_DIR_NAME`. The retention sweep does not delete it. | `mem` |
| `~/.claude/plugins/` | Cloned marketplaces, installed plugin versions, `installed_plugins.json`, and data of each plugin. Synced plugins go to `plugins/synced/`. | `claude plugin` commands | At launch. | `enabledPlugins`. Do not delete it. | `cd` |
| `~/.claude/.credentials.json` | Login credentials. Keep it. | Claude Code | At launch. | Not in the fetched pages. | `cd` |
| `~/.claude/jobs/`, `~/.claude/daemon/` | State of background sessions. Keep them. | Claude Code | Not in the fetched pages. | Not in the fetched pages. | `cd` |
| `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS), `/etc/claude-code/CLAUDE.md` (Linux, WSL), and `managed-settings.json` | Managed policy instructions and settings. `claudeMdExcludes` cannot exclude them. | IT | At launch. | `claudeMd` key in managed settings. | `mem`, `cd` |

## Data that Claude Code writes

Claude Code writes these entries during sessions.
The files are plaintext.
The default retention is 30 days (`cleanupPeriodDays`, minimum 1).
Project instruction files do not use any of them.

| Path under `~/.claude/` | Contents | Retention |
| - | - | - |
| `projects/<project>/<session>.jsonl`, `subagents/`, `tool-results/` | Transcripts, subagent transcripts, and large tool output. | Swept. |
| `file-history/<session>/` | Snapshots before edits, for checkpoint restore. | Swept. |
| `plans/`, `debug/`, `paste-cache/`, `session-env/`, `tasks/`, `shell-snapshots/` | Plans, debug logs, large pastes, session metadata, task lists, and shell setup. | Swept. |
| `uploads/<session>/`, `image-cache/<session>/` | Attachments. | Swept. |
| `dev-mods/<session>/` | Mods that Claude wrote in a session. | Swept. |
| `backups/`, `feedback-bundles/`, `feedback/drafts/`, `usage-data/` | Copies of `~/.claude.json`, feedback files, and `/insights` reports. | Swept. |
| `skills/.trash/`, `plugins/.trash/`, `plugins/installed_plugins.*` copies | Items that a sync or a rewrite set aside. | Swept. |
| `todos/`, `statsig/`, `logs/` | Legacy. No longer written. | Swept. |
| `sessions/` | One file for each running session. | Removed at exit. |
| `history.jsonl` | Each prompt that you typed. | Kept. |
| `stats-cache.json`, `remote-settings.json`, `policy-limits.json`, `cache/changelog.md` | Caches. | Kept. Safe to delete. |

The scratchpad of a session is outside `~/.claude/`, in the temp folder.
`CLAUDE_CODE_TMPDIR` moves it.
`claude purge` removes the state of one project.
`CLAUDE_CODE_SKIP_PROMPT_HISTORY` stops the transcript and prompt history files.
Source of this table: `cd`, "Application data".
