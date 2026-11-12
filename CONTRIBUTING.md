# Contributing

## Set Up

1. Install Bun `1.4.4` (the `packageManager` field of `package.json`), `just`, and Claude Code `2.1.318` or later.
2. Run `bun install` in the repository root.
3. Run `just check`.
   It runs `just lint`, `just typecheck`, `just test`, `just validate`, and `just lab`, each of which you can run alone.
   It must pass before you open a pull request.

`just --list` names every recipe.
`just test` takes the arguments of `bun test`, such as a file or `-t RE`.
`bun run lint:fix` applies the `biome` fixes, and `bun run lint:md` lints the Markdown files.

## Layout

- `plugins/claudetto/src/` holds the shared files and one folder for each slice, and `hooks/hooks.json` names the one hooks module `src/register.ts`.
- `tools/` holds the scripts of `just check`, and `claudekit/` holds the paid and manual tools.
- `tests/claudetto/` holds the unit tests of the core plugin, and a `__tests__/` folder beside a source counts as well.
- `plugins/*/tests/` holds the hook labs, which only `just lab` (`claude plugin test`) runs, because `bun test` skips them (`bunfig.toml:11`).
- [`AGENTS.md`](AGENTS.md) has every rule of the repository, which `CLAUDE.md` imports.

## Rules

[`AGENTS.md`](AGENTS.md) has the full rules.
In short:

- Keep each file at 300 lines or less, and each test file at 500 lines or less.
- Put each code item in inline code.
- Use `bun` and `bunx` for every package step, never `npm` or `npx`.
- Write no internal note in source: no task ID, no path into `openspec/`, no history.

## Tests First

Write the test first, and see it fail for the right reason.
Then make the change.
A regression test must fail without the fix.
Tests give commands to the guards as strings and never run a guarded command.

## Changelog

Add an entry under `[Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md), opening that section above the newest release when it is absent.
Set the version in `package.json`; `just release-version` fails when it does not follow the tags.
A `plugin.json` holds no `version`, so Claude Code versions each install by its commit and every commit on `main` updates it.
The merge into `main` is the release, and no tag is cut.

## Conduct and Security

Read the [code of conduct](CODE_OF_CONDUCT.md).
Report a vulnerability in private, as [`SECURITY.md`](SECURITY.md) says.
