# Claude Code Settings: Extra Keys

A few keys are not in the settings schema, or they live in another file.
They are the auto mode and display keys, the keys that only the desktop app reads, and the global config keys of `~/.claude.json`.
For example, `copyOnSelect` goes in `~/.claude.json`, and `/config` writes it there.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).

## Auto Mode, Voice, and Display Keys

The bundle adds these keys itself, so the schema files do not list them.
All of them are on in `2.1.303`.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `skipAutoPermissionPrompt` | boolean | - | Skip the one-time notice Claude Code shows when you first enter auto mode yourself rather than through the built-in default. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `useAutoModeDuringPlan` | boolean | `true` | Let the auto mode classifier review shell commands in plan mode, and set `false` to get prompts instead. | User, local, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `autoMode` | object | - | Add your own rules to the auto mode classifier. Takes `allow`, `soft_deny`, `hard_deny`, and `environment` lists and a `classifyAllShell` boolean. `"$defaults"` in a list keeps the built-in rules. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `permissions.disableAutoMode` | enum: `disable` | - | Remove auto mode from the permission mode cycle. Same as the top-level `disableAutoMode`. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableDeepLinkRegistration` | enum: `disable` | - | Stop Claude Code from registering the `claude-cli://` link handler with the operating system. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `voiceEnabled` | boolean | - | Turn on voice dictation (hold to talk). See also `voice` in [UI](Claude-Code-Settings-UI). | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `defaultView` | enum: `chat`, `transcript` | - | Choose the default transcript view: `chat` shows only `SendUserMessage` checkpoints, and `transcript` shows everything. | Settings files | Bundle |
| ✅ | `axScreenReader` | boolean | - | Render screen-reader friendly output. The `CLAUDE_AX_SCREEN_READER` variable and the `--ax-screen-reader` flag win. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## Other Keys

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| 🔍 | `disablePluginDirectory` | boolean | - | Let an administrator turn the plugin directory off. | Managed | Bundle strings |
| 🔍 | `isolation.required` | boolean | - | Sub-key of `isolation`. A lower settings file may set `true` over managed settings. | Settings files | Bundle |
| 🔍 | `isolation.persistHome` | boolean | - | Sub-key of `isolation`. The bundle gives no description. | Settings files | Bundle |
| 🔍 | `remoteControl.shareHostProfile` | enum | - | Sub-key of `remoteControl`. The strict values are `off` and `basic`. | Settings files | Bundle |
| 🔍 | `remoteTools.allowUnattendedServing` | boolean | - | Sub-key of `remoteTools`. The bundle gives no description. | Settings files | Bundle |
| ✅ | `attribution.sessionUrl` | boolean | - | Leave the claude.ai session link out of cloud and Remote Control commits. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `sshHostAllowlist` | array of string | Unset, so any host is allowed | Limit the hosts that Desktop SSH sessions may reach. Only the desktop app reads it. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableBrowserExternalNavigation` | boolean | Unset, so external browsing is on | Turn off external browsing in the desktop Browser pane. Only `true` takes effect. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `browserExternalPageTools` | string | Unset, so the tools work on external pages | Stop Claude from using its tools on external pages in the desktop Browser pane. The value is `"disabled"`. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableMobileSimulatorTools` | boolean | Unset | Block Claude's tools in the desktop iOS Simulator pane. Only `true` takes effect. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableDesktopLocalSessions` | - | - | Turn off Desktop Code sessions that run on the device. SSH and cloud sessions stay on. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## Global Config Keys

These keys live in `~/.claude.json`, not in a settings file.
`/config` writes them.
The two removed keys are still in the docs index.

| Mark | Key | What It Is For | Source |
| --- | --- | --- | --- |
| ✅ | `autoConnectIde` | Connect to a running VS Code or JetBrains IDE automatically from an external terminal. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `autoInstallIdeExtension` | Turn off automatic install of the IDE extension from a VS Code terminal. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `claudeInChromeDefaultEnabled` | Turn on Chrome integration when a session starts, in the interactive CLI and the VS Code extension. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `copyFullResponse` | Make `/copy` copy the full response without showing the picker. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `copyOnSelect` | Turn off automatic copying of text you select with the mouse in fullscreen rendering and agent view. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `defaultToAgentsView` | Open agent view instead of a new conversation when you run `claude` with no arguments. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `diffTool` | Choose whether Claude's proposed file changes open in the VS Code or JetBrains diff viewer or stay in the terminal. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `externalEditorContext` | Show Claude's last response as comments when you press Ctrl+G to edit. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `leftArrowOpensAgents` | Turn off the `←` shortcut that backgrounds the session and opens agent view. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `prStatusFooterEnabled` | Turn off the prompt footer's PR review status badge and the pull request check behind it. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ❌ | `permissionExplainerEnabled` | Removed in v2.1.257, together with the `Ctrl+E` command explanation on shell permission prompts. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ❌ | `teammateDefaultModel` | Removed in v2.1.234, so see Specify teammates and models for how Claude Code picks a teammate's model. | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) lists each key.
- [Permissions And Sandbox](Claude-Code-Permissions-And-Sandbox) covers `autoMode`.
