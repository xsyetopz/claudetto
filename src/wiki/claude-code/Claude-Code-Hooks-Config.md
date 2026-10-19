# Claude Code Hooks: Config

Hook config decides which hooks run, when they run, and what happens when one fails.
A matcher picks the events, an `if` filter narrows them to some tool calls, and `timeout` and `onFailure` set the limits.
For example, `"matcher": "Bash"` with `"if": "Bash(git push *)"` runs a hook only for `git push` commands.

## Matcher Rules

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `"*"`, `""`, or no `matcher` | Match all | The group runs on every occurrence | All events | [Hooks Reference][hr] |
| ✅ | Letters, digits, `_`, `-`, space, `,`, `\|` only | Exact string or list | `Edit\|Write` and `Edit, Write` match either name. `mcp__memory` alone matches no tool | All events with a matcher | [Hooks Reference][hr] |
| ✅ | Any other character | JavaScript regex, unanchored | Tested with `RegExp.prototype.test`. Use `^` and `$` for a whole match | All events with a matcher | [Hooks Reference][hr] |
| ✅ | `FileChanged` and `StopFailure` | Narrower exact set | Only letters, digits, `_`, and `\|`. A hyphen, space, or comma makes it a regex | Those two events | [Hooks Reference][hr] |
| ✅ | Matcher on an event without one | Silently ignored | No error | The no-matcher events below | [Hooks Reference][hr] |

## Matcher Targets

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Tool name | Filters tool events | `Bash`, `Edit\|Write`, `mcp__.*`. Plugin MCP tools are `mcp__plugin_<plugin>_<server>__<tool>` | `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `PermissionDenied` | [Hooks Reference][hr] |
| ✅ | Start source | `startup`, `resume`, `clear`, `compact`, `fork` | `fork` needs 2.1.214 | `SessionStart` | [Hooks Reference][hr] |
| ✅ | CLI flag | `init`, `maintenance` | | `Setup` | [Hooks Reference][hr] |
| ✅ | End reason | `clear`, `resume`, `logout`, `prompt_input_exit`, `other` | | `SessionEnd` | [Hooks Reference][hr] |
| ✅ | Notification type | Types are on [Prompt Events](Claude-Code-Hooks-Events-Prompt) | | `Notification` | [Hooks Reference][hr] |
| ✅ | Agent type | `general-purpose`, `Explore`, `Plan`, custom names | A plugin name `my-plugin:reviewer` is a regex. Write `^my-plugin:reviewer$` | `SubagentStart`, `SubagentStop` | [Hooks Reference][hr] |
| ✅ | Trigger | `manual`, `auto` | | `PreCompact`, `PostCompact` | [Hooks Reference][hr] |
| ✅ | Target model | Canonical name of `to_model` without `[1m]` | If no canonical name is known, every hook runs | `PreModelSwitch`, `PostModelSwitch` | [Hooks Reference][hr] |
| ✅ | Config source | `user_settings`, `project_settings`, `local_settings`, `policy_settings`, `skills` | | `ConfigChange` | [Hooks Reference][hr] |
| ✅ | Add source | `slash_command`, `register_repo_root` | | `DirectoryAdded` | [Hooks Reference][hr] |
| ✅ | File names | Literal names to watch, split on `\|`. Then filters by basename | The matcher also builds the watch list | `FileChanged` | [Hooks Reference][hr] |
| ⚠️ | Error type | `rate_limit`, `overloaded`, `authentication_failed`, `oauth_org_not_allowed`, `account_on_hold`, `billing_error`, `invalid_request`, `model_not_found`, `server_error`, `max_output_tokens`, `cloud_credential_error`, `unknown` | The type `verification_required` is in the bundle type `SDKAssistantMessageError` and not in the docs list | `StopFailure` | [Hooks Reference][hr], `StopFailureHookInput` |
| ✅ | Load reason | `session_start`, `nested_traversal`, `path_glob_match`, `include`, `compact` | | `InstructionsLoaded` | [Hooks Reference][hr] |
| ✅ | Command name | Skill or command names | | `UserPromptExpansion` | [Hooks Reference][hr] |
| ✅ | MCP server name | Configured server names | | `Elicitation`, `ElicitationResult` | [Hooks Reference][hr] |
| ✅ | No matcher | Always fires | | `UserPromptSubmit`, `PostToolBatch`, `Stop`, `TeammateIdle`, `TaskCreated`, `TaskCompleted`, `WorktreeCreate`, `WorktreeRemove`, `MessageDisplay`, `CwdChanged` | [Hooks Reference][hr] |

## The `if` Filter

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `if` | One permission rule, such as `Bash(git *)` or `Edit(*.ts)` | Only the five tool events read it. On any other event the hook never runs. No `&&`, no list | Handler field | [Hooks Reference][hr] |
| ✅ | Bash patterns | Checked on each subcommand | Leading `VAR=value` is stripped. `$()` and backticks are checked. If the command cannot be parsed, the hook runs | `Bash` | [Hooks Reference][hr] |
| ✅ | File patterns | `Edit(src/**)` | Matches only `src` in the working directory. Use `**/src/**` for any depth. This changed in 2.1.214 | File tools | [Hooks Reference][hr] |

## Timeouts

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | Default `timeout` | 600 s for `command`, `http`, `mcp_tool`. 30 s for `prompt`. 60 s for `agent` | A timed-out hook is canceled and its output dropped | All handlers | [Hooks Reference][hr] |
| ✅ | Lower defaults | 30 s on `UserPromptSubmit`, `PreModelSwitch`, `PostModelSwitch`. 10 s on `MessageDisplay` | For `command`, `http`, `mcp_tool` | Those events | [Hooks Reference][hr] |
| ✅ | `SessionEnd` budget | 1.5 s shared by all hooks | Raised to the largest per-hook `timeout` in settings, up to 60 s. Plugin timeouts do not raise it | `SessionEnd` | [Hooks Reference][hr] |
| ✅ | `PreModelSwitch` timeout | A timed-out hook blocks the switch | | `PreModelSwitch` | [Hooks Reference][hr] |
| ✅ | `PreToolUse` timeout | A timed-out `command`, `http`, or `mcp_tool` hook does not block | Use `onFailure: "block"` to block. An SDK callback that times out blocks | `PreToolUse` | [Hooks Reference][hr] |
| 🔍 | `asyncTimeout` | A first reply of `{"async":true,"asyncTimeout":ms}` moves a command hook to the background and sets its time limit | Default 15000 ms. Only the Agent SDK pages name it, and the Hooks Reference does not | Command hook stdout | bundle, [Agent SDK Hooks](https://code.claude.com/docs/en/agent-sdk/hooks) |

## Failure Handling

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `onFailure: "continue"` | Default. The action goes on after a failure | Failure means: cannot start, timeout, exit code other than 0 or 2, invalid JSON, or HTTP non-2xx | `command`, `http` | [Hooks Reference][hr] |
| ✅ | `onFailure: "block"` | A failure counts as exit 2 | Error text has `blocking because onFailure is "block"` after the word `failed` | `command`, `http` | [Hooks Reference][hr], bundle |
| 🔍 | `onFailure` has no effect | On async hooks and on `Stop`, `SubagentStop`, `TaskCompleted`, `TeammateIdle` | The field text in the bundle says so. The Hooks Reference does not | Those cases | bundle |
| ✅ | Windows without Git Bash | A shell-form `PreToolUse` or `PermissionRequest` hook that fails can block | Set `shell: "powershell"` or use exec form and `onFailure` | Windows | [Hooks Reference][hr], bundle |
| ✅ | `refusing to honor the suspect capture` | A background process that keeps stdout open after an allow blocks the call | Redirect output of background children | `command` | [Hooks Reference][hr], bundle |
| 🔍 | `CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG` | Own hooks in user files must succeed. Their grant and rewrite fields are dropped | Bundle messages: `blocking because it is one of the user's own hooks` and `ignored ... (CLAUDE_CODE_RESTRICT_PERSONAL_CONFIG)` | `PreToolUse`, `PermissionRequest`, `PreModelSwitch`, `UserPromptSubmit`, `UserPromptExpansion` | bundle |

## Env Vars for Hooks

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `CLAUDE_PROJECT_DIR` | Project root where the session started | Stays fixed in a worktree. `cwd` in the input follows Claude | Hooks, stdio MCP servers, plugin LSP | [Hooks Reference][hr] |
| ✅ | `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` | Plugin install dir and data dir | Replaced in `command` and `args`. Also exported | Plugin hooks | [Hooks Reference][hr] |
| ✅ | `CLAUDE_PLUGIN_OPTION_<KEY>` | A plugin `userConfig` option | Use in shell form. `${user_config.*}` works only in exec form | Plugin hooks | [Hooks Reference][hr] |
| ✅ | `CLAUDE_ENV_FILE` | File of `export` lines that later Bash commands source | Append with `>>`. Not set for PowerShell hooks | `SessionStart`, `Setup`, `CwdChanged`, `FileChanged` | [Hooks Reference][hr] |
| ✅ | `CLAUDE_EFFORT` | Effort level of the turn | Also in Bash | Hook commands | [Hooks Reference][hr], `BaseHookInput.effort` |
| ✅ | `CLAUDE_CODE_REMOTE` | `"true"` in remote web environments | Unset in the local CLI | Hooks | [Hooks Reference][hr] |
| ✅ | `CLAUDE_CODE_BRIDGE_SESSION_ID` | Remote Control session ID | Set from 2.1.199 while connected | Hooks | [Hooks Reference][hr] |
| ✅ | Inherited env | The parent env minus `OTEL_*` | `CLAUDE_CODE_SUBPROCESS_ENV_SCRUB=1` strips more. HIPAA sessions drop Anthropic credentials | Hooks | [Hooks Reference][hr] |
| ✅ | No `CLAUDE_MODEL` | Does not exist | Use `PostModelSwitch` and `to_model` | Hooks | [Hooks Reference][hr] |
| ✅ | `CLAUDE_CODE_SESSIONEND_HOOKS_TIMEOUT_MS`, `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` | `SessionEnd` budget. Stop continuation cap (default 8) | See [Env Vars](Claude-Code-Env-Vars) | Hook runtime | [Hooks Reference][hr] |
| ✅ | `CLAUDE_CODE_DISABLE_PERMISSION_PROMPT_NOTIFY_HOOKS`, `CLAUDE_CODE_DISABLE_FILE_MENTIONS`, `CLAUDE_CODE_GIT_BASH_PATH`, `MCP_TIMEOUT` | Turn off `permission_prompt` in SDK hosts. Stop `@` insertion. Git Bash path. MCP wait | | Hook runtime | [Hooks Reference][hr] |
| 🔍 | `CLAUDE_CODE_HOOKS_SAME_THREAD` | Run function hooks on the main thread, not in a worker | Bundle returns `same-thread` or `worker`. A mod test helper in the bundle sets it | Mods | bundle |
| 🔍 | `CLAUDE_CODE_DISABLE_HOOK_FORWARDING`, `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS`, `DISABLE_BRIEF_MODE_STOP_HOOK` | Names found in the env table of the bundle | Effect not verified | Not verified | bundle env table |

## Settings Keys and Trust

| Mark | Item | What it does | How it works | Where it can be used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `hooks` | The event map | Merges across levels | Settings | schema `claude-code-settings.json` |
| ⚠️ | `disableAllHooks` | Turns hooks off | The schema also says it stops the `statusLine` command, but the Hooks Reference names only hooks. Managed hooks stay unless set in managed settings | Settings, `--settings` | schema, [Hooks Reference][hr] |
| ✅ | `allowManagedHooksOnly` | Only managed hooks and managed-enabled plugin hooks run | Also narrows `statusLine`, `fileSuggestion`, `subagentStatusLine` | Managed settings | schema, [Hooks Reference][hr] |
| ✅ | `allowedHttpHookUrls` | URL allowlist for `http` hooks | `*` wildcard. Empty array blocks all | All levels, arrays merge | schema |
| ✅ | `httpHookAllowedEnvVars` | Env name allowlist for header values | Intersected with `allowedEnvVars` | All levels, arrays merge | schema |
| ✅ | Workspace trust | Settings hooks wait for the trust dialog | `-p` and SDK sessions treat the folder as trusted. Project subagent hooks need the dialog | Interactive | [Hooks Reference][hr] |
| ✅ | `/hooks` menu | Read-only browser of hooks | Shows the source of each | Interactive | [Hooks Reference][hr] |
| ✅ | Debug | `claude --debug-file <path>` | `CLAUDE_CODE_DEBUG_LOG_LEVEL=verbose` adds matcher lines | CLI | [Hooks Reference][hr] |

## Sources

- [Hooks Reference][hr], `schemas/claude-code-settings.json`, `schemas/claude-code-managed-settings.json`.

## Not Yet Checked

- Not verified: effect of `CLAUDE_CODE_DISABLE_HOOK_FORWARDING`, `CLAUDE_CODE_RESUME_SESSIONSTART_HOOKS_WAIT_MS`, and `DISABLE_BRIEF_MODE_STOP_HOOK`.
- Not verified in the bundle: the default timeout values.

## See Also

- [Hooks](Claude-Code-Hooks), with the legend of marks
- [Handlers](Claude-Code-Hooks-Handlers)
- [Env Vars](Claude-Code-Env-Vars)

[hr]: https://code.claude.com/docs/en/hooks
