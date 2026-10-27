# Settings Snippet

The settings snippet is the set of Claude Code settings that `claudetto` needs, as one JSON block.
It lives in `plugins/claudetto/modules/setup/prompts.ts`, and `just generate` writes it into this page.
A test checks each key against `schemas/claude-code-settings.json`.
To apply it, see [Settings Apply](Settings-Apply).
The reason and default of each key are on [Settings Snippet Keys](Settings-Snippet-Keys).

## The Snippet

```json
{{include snippet.json}}
```

- `<plugin folder>` in the two status line commands stands for the absolute path of the installed plugin folder.
  `claudetto-setup` fills it in.
- `claudetto-setup` leaves out `$schema`, because it names the schema and is not a setting.

## The Lists

The snippet has no `permissions.allow` list and no `permissions.ask` list.
`permissions.defaultMode` is `default`, and `permissions.disableAutoMode` is `disable`.
The permission gate of the `guard` slice decides which calls run, which ask, and which stop ([Guard](Guard)).
The `deny` list is a second layer for the same dangers.
It holds in each mode, and it names:

- Reads of secrets: `.env*` files, `~/.ssh`, `~/.aws/credentials`, `~/.gnupg`, `~/.netrc`, and `~/.docker/config.json`.
- `rm -rf` of `/`, the home folder, and their variants.
- Disk and system commands: `mkfs`, `dd` to a device, `newfs`, `diskutil`, `csrutil`, `spctl`, `nvram`, and `security delete-*`.
- `sudo`, `doas`, and `su`.
- Edits of `/System`, `/Library`, and the system folders of `/usr`.
- The `Agent` types of the engine and tools that claudetto does not use, such as `Workflow`, `Artifact`, and the `Task*` tools.

The snippet has no `sandbox` key.
Setup adds one more key that the snippet does not hold: the subagent cap ([Setup](Setup#subagent-cap)).

## Related Pages

- [Settings Apply](Settings-Apply)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Off Switches](Off-Switches)
- [Setup](Setup)
