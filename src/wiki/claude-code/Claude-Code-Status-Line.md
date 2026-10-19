# Claude Code Status Line

The status line is a bar at the bottom of Claude Code that shows the text of a script that you write.
The script gets session data as JSON on `stdin`, such as the model and the cost, and prints what to show on `stdout`.
For example, a script can print the model name and the git branch.
It does not use API tokens.
The JSON fields are on the page [Status Line Fields](Claude-Code-Status-Line-Fields).

## Legend of Marks

✅ documented, 🔍 undocumented (found in the bundle), ⚠️ the docs differ from the bundle, 🧪 behind a flag or gate, ❌ removed or inert.

## Settings

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `statusLine.type` | Kind of status line | Must be `"command"`. Required | User, project, local, managed | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `statusLine.command` | Script path or inline shell command | Runs in a shell. A change to it runs the new command at once, without the debounce | Same | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `statusLine.padding` | Extra horizontal space in characters | Default `0`. Adds to the built-in spacing | Same | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `statusLine.refreshInterval` | Re-runs the command every N seconds | Minimum `1`. The bundle uses `Math.max(1, n) * 1000` ms. For clocks and idle sessions | Same | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `statusLine.hideVimModeIndicator` | Hides the built-in `-- INSERT --` text | Use when the script prints `vim.mode` itself | Same | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `subagentStatusLine` | Custom row for each subagent in the agent panel | Fields `type` (`"command"`) and `command`. See the next section | Same | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), schema |
| ✅ | `/statusline` | Writes a script in `~/.claude/` and the setting | Takes natural language. `/statusline delete` removes it | Interactive | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `disableAllHooks` | When `true` outside managed settings, only a managed `statusLine` runs | With no managed `statusLine` the status line is off | Settings | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `allowManagedHooksOnly` | Only a managed `statusLine` shows | A custom one disappears without a warning | Managed | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | Workspace trust | The command waits for trust | `--debug` logs `Status line command skipped: workspace trust not accepted` | Project files | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | `CLAUDE_CODE_SAFE_MODE` | Status line commands do not load | Managed policy still applies | Env | [Environment Variables](https://code.claude.com/docs/en/env-vars) |

## When the Script Runs

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Session start and resume | First run | Runs once | Each session | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | New assistant message, `/compact` done, permission mode change, vim mode toggle | Re-runs the command | Debounced at 300ms. A new trigger cancels a running script | Each session | [Customize Your Status Line](https://code.claude.com/docs/en/statusline) |
| ✅ | Rate-limit `resets_at` and cache `expires_at` | Re-runs at the earliest time | Taken from the data the script last received | Each session | [Customize Your Status Line](https://code.claude.com/docs/en/statusline), bundle |
| ⚠️ | Model, fast mode, effort, thinking, and PR status change | Also re-run the command | The bundle watches `mainLoopModel`, `fastMode`, `effortValue`, `thinkingEnabled`, `prStatus`. The docs list do not name them | Each session | bundle |

## Output Rules

- Each printed line is a row.
  ANSI colors and OSC 8 links work.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline).
- The output shows only after exit code `0`.
  A non-zero exit or empty output blanks the line.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline).
- Claude Code sets `COLUMNS` and `LINES` before it runs the script.
  `tput cols` does not work.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline).
- The env `CLAUDECODE` and `CLAUDE_CODE_CHILD_SESSION` are set in the script process.
  Source: [Environment Variables](https://code.claude.com/docs/en/env-vars).
- `claude --debug` logs `stderr` of each run and the exit code of the first run.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline).
- The line hides during the help menu and permission prompts.
  Outside fullscreen, notifications share the row.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline).
- On Windows use forward slashes in `command`.
  `CLAUDE_CODE_POWERSHELL_RESPECT_EXECUTION_POLICY` changes the PowerShell policy flag.
  Source: [Customize Your Status Line](https://code.claude.com/docs/en/statusline), [Environment Variables](https://code.claude.com/docs/en/env-vars).

## Subagent Status Line

The command runs once per refresh tick and gets all visible rows as one JSON object.
It prints one JSON line per row to override: `{"id": "<task id>", "content": "<row body>"}`.
A row without `id` keeps the default.
An empty `content` hides the row.
The same trust, `disableAllHooks`, and `allowManagedHooksOnly` gates apply.
A plugin can ship a default `subagentStatusLine` in its `settings.json`.
The task fields are in [Status Line Fields](Claude-Code-Status-Line-Fields).

## Not Yet Checked

- Not verified: the exact text of the debounce for `subagentStatusLine`.

## See Also

- [Customize Your Status Line](https://code.claude.com/docs/en/statusline)
- [Status Line Fields](Claude-Code-Status-Line-Fields)
- [Output Styles](Claude-Code-Output-Styles)
- [Hooks](Claude-Code-Hooks)
