# Contributing

## Set Up

1. Install Bun `1.4.4` (the `packageManager` field of `package.json`), `just`, and Claude Code `2.1.314`.
2. Run `bun install` in the repository root.
3. Run `just check`.
   It runs the lint, the type check, the tests, the plugin validation, and the hook lab.
   It must pass before you open a pull request.

## Layout

- `plugins/claudetto/src/` holds the shared files and one folder for each slice, and `hooks/hooks.json` names the one hooks module `src/register.ts`.
- `tools/` holds the scripts of `just check`, and `claudekit/` holds the paid and manual tools.
- `tests/claudetto/` holds the unit tests of the core plugin, `tests/repo/` holds the tests of the rules of the repository, and a `__tests__/` folder beside a source counts as well.
- `plugins/*/tests/` holds the hook labs, which only `claude plugin test` runs, because `bun test` skips them (`bunfig.toml:11`).
- [`AGENTS.md`](AGENTS.md) has every rule of the repository, which `CLAUDE.md` imports.

## Rules

[`AGENTS.md`](AGENTS.md) has the full rules.
In short:

- Keep each file at 300 lines or less, and each test file at 500 lines or less.
- Write docs in STE-flavored ASD-STE100, with no semicolons.
- Put each code item in inline code.
- Use only the documented extension points of Claude Code.
- A plugin imports nothing from another plugin.

## Tests First

Write the test first, and see it fail for the right reason.
Then make the change.
A regression test must fail without the fix.
Tests give commands to the guards as strings and never run a guarded command.

## Changelog

Add an entry under `[Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md), opening that section above the newest release when it is absent.
Set the same version in all four manifests: `package.json`, `.claude-plugin/marketplace.json`, `plugins/claudetto/.claude-plugin/plugin.json`, and `plugins/claudetto-you-should-know/.claude-plugin/plugin.json`.
`just validate` fails when they disagree, through `tools/manifests.ts`.
The merge into `main` is the release, and no tag is cut.

## Conduct and Security

Read the [code of conduct](CODE_OF_CONDUCT.md).
Report a vulnerability in private, as [`SECURITY.md`](SECURITY.md) says.
