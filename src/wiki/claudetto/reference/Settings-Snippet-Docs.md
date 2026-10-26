# Settings Snippet Docs

These settings lines are optional, and they belong to the skill `claudetto:find-docs` of the core plugin ([Library Docs](Library-Docs)).
Add them only when you want the skill to run with no prompt.
`claudetto-setup` does not add them, so merge them by hand into `permissions.allow` of your settings.

```json
{{include docs-snippet.json}}
```

- The `Skill` rule allows the skill `claudetto:find-docs`.
- The `Bash` rules allow the two read-only `ctx7` subcommands `library` and `docs`, with the pinned `ctx7` version.

## Related Pages

- [Settings Snippet](Settings-Snippet)
- [Library Docs](Library-Docs)
