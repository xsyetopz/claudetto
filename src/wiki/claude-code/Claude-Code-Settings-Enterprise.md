# Claude Code Settings: Enterprise

These keys let an administrator control how managed settings arrive and which versions may run.
They work in managed settings.
For example, `{ "requiredMinimumVersion": "2.1.300" }` stops older versions from starting.

The marks and the scopes are explained on [Settings](Claude-Code-Settings).
A `-` in the `Default` column means that neither the docs nor the schema state a default.

| Mark | Key | Type | Default | What It Is For | Scope | Source |
| --- | --- | --- | --- | --- | --- | --- |
| ✅ | `forceRemoteSettingsRefresh` | boolean | - | Block startup until server-managed settings are freshly fetched. Claude Code exits if the fetch fails. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `managedSourcesBehavior` | enum: `first-wins`, `merge` | - | Compose every managed source you deploy instead of using the highest-priority one alone. `first-wins` (the default) uses the highest source alone. `merge` combines them. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `parentSettingsBehavior` | enum: `first-wins`, `merge` | - | Apply or drop restrictions an SDK or IDE host passes when you deploy managed settings. `first-wins` drops the parent tier. `merge` unions it in. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `policyHelper` | - | - | Run an executable that computes managed settings at startup. Honored only from admin-controlled policy sources. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| 🔍 | `policyHelpers` | - | - | Give each platform its own policy helper: `macos`, `linux`, `windows`, `wsl`, or a static `default` payload. The first helper on the platform chain wins over `policyHelper`. | Settings files | Bundle settings schema |
| ✅ | `requiredMaximumVersion` | string | - | Refuse to start on a version newer than your organization allows. Claude Code exits at startup with install steps. Managed settings only. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `requiredMinimumVersion` | string | - | Refuse to start on a version older than your organization requires. Claude Code exits at startup with update steps. Managed settings only. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |
| ✅ | `wslInheritsWindowsSettings` | boolean | - | Have WSL read managed settings from the Windows policy chain. Set in an admin-only Windows source. No effect on native Windows. | Managed | [Settings Reference](https://code.claude.com/docs/en/settings-reference) |

## See Also

- [Settings](Claude-Code-Settings) explains the marks, the scopes, and the precedence.
- [Settings Reference](https://code.claude.com/docs/en/settings-reference) is the docs page for each key.
- [Deploy Managed Settings](https://code.claude.com/docs/en/managed-settings) is the guide for administrators.
