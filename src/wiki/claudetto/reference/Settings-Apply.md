# Settings Apply

This page tells users how to apply the [settings snippet](Settings-Snippet) of `claudetto`.
A user who installs or updates `claudetto` reads it.
A plugin cannot set most settings, so the snippet goes into a settings file of the user.

## Apply the Snippet with Setup

1. Run `/claudetto:setup`.
2. Pick the scope: `user`, `project`, or `local`.
3. Read the list of changes, and approve the write.
4. Restart Claude Code.

The skill runs `claudetto-setup --scope <scope> --advisor <advisor>` for the preview.
The command writes nothing without `--apply`.
After you approve, the skill runs the command again with `--apply`.
A failed read of the settings file writes nothing.
A second run changes nothing.
The command makes no backup, so the list of changes is the record.

The command also reads the `CLAUDE_CONFIG_DIR` env var.
When it is set, the `user` scope uses that folder in place of `~/.claude`.

## What the Merge Does

- An object merges key by key.
- An array gains the entries that it lacks, and the entries of the user stay.
  The one exception is `availableModels`, which the snippet replaces.
- A scalar takes the value of the snippet.
- A key that the snippet does not name stays as it is.

The preview prints one line for each key path that differs, as `path: old -> new`.
When nothing differs, it prints `Settings match the snippet.`

With the option `advisor` set to `claudetto`, the merge also sets `CLAUDE_CODE_DISABLE_ADVISOR_TOOL=1`.

## Status Lines

The status line commands get the absolute path of the plugin folder.
That path holds the plugin version, so run setup again after each plugin update.
The `project` scope gets no status line, because the path is of one computer.
Use the `user` or `local` scope for it.
A status line of another tool stays, and the preview says so.

## Cleanup of 0.1.0

Setup removes the keys, the rules, and the `CLAUDE.md` block that 0.1.0 wrote.
It leaves the keys of the user.
[Setup Cleanup](Setup-Cleanup) lists each item.

## The `.gitignore` Lines

With `--apply`, in a project that has `.git/`, setup appends these lines to `.gitignore` under a comment header:

```text
/.claudetto/
/.jscpd.json
/.claude/settings.local.json
```

It adds no line that the file already has, and it changes nothing in a project with no `.git/`.

## Other Steps of Setup

Setup gives an alias line for your shell that starts Claude Code with `Glob` and `Grep`.
It does not edit the startup file of your shell.
The skill also runs `claudetto-setup --addons`, and offers the step of each enabled add-on.
When `claudetto-docs` is installed, merge the [lines for the add-on](Settings-Snippet-Docs) by hand.

## Copy It by Hand

1. Copy the keys that you want into `~/.claude/settings.json` (user scope).
2. Replace `<plugin folder>` in `statusLine` and `subagentStatusLine` with the absolute path of the plugin folder, or delete both keys.
   A status line command gets no `${CLAUDE_PLUGIN_ROOT}`, so the path must be absolute.
   The path holds the version, so change the two commands again after each plugin update.
3. Delete the `$schema` key, or keep it for the editor.
4. Restart Claude Code.

A test fails when the block holds a key of the [never-set list](Off-Switches-Never-Set).

## Related Pages

- [Setup](Setup)
- [Setup Cleanup](Setup-Cleanup)
- [Settings Snippet](Settings-Snippet)
- [Settings Snippet Keys](Settings-Snippet-Keys)
- [Install](Install)
