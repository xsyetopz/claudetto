# Claude Code Undocumented Other

Some parts of Claude Code fit no other area, such as modding, agent teams, and the status line.
The official docs do not name the items below.
Of its 64 rows, 54 are found only in the program, 7 differ from the docs, and 6 work only behind a flag or a gate.
Anthropic can change or remove each item in any release.

## Found Only in the Program

54 items are in the program but not in the official docs.
These are the most useful ones.

- `workflow-subagent`: Agent used by `Workflow` scripts. See [Subagents Runtime](Claude-Code-Subagents-Runtime).
- `InstructionFileKind`: Tiers `managed`, `user`, `project`, `local`, `memory`. See [Memory and Rules](Claude-Code-Memory-And-Rules).
- `comment-thread-analyst`: Analyzes artifact comment threads. See [Subagents Runtime](Claude-Code-Subagents-Runtime).
- `claude-code-github-action`: The env var `CLAUDE_CODE_ACTION` is set. See [Architecture](Claude-Code-Architecture).
- `autoDreamEnabled`: Background memory consolidation (auto-dream). See [Memory and Rules](Claude-Code-Memory-And-Rules).
- Log sinks: Sets the process title to `claude` and starts the log and telemetry sinks. See [Architecture](Claude-Code-Architecture).
- `main-session`: Internal name for a main session run as a background task. See [Subagents Runtime](Claude-Code-Subagents-Runtime).
- `Precomputed`: A summary made ahead of time replaces the conversation. See [Context and Compaction](Claude-Code-Context-And-Compaction).
- Main action: Starts telemetry, starts `SessionStart` hooks (not on resume), checks forced login, and builds the app state. See [Architecture](Claude-Code-Architecture).
- Plugin folders: Reads `--plugin-dir`, `--plugin-dir-no-mcp`, and `--plugin-url`. See [Architecture](Claude-Code-Architecture).

## Where the Docs Differ

7 items work in a different way from what the docs say.
This is the whole list.

- `autoMemoryDirectory` scope: The schema says project settings are ignored. See [Memory and Rules](Claude-Code-Memory-And-Rules).
- `next.error`: In a `.catch` handler only. See [Mod API Hooks](Claude-Code-Mod-API-Hooks).
- `prompt.edit` hook time: The docs say 50 milliseconds. See [Mod API Hooks](Claude-Code-Mod-API-Hooks).
- `vscode`: The editor webview. Same table as `desktop` without `Client`. See [Mod API UI Elements](Claude-Code-Mod-API-UI-Elements).
- hook `type: "script"`: settings. See [Probes](Claude-Code-Probes).
- Model, fast mode, effort, thinking, and PR status change: Also re-run the command. See [Status Line](Claude-Code-Status-Line).
- `disallowedTools`: Denylist of tools. See [Subagents Frontmatter](Claude-Code-Subagents-Frontmatter).

## Behind a Flag or a Gate

6 items work only when a flag or a gate is on.
This is the whole list.

- Rollout switch: Bundle strings say installed hooks modules wait for a rollout flag, and a message says installed mods are turned off remotely. See [Mod API Nouns and Gates](Claude-Code-Mod-API-Nouns-And-Gates).
- `observer`: Agent type auto-spawned as a background observer whenever this agent runs. See [Subagents Frontmatter](Claude-Code-Subagents-Frontmatter).
- `observerMessage`: Text appended to each activity digest sent to the observer. See [Subagents Frontmatter](Claude-Code-Subagents-Frontmatter).
- `observeSubagents`: Whether subagents inherit the observer. See [Subagents Frontmatter](Claude-Code-Subagents-Frontmatter).
- Agent teams: Several Claude sessions work as teammates. See [Subagents Runtime](Claude-Code-Subagents-Runtime).
- Teammate tools: Extra tools of a teammate. See [Subagents Runtime](Claude-Code-Subagents-Runtime).

## Full Lists

Each page below has the full rows, with the value and the effect.

| Page | Rows |
| --- | --- |
| [Architecture](Claude-Code-Architecture) | 21 |
| [Context and Compaction](Claude-Code-Context-And-Compaction) | 8 |
| [Memory and Rules](Claude-Code-Memory-And-Rules) | 5 |
| [Mod API Hooks](Claude-Code-Mod-API-Hooks) | 2 |
| [Mod API Nouns and Gates](Claude-Code-Mod-API-Nouns-And-Gates) | 1 |
| [Mod API UI Elements](Claude-Code-Mod-API-UI-Elements) | 1 |
| [Output Styles](Claude-Code-Output-Styles) | 3 |
| [Probes](Claude-Code-Probes) | 1 |
| [Status Line](Claude-Code-Status-Line) | 1 |
| [Status Line Fields](Claude-Code-Status-Line-Fields) | 1 |
| [Subagents Frontmatter](Claude-Code-Subagents-Frontmatter) | 4 |
| [Subagents Runtime](Claude-Code-Subagents-Runtime) | 9 |
| [Turn Pipeline](Claude-Code-Turn-Pipeline) | 7 |

## See Also

- [Undocumented](Claude-Code-Undocumented)
- [Claude Code](Claude-Code)
- [Probes](Claude-Code-Probes)
