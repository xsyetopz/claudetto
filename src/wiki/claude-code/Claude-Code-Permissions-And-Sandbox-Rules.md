# Claude Code Permission Rules

A permission rule names a tool, and it can name a pattern for that tool.
Three lists hold the rules: `allow` runs a call with no prompt, `ask` always prompts, and `deny` blocks the call.
For example, `Bash(git push:*)` in `deny` stops each `git push` command.
The marks are explained on [Permissions and Sandbox](Claude-Code-Permissions-And-Sandbox).

## The `permissions` Keys

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `permissions.allow` | List of rules for allowed operations | Lists from all scopes merge. Project `allow` rules wait for workspace trust. `allowManagedPermissionRulesOnly` limits them to managed settings | Each settings scope | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `permissions.ask` | List of rules that always prompt | `ask` and `deny` rules apply at once, before trust. An `allow` rule in a local file does not outrank an `ask` rule from a project or managed file | Each settings scope | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `permissions.deny` | List of rules for denied operations | A bare tool name hides the tool from the model. See [Tools](Claude-Code-Tools) | Each settings scope | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `permissions.defaultMode` | Default permission mode | `manual` is an alias of `default`. `auto` and `bypassPermissions` do not take effect from project or local settings | User, managed, `--settings` | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `permissions.disableBypassPermissionsMode` | Value `disable` removes `bypassPermissions` | Checked when a session starts in or can return to that mode | Mainly managed settings | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `permissions.blockReadsOutsideWorkingDirectories` | Refuses `Read`, `Grep`, `Glob`, and `LSP` reads outside the working directories in each mode | `true` from any scope wins, also over a managed `false`. Needs `2.1.257` | Each settings scope | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `permissions.additionalDirectories` | Extra directories in the permission scope | Applies after workspace trust. `--add-dir` and `/add-dir` do the same for one session | Each settings scope | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing) |
| ✅ | `permissions.disableAutoMode` | Value `disable` turns auto mode off | The reason text is `disableAutoMode in settings`. See [Auto Mode](Claude-Code-Permissions-And-Sandbox-Auto-Mode) | Settings, mainly managed | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |

## Related Top-Level Settings

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `allowManagedPermissionRulesOnly` | Only managed settings supply permission rules | Rules from other scopes are ignored with a notice that names this key | Managed settings | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skipDangerousModePermissionPrompt` | The user accepted the bypass dialog | Boolean | User settings | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skipAutoPermissionPrompt` | The user accepted the auto mode opt-in dialog | Boolean | Settings | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `useAutoModeDuringPlan` | Plan mode uses auto mode semantics when auto mode is available | Default `true`. A `false` from managed, `--settings`, user, or local settings wins | Settings | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `autoMode` | Classifier rules | See [Auto Mode](Claude-Code-Permissions-And-Sandbox-Auto-Mode) | User, `--settings`, managed | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |
| ✅ | `sandbox` | Bash sandbox | See [Sandbox](Claude-Code-Permissions-And-Sandbox-Sandbox) | Each settings scope | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing) |

## Rule Syntax

A rule has the form `Tool` or `Tool(content)`.
The tool name is case-sensitive.
The content has no leading or trailing space inside the parentheses.
Source for both: the text `tool name case-sensitive, non-empty content with no leading/trailing whitespace inside the parens` in the bundle.

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | - | Matches shell commands by pattern | `*` is a wildcard. `\*` is a literal star. A pattern that ends in a space and one star also matches the bare command | `Bash` and `PowerShell` rules | [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | - | Legacy prefix form | The suffix `:*` matches the prefix before it | `Bash` rules | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | - | Match files by glob | `**` crosses directories. A rule that starts with `/` anchors at the primary working directory. | File tools | [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `WebFetch(domain:host)` | Matches a host | The prefix `domain:` is required. `domain:*.example.com` is allowed. A URL is rejected | `WebFetch` | [Configure Permissions](https://code.claude.com/docs/en/permissions) |
| ✅ | `WebSearch(terms)` | Matches exact search terms | Wildcards `*` and `?` are rejected | `WebSearch` | - |
| 🔍 | `mcp__server` and `mcp__server__tool` | Match all tools of a server or one tool | The bundle pattern is `^mcp__[\w-]+(?:__(?:[\w.-]+\|\*))?$`. | MCP tools | bundle |
| ✅ | `Skill(name)` | Governs a skill | The bundle has the message `Skill execution blocked by permission rules` | `Skill` tool | - |

## Flags and Hooks That Touch Permissions

| Mark | Item | What It Does | How It Works | Where It Can Be Used | Source |
| --- | --- | --- | --- | --- | --- |
| ✅ | `--permission-mode <mode>` | Sets the mode for one session | Choices `acceptEdits`, `auto`, `bypassPermissions`, `manual`, `dontAsk`, `plan` | CLI | - |
| ✅ | `--allowedTools`, `--disallowedTools` | Allow or deny tool rules for one session | Comma or space separated, such as `"Bash(git *) Edit"` | CLI | [Configure Permissions](https://code.claude.com/docs/en/permissions), [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `--dangerously-skip-permissions` | Same as `--permission-mode bypassPermissions` | Use only in sandboxes with no internet | CLI | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes), [Configure the Sandboxed Bash Tool](https://code.claude.com/docs/en/sandboxing) |
| ✅ | `--allow-dangerously-skip-permissions` | Makes bypass available without enabling it | Mode can be chosen later | CLI | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `--permission-prompts <host\|none>` | Who answers prompts with `--print` | `none` denies every prompt. The mode still decides the rest | CLI print mode | - |
| ✅ | `--restricted` | Restricted mode | Refuses `bypassPermissions`, confines file tools to the working directories. Env `CLAUDE_CODE_RESTRICTED=1` | CLI | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ❌ | `--enable-auto-mode` | Opt in to auto mode | Deprecated and hidden. Env `CLAUDE_CODE_ENABLE_AUTO_MODE` has no effect | CLI | bundle, `env.md` |
| ✅ | `PermissionRequest` hook | Answers a prompt | Output `decision.behavior` is `allow` (with `updatedInput`, `updatedPermissions`) or `deny` (`message`, `interrupt`) | Hooks | [Choose a Permission Mode](https://code.claude.com/docs/en/permission-modes) |
| ✅ | `PermissionDenied` hook | Fires on an auto mode denial | Output `retry` | Hooks | [Configure Auto Mode](https://code.claude.com/docs/en/auto-mode-config) |

## Permission Updates

A `PermissionUpdate` changes rules or the mode.
Its `type` is `addRules`, `replaceRules`, `removeRules`, `setMode`, `addDirectories`, or `removeDirectories`.
Its `destination` is `userSettings`, `projectSettings`, `localSettings`, `session`, or `cliArg`.
Source: `PermissionUpdate` in `types-2.1.303.d.ts`.
A rule value has the fields `toolName` and `ruleContent`.

## See Also

- [Configure Permissions](https://code.claude.com/docs/en/permissions) is the docs page for rule syntax.
- [Permission Modes](Claude-Code-Permissions-And-Sandbox-Modes) explains how a mode changes the prompts.
- [Hooks](Claude-Code-Hooks) can add their own decisions.
