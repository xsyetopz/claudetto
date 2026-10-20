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

The `rm` rules in `permissions.ask` match the recursive flags only: `-r` and `-R`, alone or at the end of a cluster with these leads: up to 3 distinct letters of `f`, `i`, and `v`, and `d`, `I`, `P`, or `x` alone or with one letter of `f`, `i`, or `v` before or after it (for example `-dr`, `-Pfr`, `-Ir`, `-xr`, and `-fvir`), as a later argument, and `--recursive`.
A path with an `r` or `R` does not match, so `rm -f $TMPDIR/m.mjs` passes.
A file name that starts with `-r` also asks.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox limits the writes of `Bash`.
`allowUnsandboxedCommands` is `false`, so a command that fails in the sandbox is not run again outside it, and Claude Code ignores `dangerouslyDisableSandbox`.
Only the `excludedCommands` run outside the sandbox.

## See Also

- [Settings Apply](Settings-Apply)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Settings Snippet Docs](Settings-Snippet-Docs)
- [Off Switches](Off-Switches)
- [Setup](Setup)
