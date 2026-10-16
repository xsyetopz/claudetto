# Settings Snippet

This page tells users how to apply the settings that claudetto needs.
The page gives the settings as a JSON block in the format of Claude Code settings.
The `settings` entries of each slice make the snippet, and `just generate` writes it into this page.
A test checks each key against `schemas/claude-code-settings.json`.
The reason, the effect in Claude Code, and the default of each key are on [Settings snippet keys](Settings-Snippet-Keys).
To apply the snippet with setup or by hand, see [Settings Apply](Settings-Apply).

## The Snippet

```json
{{include snippet.json}}
```

The six `rm` rules match any flag spelling with an `r` or `R` after a dash, and `--recursive`.
They also ask for some calls that are not recursive.
An example is `rm -f report.txt`.
The `r` is in the file name, after a dash option.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox limits the writes of `Bash`.

## Related Pages

- [Settings Apply](Settings-Apply)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Off Switches](Off-Switches)
- [Settings Schema](Settings-Schema)
- [Install](Install)
