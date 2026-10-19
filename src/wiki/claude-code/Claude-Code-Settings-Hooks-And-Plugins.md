# Claude Code Settings: Hooks and Plugins

These keys control hooks, plugins, marketplaces, skills, permissions, and the status line.
For example, `{ "enabledPlugins": { "my-plugin@my-marketplace": true } }` turns a plugin on.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `additionalMarketplaces` | object | - | Write `extraKnownMarketplaces` under this alias name. Do not set both in one file. Needs Claude Code `2.1.232` or later. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowedHttpHookUrls` | array of string | - | Limit which URLs HTTP hooks can target. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowedMarketplaces` | array | - | Write `strictKnownMarketplaces` under this alias name. Do not set both in one file. Needs Claude Code `2.1.232` or later. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowManagedHooksOnly` | boolean | - | Run only the hooks your organization deploys. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `allowManagedPermissionRulesOnly` | boolean | - | Make managed settings the only settings source of permission rules. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ⚠️ | `appendPlugins` | array of string | - | List managed plugins whose hooks run last, in the listed order. The docs list the scope as user or managed. The schema marks it managed-only. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `blockedMarketplaces` | array | - | Block plugin marketplace sources for your organization. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableAllHooks` | boolean | - | Turn off hooks, a custom status line, and a custom `@` file suggestion command at once. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableAutoMode` | enum: `disable` | - | Remove auto mode from the permission mode cycle. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableBundledSkills` | boolean | - | Turn off the skills and workflows included with Claude Code. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableCommandPluginSources` | boolean | - | Block plugins that install by running a marketplace-declared command. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableSideloadFlags` | boolean | - | Reject the CLI flags that sideload plugins, subagents, and MCP servers. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `disableSkillShellExecution` | boolean | - | Stop skills and custom commands from running inline shell. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `enabledPlugins` | object | - | Turn individual plugins on or off per scope. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `extraKnownMarketplaces` | object | - | Register marketplaces for a repository or an organization. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `hooks` | object | - | Run your own commands as hooks at points in Claude Code's lifecycle. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `httpHookAllowedEnvVars` | array of string | - | Limit which env vars HTTP hooks can put in headers. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `outputStyle` | string | - | Change Claude's role, tone, and output format with an output style. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `permissions` | object | - | Set allow, ask, and deny rules and the starting permission mode. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `pluginConfigs` | object | - | Store the answers you gave a plugin's configuration dialog. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `pluginSuggestionMarketplaces` | array of string | - | Choose which marketplaces can surface plugin install suggestions in `/plugin`. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `pluginTrustMessage` | string | - | Add your own text to the plugin trust warning. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ⚠️ | `prependPlugins` | array of string | - | List managed plugins whose hooks run first, in the listed order. The docs list the scope as user or managed. The schema marks it managed-only. | User, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skillListingBudgetFraction` | number | `0.01` (1%) | Reserve more or less context for the skill listing. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skillListingMaxDescChars` | integer | 1536 | Cap each skill's description length in the skill listing. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skillOverrides` | object | - | Hide or collapse a skill without editing its SKILL.md. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `skipDangerousModePermissionPrompt` | boolean | - | Skip the confirmation dialog before bypassPermissions mode. | User, local, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `statusLine` | object | - | Run your own command to render a status line below the prompt. | Any file | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `strictKnownMarketplaces` | array | - | Allowlist the marketplace sources users can add and install from. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `strictPluginOnlyCustomization` | - | - | Block skills, agents, hooks, and MCP servers from user and project sources. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `syncClaudeAiPlugins` | boolean | - | Stop loading the plugins enabled on your claude.ai account and stop downloading new ones. | User, local, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `syncClaudeAiSkills` | boolean | - | Stop loading the skills enabled on your claude.ai account and stop downloading new ones. | User, local, managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Hooks](Claude-Code-Hooks), [Plugins](Claude-Code-Plugins), and [Skills And Commands](Claude-Code-Skills-And-Commands) cover those features.
- [Permissions And Sandbox](Claude-Code-Permissions-And-Sandbox) covers `permissions`.
