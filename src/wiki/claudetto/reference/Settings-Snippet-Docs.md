# Settings Snippet Docs

These settings lines belong to the `claudetto-docs` add-on ([Library Docs](Library-Docs)).
Add them only when you install that add-on.
`claudetto-setup` does not add them, so merge them by hand into `permissions.allow` and `sandbox.network.allowedDomains` of the [settings snippet](Settings-Snippet).

```json
{{include docs-snippet.json}}
```

- The `Bash` rules allow the two read-only `ctx7` subcommands `library` and `docs`, with the pinned `ctx7` version.
- The domains `context7.com` and `registry.npmjs.org` let `bunx` fetch `ctx7` and let `ctx7` read the docs.

## See Also

- [Settings Snippet](Settings-Snippet)
- [Library Docs](Library-Docs)
