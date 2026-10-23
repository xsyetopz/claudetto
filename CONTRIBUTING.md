# Contributing

## Set Up

1. Install Bun 1.4.3 (the `packageManager` field of `package.json`), `just`, and Claude Code 2.1.309.
2. Run `bun install` in the repository root.
3. Run `just check`.
   It runs the lint, the type check, the tests, the plugin validation, and the hook lab.
   It must pass before you open a pull request.

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

Add an entry under `[Unreleased]` in [`CHANGELOG.md`](CHANGELOG.md).
Change versions only with `just bump`.

## Docs

Write the public docs in `src/wiki/`, and run `just generate` to write `wiki/`.
See the [Development](https://github.com/xsyetopz/claudetto/wiki/Development) page for more.

## Conduct and Security

Read the [code of conduct](CODE_OF_CONDUCT.md).
Report a vulnerability in private, as [`SECURITY.md`](SECURITY.md) says.
