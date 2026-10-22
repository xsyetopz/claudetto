# Settings Snippet Docs

These settings lines belong to the `claudetto-docs` add-on ([Library Docs](Library-Docs)).
Add them only when you install that add-on.
`claudetto-setup` does not add them, so merge them by hand into `permissions.allow` of your settings.

```json
{{include docs-snippet.json}}
```

- The `Skill` rule allows the skill `claudetto-docs:find-docs`.
- The `Bash` rules allow the two read-only `ctx7` subcommands `library` and `docs`, with the pinned `ctx7` version.

## Related Pages

- [Settings Snippet](Settings-Snippet)
- [Library Docs](Library-Docs)
