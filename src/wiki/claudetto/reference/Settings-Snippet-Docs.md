# Settings Snippet Docs

This page gives the settings lines of the `claudetto-docs` add-on.
Users of the add-on read it.
Add these lines only when you install `claudetto-docs` ([Library Docs](Library-Docs)).
Merge them by hand into the `permissions.allow` list and the `sandbox.network.allowedDomains` list of the [settings snippet](Settings-Snippet).
`claudetto-setup` does not add them.

```json
{{include docs-snippet.json}}
```

The `Bash` rules allow the two read-only `ctx7` subcommands `library` and `docs`, with the pinned `ctx7` version.
The domains `context7.com` and `registry.npmjs.org` let `bunx` fetch `ctx7` and let `ctx7` read the docs.

## Related Pages

- [Settings Snippet](Settings-Snippet)
- [Library Docs](Library-Docs)
