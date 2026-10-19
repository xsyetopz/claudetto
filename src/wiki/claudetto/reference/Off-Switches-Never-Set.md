# Never-Set Settings

Some settings force a behavior on every session, so `claudetto` never sets them.
This page lists them and the reason for each.
`NEVER_SET_KEYS` and `NEVER_SET_ENV` in `tests/support/settings-pin.ts` hold the lists.
`tests/claudetto/settings-pin.test.ts` checks the [settings snippet](Settings-Snippet) against them.

| Entry | Value | Reason |
| --- | --- | --- |
| `disableAllHooks` | any | Stops all hooks. |
| `allowManagedHooksOnly` | any | Stops the hooks of plugins. |
| `strictPluginOnlyCustomization` | any | Stops customization by the user. |
| `disableSideloadFlags` | any | Stops the flags that load a plugin folder. |
| `alwaysThinkingEnabled` | any | Forces thinking on every model. |
| `allowAllClaudeAiMcps` | any | Turns on every claude.ai connector. |
| `claudeMd` | any | Replaces the project instructions. |
| `attribution` | any | Replaces the commit and pull request lines of Claude Code. |
| `CLAUDE_CODE_SIMPLE` | any | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_SAFE_MODE` | any | Turns off hooks, plugins, skills, and memory. |
| `CLAUDE_CODE_ENABLE_TASKS` | `0` | Removes the task tools that the model uses. |
| `CLAUDE_CODE_DISABLE_CLAUDE_MDS` | any | Removes the project instructions. |
| `CLAUDE_CODE_DISABLE_ATTACHMENTS` | any | Removes the attachments. |
| `CLAUDE_CODE_EFFORT_LEVEL` | any | Forces one effort on every model. |
| `CLAUDE_CODE_SUBAGENT_MODEL_FORCE` | any | Forces the model of a subagent. |
| `MAX_THINKING_TOKENS` | any | Forces a thinking budget. |
| `CLAUDE_CODE_DISABLE_WEB_FETCH` | any | Removes the web fetch tool. |
| `CLAUDE_CODE_BASH_EDIT_DIFF` | `0` | Removes the edit diff of Bash. |
| `CLAUDE_CODE_SKIP_PLUGIN_MCP_SERVERS` | any | Drops the MCP servers of plugins. |
| `CLAUDE_CODE_DISABLE_EXPERIMENTAL_BETAS` | any | Removes beta features. |
| `DISABLE_INTERLEAVED_THINKING` | any | Removes thinking between tool calls. |

## See Also

- [Off Switches](Off-Switches)
- [Settings Snippet](Settings-Snippet)
