# Settings snippet

A plugin cannot set permissions, environment variables, or models.
This page gives the settings that dotclaude needs, as a plain JSON snippet in the format of Claude Code settings.
The plugin ships the same values in `lib/snippet.ts`, and a test keeps them equal to the blocks of this page.
Older releases and some older text call this snippet the settings profile.
The reason, scope, and Claude Code default of each key are on [Settings snippet keys](Settings-Snippet-Keys).

## Apply it with setup

1. Run `/dotclaude:setup`.
2. Pick the scope: user, project, or local.
3. Read the list of changes, and answer yes to write them.

The merge adds keys and rules, keeps your other keys, and replaces `availableModels`.
The status line commands get the absolute path of the installed plugin folder.
That path holds the plugin version, so run setup again after each plugin update.
A status line of another tool stays, and the project scope gets no status line, because the path is of one computer.
When `dotclaude-docs` is installed, the merge also adds the [lines for the `dotclaude-docs` add-on](#lines-for-the-dotclaude-docs-add-on).
Setup makes no backup, so the list of changes is the record.

Setup puts `claude-mythos-5-1` in place of `claude-fable-5-1` when your account has it.
See [Mythos detection](Settings-Snippet-Keys#mythos-detection).

## Copy it by hand

1. Copy the keys that you want into `~/.claude/settings.json` (user scope).
2. Replace `<plugin folder>` in `statusLine` and `subagentStatusLine` with the absolute path of the installed `dotclaude` plugin folder, or delete both keys.
   The commands are `bun --no-env-file "<plugin folder>/features/statusline/cli.ts"` and `bun --no-env-file "<plugin folder>/features/statusline/subagent-cli.ts"`, with forward slashes in the path on each platform.
   `plugins/dotclaude/settings.json` is an empty object, so the plugin sets no status line itself.
   Research for this change found that a status line command gets no `${CLAUDE_PLUGIN_ROOT}` (`research/architecture.md`, confirmed), so the path must be absolute.
   The folder is the `installPath` of `dotclaude@dotclaude` in `~/.claude/plugins/installed_plugins.json`.
   On the maintainer machine it is `~/.claude/plugins/cache/dotclaude/dotclaude/<version>` (checked for 0.27.0).
   The path holds the version, so change the two commands again after each plugin update.
   A checkout started with `--plugin-dir` uses the path of that checkout.
3. If you used 0.27.0, your `statusLine` runs the stub `<config dir>/dotclaude/statusline.mjs`, which shows nothing now.
   Replace the command as above, and delete the stub and the `<file>.dotclaude-backup-<time>` files by hand, because dotclaude deletes no file of yours.
4. Replace `claude-fable-5-1` with `claude-mythos-5-1` if your account has Mythos.
   See [Mythos detection](Settings-Snippet-Keys#mythos-detection) and [the CVP procedure](Settings-Snippet-Keys#cvp-procedure).
5. Restart Claude Code.

The snippet sets a key only when the Claude Code default does not give the result that dotclaude needs.
A test checks each key of the block below against `schemas/claude-code-settings.json`.
The same test fails when the block holds a key of the [never-set list](Off-Switches#never-set).

## The snippet

```json
{{include snippet.json}}
```

The six `rm` rules match any flag spelling with an `r` or `R` after a dash, and `--recursive`.
They also ask for some calls that are not recursive, for example `rm -f report.txt`, where the `r` is in the file name after a dash option.
An extra ask is acceptable.
The rules do not stop a write outside the allowed folders.
The sandbox stops that write.

## Lines for the `dotclaude-docs` add-on

Add these lines only when you install `dotclaude-docs` ([Library docs](Library-Docs)).
Merge them into the `permissions.allow` list and the `sandbox.network.allowedDomains` list above.
The `allowed-tools` line of the skill did not approve the call on Claude Code 2.1.294 (live run), so the snippet allows it.
The command form must equal the form in `plugins/dotclaude-docs/skills/docs/SKILL.md`.

```json
{{include docs-snippet.json}}
```

## Related pages

- [Settings snippet keys](Settings-Snippet-Keys)
- [Off switches](Off-Switches)
- [Settings schema](Settings-Schema)
- [Install](Install)
