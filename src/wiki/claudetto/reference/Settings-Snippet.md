# Settings Snippet

This page gives the settings that `claudetto` needs, as one JSON block in the format of the Claude Code settings.
Users and maintainers read it.
The `settings` entries of the slices make the snippet, and `just generate` writes it into this page.
A test checks each key against `schemas/claude-code-settings.json`.
The reason, the effect in Claude Code, and the default of each key are on [Settings Snippet Keys](Settings-Snippet-Keys).
To apply the snippet with `/claudetto:setup` or by hand, see [Settings Apply](Settings-Apply).

## The Snippet

```json
{{include snippet.json}}
```

The `<plugin folder>` text in the two status line commands stands for the absolute path of the installed plugin folder.
`claudetto-setup` fills it in.
`claudetto-setup` leaves out the `$schema` key, because it names the schema and is not a setting.

## The `rm` Rules

The six `rm` rules in `permissions.ask` match any flag spelling with an `r` or `R` after a dash, and `--recursive`.
They also ask for some calls that are not recursive.
An example is `rm -f report.txt`, where the `r` is in the file name, after a dash option.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox limits the writes of `Bash`.

## Related Pages

- [Settings Apply](Settings-Apply)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Off Switches](Off-Switches)
- [Setup](Setup)
