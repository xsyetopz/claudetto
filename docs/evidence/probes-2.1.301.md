> Saved from `wiki/claudetto/evidence/Probes-2.1.301.md` at `HEAD`. The wiki is gone.

# Probes of 2.1.301

These probes cost no model call.
They show what a plugin hooks file, a plugin agent file, and a `Stop` hook input accept on Claude Code `2.1.301`.
They ran on 2026-10-16.

## Method

- The mod API types (`.claude-plugin/types/claude-code/index.d.ts`).
- The strings of the native binary.
- `claude plugin validate --strict` on a probe plugin in `$TMPDIR`, with `CLAUDE_CONFIG_DIR` also in `$TMPDIR`.

## Results

| Question | Answer | Source |
| --- | --- | --- |
| Does a plugin `hooks.json` accept `type: "prompt"` and `type: "agent"`? | ✅ A `Stop` entry with both passes `--strict`. The control `type: "bogus"` fails with `Unknown hook type "bogus"; entry ignored at runtime`. | Probe plugin |
| Does a plugin agent accept `maxTurns`? | ✅ The loader parses a positive integer. It ignores `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`, `observer`, `observerMessage`, and `observeSubagents`. | Binary string `has invalid maxTurns` |
| Does a mod handler on `Stop` get `background_tasks`? | ✅ On `Stop` and `SubagentStop`. Each entry has `id`, `type`, `status`, and `description`. A `shell` entry also has `command`. The array is empty when no work runs. | `StopHookInput`, `SubagentStopHookInput`, `BackgroundTaskSummary` |
| Can a `Read` handler get `mtime` and size with no `node:` import? | ✅ `$.fs.stat(path)` gives `kind`, `size`, `mtimeMs`, and `isLink`. | `$.fs.stat` in the types |
| Does the mod API tell a hook when Claude Code clears old tool results? | ❌ A local clear writes `[Old tool result content cleared]` into the `tool_result` block. `$.session.messages({ as: "api" })` gives the next request. The server edit `clear_tool_uses_20250919` shows only in `context_management.applied_edits` of the API response, which no hook gets. | `ApiMessage` and the strings |

Two answers are about the plugin loader, not a hook.
So `just test` and `just validate` check them, and `just lab` does not.

## The Shell That Waited 2 Hours

On 2026-10-16, a `Bash` call of a subagent ran `cat > <file>` with no input.
`cat` waited, and the shell ran for more than 2 hours.
`ListAgents` showed the agent as `completed`, so the agent did not see the shell.
The sandbox blocked `ps`, so the state was unknown.
A local session has no time limit on a background `Bash` command (Engine Facts).

## Related Pages

- [Model Guidance](model-guidance.md)
- [Usage Evidence](usage-evidence/usage-evidence.md)
- [Evidence](evidence.md)
