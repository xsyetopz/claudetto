# Claude Code Settings: Agents and Remote

These keys control subagents, workflows, background work, and Remote Control.
Use them to start a session as a named agent or to turn off a feature you do not want.
For example, `{ "disableRemoteControl": true }` in managed settings turns Remote Control off.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `agent` | string | - | Start every session as a named subagent with its prompt, tools, and model. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `agentPushNotifEnabled` | boolean | - | Let Claude send a push notification to your phone when it decides to. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `askUserQuestionTimeout` | enum: `60s`, `5m`, `10m`, `never` | `never` | Let an unanswered question auto-continue after idle time. Auto-continue runs only when you set `60s`, `5m`, or `10m`. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `autoContinueAtUsageLimit` | boolean | - | Wait in the open session and continue the task automatically after a claude.ai usage limit resets. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `autoUploadSessions` | boolean | - | Mirror local sessions to claude.ai as view-only, with no remote control. | Settings files | Bundle settings schema |
| ✅ | `crossSessionInbound` | string | - | Choose what happens to messages from your other sessions. `accept` delivers, `hold` parks them for review, `refuse` opts out. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `daemonColdStart` | enum: `transient`, `ask` | - | Choose what happens when no background service runs: `transient` starts one for this login session, and `ask` offers a permanent install. | Settings files | Bundle settings schema |
| ✅ | `dialogExpiry` | enum: `60s`, `5m`, `10m`, `never` | `5m` | Set how long Claude Code waits for Remote Control or an SDK host to answer a forwarded dialog before it cancels the dialog. `never` removes the deadline. `CLAUDE_CODE_USER_DIALOG_TIMEOUT_MS` wins. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableAgentView` | boolean | - | Turn off background agents and agent view. Matches `CLAUDE_CODE_DISABLE_AGENT_VIEW=1`. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableRemoteControl` | boolean | - | Turn off Remote Control everywhere it can start. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableWorkflows` | boolean | - | Turn dynamic workflows off for everyone, and use `enableWorkflows` for yourself. Code Review on pull requests and `/ultrareview` run in the cloud and stay on. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `doneMeansMerged` | boolean | - | Keep Claude working until the pull request is ready to merge, a timer is set to resume, or it hands you a self-contained next step. | Settings files | Bundle settings schema |
| ✅ | `enableWorkflows` | boolean | - | Turn dynamic workflows on or off against your plan's default. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `inputNeededNotifEnabled` | boolean | - | Get a push notification when Claude is waiting on you. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `isolatePeerMachines` | boolean | - | Ask you before Claude messages one of your sessions on another machine. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `modelProposedGoals` | string | `auto` | Control whether the model may propose session goals. `auto` (the default), `alwaysAsk`, or `disabled`. Project and local settings are ignored. | Settings files | Bundle settings schema |
| ✅ | `processWrapper` | string | - | Run Claude Code's background processes through a corporate launcher on macOS and Linux. Same as `CLAUDE_CODE_PROCESS_WRAPPER`, which wins. Project and local files are ignored. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `remote` | object | - | Configure cloud sessions. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `remoteControl` | object | - | Set options for `claude remote-control`. | Settings files | Bundle settings schema |
| ✅ | `remoteControlAtStartup` | boolean | - | Connect Remote Control automatically when a session starts. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `remoteTools` | object | - | Choose how this computer serves tool calls to cloud sessions. | Settings files | Bundle settings schema |
| 🔍 | `skipWorkflowUsageWarning` | boolean | - | Record that you accepted the multi-agent workflow usage warning. Until set, auto mode asks before it runs a workflow. | Settings files | Bundle settings schema |
| ✅ | `sshConfigs` | array of object | - | Add SSH connections to the Desktop environment dropdown. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `subagentStatusLine` | object | - | Rewrite rows in the subagent task display with your own command. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `teammateMode` | string | - | Choose how agent team teammates display. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `ultracode` | boolean | - | Have Claude plan a workflow for each substantive task without being asked. Lasts one session. Needs workflows on and a model that supports it. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `workflowKeywordTriggerEnabled` | boolean | `true` | Let the word `ultracode` in a prompt start a workflow, and set `false` to type it without starting one. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `workflowSizeGuideline` | enum: `unrestricted`, `small`, `medium`, `large` | `medium` | Set the agent count Claude aims for in dynamic workflows. `small` aims for fewer than 5 agents, `medium` fewer than 10, `large` fewer than 50. This is a hint, not a limit. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Subagents](Claude-Code-Subagents) covers custom agents.
- [Remote Control](https://code.claude.com/docs/en/remote-control) is the docs page for that feature.
