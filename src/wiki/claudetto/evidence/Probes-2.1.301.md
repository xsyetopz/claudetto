# Probes of 2.1.301

This page gives the answers of checks that cost no model call, on Claude Code `2.1.301`.
Read it to learn what a plugin hooks file, a plugin agent file, and a `Stop` hook input accept.
The checks ran on 2026-10-16.
The sources are the mod API types (`.claude-plugin/types/claude-code/index.d.ts`), the strings of the native binary, and `claude plugin validate --strict` on a probe plugin in `$TMPDIR`.
The probe used `CLAUDE_CONFIG_DIR` in `$TMPDIR`.

## Answers

| Question | Answer | Source |
| --- | --- | --- |
| Does a plugin `hooks.json` accept `type: "prompt"` and `type: "agent"`? | Yes. A `Stop` entry with both types passes `--strict`. The control `type: "bogus"` fails with `Unknown hook type "bogus"; entry ignored at runtime`. | The probe plugin |
| Does a plugin agent accept `maxTurns`? | Yes. The loader parses `maxTurns` as a positive integer. It ignores only `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`, `observer`, `observerMessage`, and `observeSubagents`. | The strings of the binary, with the message `has invalid maxTurns` |
| Does a mod handler on `Stop` get `background_tasks`? | Yes, on `Stop` and on `SubagentStop`. Each entry has `id`, `type`, `status`, and `description`, and a `shell` entry also has `command`. The array is empty when no work is in flight. | `StopHookInput`, `SubagentStopHookInput`, and `BackgroundTaskSummary` in the types |
| Can a mod handler of `Read` read the `mtime` and the size with no `node:` import? | Yes. `$.fs.stat(path)` gives `kind`, `size`, `mtimeMs`, and `isLink`. | `$.fs.stat` in the types |
| Does the mod API tell a hook when Claude Code clears old tool results? | No event reports it. A local clear writes `[Old tool result content cleared]` into the `tool_result` block. `$.session.messages({ as: "api" })` gives the messages of the next request. A compaction replaces the old messages with its summary. The server edit `clear_tool_uses_20250919` shows only in `context_management.applied_edits` of the API response, which no hook gets. | `ApiMessage` in the types, and the strings |

Two answers are about the loader of a plugin and not about a hook, so `just test` and `just validate` check them, and `just lab` does not.

## The Shell That Waited 2 Hours

On 2026-10-16, a `Bash` call of a subagent ran `cat > <file>` with no input.
`cat` waited for input, and the shell ran for more than 2 hours.
`ListAgents` showed the agent as `completed`, so the agent did not see the shell.
The sandbox blocked `ps`, so the main session reported the state as unknown.
A local session has no time limit on a background `Bash` command ([Engine Facts](Decisions-Engine)).

## Related Pages

- [Model Guidance](Model-Guidance)
- [Usage Evidence](Usage-Evidence)
- [Evidence](Evidence)
