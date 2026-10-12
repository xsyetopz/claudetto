# Settings snippet

This page gives the settings that dotclaude needs, as a JSON block in the format of Claude Code settings.
The `settings` entries of each slice make the snippet, and `just generate` writes it into this page.
A test checks each key against `schemas/claude-code-settings.json`.
The reason, scope, and Claude Code default of each key are on [Settings snippet keys](Settings-Snippet-Keys).

## Apply it with setup

1. Run `/dotclaude:setup`.
2. Pick the scope: `user`, `project`, or `local`.
3. Read the list of changes, and confirm the write.

The `settings` command of setup prints the changes, and it writes them only with `--apply`.
A failed read of the settings file writes nothing.
The merge adds keys and rules, and keeps your other keys.
It replaces the `availableModels` list.
A status line of another tool stays.
The project scope gets no status line, because the command holds the path of one computer.
Setup writes the `autoMode` lists of the [destructive floor](Guards#the-destructive-floor) to the user scope only.
The project and local scopes get none.
Setup makes no backup, so the list of changes is the record.

The status line commands get the absolute path of the plugin folder.
That path holds the plugin version, so run setup again after each plugin update.

When the model catalog of your account offers Mythos, setup puts `claude-mythos-5-1` in place of `claude-fable-5-1`.
See [Mythos detection](Settings-Snippet-Keys#mythos-detection).

When `dotclaude-docs` is installed, the merge also adds the [lines for the `dotclaude-docs` add-on](#lines-for-the-dotclaude-docs-add-on).

## Copy it by hand

1. Copy the keys that you want into `~/.claude/settings.json` (user scope).
2. Replace `<plugin folder>` in `statusLine` and `subagentStatusLine` with the absolute path of the plugin folder, or delete both keys.
   The commands are `bun --no-env-file "<plugin folder>/bin/dotclaude-statusline"` for `statusLine`, and the same command with `--subagent` for `subagentStatusLine`.
   A status line command gets no `${CLAUDE_PLUGIN_ROOT}`, so the path must be absolute.
   The path holds the version, so change the two commands again after each plugin update.
3. Replace `claude-fable-5-1` with `claude-mythos-5-1` only if your account has Mythos.
   See [Mythos detection](Settings-Snippet-Keys#mythos-detection) and [the CVP procedure](Settings-Snippet-Keys#cvp-procedure).
4. Restart Claude Code.

The snippet sets a key only when the Claude Code default does not give the result that dotclaude needs.
A test fails when the block holds a key of the [never-set list](Off-Switches#never-set).

## The snippet

```json
{{include snippet.json}}
```

The six `rm` rules match any flag spelling with an `r` or `R` after a dash, and `--recursive`.
They also ask for some calls that are not recursive, for example `rm -f report.txt`, where the `r` is in the file name after a dash option.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox limits the writes of `Bash`.

## Lines for the `dotclaude-docs` add-on

Add these lines only when you install `dotclaude-docs` ([Library docs](Library-Docs)).
Merge them into the `permissions.allow` list and the `sandbox.network.allowedDomains` list above.

```json
{{include docs-snippet.json}}
```

## Related pages

- [Settings snippet keys](Settings-Snippet-Keys)
- [Off switches](Off-Switches)
- [Settings schema](Settings-Schema)
- [Install](Install)
