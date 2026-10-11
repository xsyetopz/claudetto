# Settings schema of Claude Code 2.1.295

`just schema` ran on the installed 2.1.295 bundle.
It wrote `schemas/claude-code-settings.json` and `schemas/claude-code-managed-settings.json`.
The file names have no version, and `x-claude-code-version` in each file is 2.1.295.
The 2.1.294 figures below come from a build of the 2.1.294 bundle to a separate folder.

## Key counts

- User schema: 162 top-level keys (161 in 2.1.294).
- Managed schema: 184 top-level keys (the same as in 2.1.294).

## Diff against 2.1.294

Both files were built with the same generator from the 2.1.294 bundle for this diff.
The 2.1.294 output is the same before and after the generator change for 2.1.295.

- `x-claude-code-version` and `title` change.
- User schema: `forceLoginGatewayUrl` is new.
  Its description says that it is honored from managed settings and, on a machine with none, from user settings.
- Managed schema: `forceLoginGatewayUrl` is no longer `x-managed-only`, and its description is the new text.
- Both schemas: the nested `sigv4` object of the sandbox credential setting is `{}` in 2.1.295.
  The 2.1.294 file has the `enabled` and `stores` object of an other module there.
  The 2.1.294 name `Jc` resolved to the wrong definition, and 2.1.295 is correct.
- Managed schema: `multiplier` of a model pricing key is `{}` in 2.1.295.
  The 2.1.294 file has the `remote_tools_probe` message there, from the same wrong match.
- No other key changes.

## Generator changes

- `TYPES["2.1.295"]` has the renamed helpers: array `C`, enum `U`, const `T`.
- `findDefinition` accepts the lazy wrapper `p(()=>` and, for 2.1.295 only (`SCOPED`),
  takes the last definition before `{$schema:()=>`.
- The 2.1.293 and 2.1.294 output has no change.
- `tests/dotclaude/schema.test.mjs` pins `forceLoginGatewayUrl` as a user key and tests `isManagedOnly` on both texts.
