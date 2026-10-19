# Settings Snippet

The settings snippet is the set of Claude Code settings that `claudetto` needs, as one JSON block.
The `settings` entries of the slices make it, and `just generate` writes it into this page.
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

## The `rm` Rules

The six `rm` rules in `permissions.ask` match any flag spelling with an `r` or `R` after a dash, and `--recursive`.
They also ask for some calls that are not recursive, such as `rm -f report.txt`, where the `r` is in the file name.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox limits the writes of `Bash`.

## See Also

- [Settings Apply](Settings-Apply)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Off Switches](Off-Switches)
- [Setup](Setup)
