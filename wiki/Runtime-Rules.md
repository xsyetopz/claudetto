# Runtime rules

This page says which runtime each file uses, why the hooks module graph has no `node:` import, and where each bound lives.
The decisions are D18 and D19 in [Decisions](Decisions-Layout).

## Runtimes

| Code | Runtime |
| --- | --- |
| Code that needs Python | Python, with the standard library or a pinned requirement. |
| Runtime JavaScript in `plugins/` | `.mjs` files on Node.js 22.18 or later, with `node:` modules only. |
| Tests, `tools/`, and evals | Bun. |

- A plugin ships no `.js` or `.ts` file.
  The exceptions are the `.test.ts` files that `claude plugin test` runs and the `types/*.d.ts` file that a manifest names.
- A test lists the files under `plugins/` and fails on any other script type (`tests/support/runtimes.test.mjs`).

## No `node:` import in the module graph

The hooks module runs with no Node.
A file in the import graph of `hooks/register.mjs` therefore has no `node:` import.

- Only a `cli.mjs` entry for a classic hook, or a `bin/` tool, can use `node:`.
- The import test fails on a `node:` import in the graph of `hooks/register.mjs`.
- When the module needs a system call, it uses a `$` function, such as `$.process.run`.
- The `sembr` formatter in `lib/sembr.mjs` is pure string code with no import, so the module can load it.

## Bound tiers

Each bound has one owner.
Tests pin the copies of a bound in code and config, not in prose.

| Tier | File | What it holds |
| --- | --- | --- |
| Shared runtime | `plugins/dotclaude/lib/budget.mjs` | Bounds that two or more parts read, or that setup writes to the profile: `CONTEXT_WINDOW`, `USAGE_LEVELS`. |
| Feature | `features/<name>/limits.mjs`, or the own module of an add-on | Bounds that one feature reads, such as `SUBAGENT_CONTEXT_MAX` and the allowed efforts of each model. |
| Repository | `tools/limits.mjs` | Bounds that only tests and tools read, such as the file size bounds, the size targets of `CLAUDE.md`, skills, and the first request, `START_TOKENS`, and the eval bounds. |

- The router table is data in `features/router/data.mjs`.
- `just measure` writes the measure to `tools/baseline.json`, so a measure is data and not a hand edit.
- No `AGENTS` list exists.
  The frontmatter of `agents/*.md` is the source of the model, the effort, and `maxTurns` ([Agents](Agents#pins)).
- `userConfig` is for a choice that the user makes, which the module reads as `options`.
  Setup and the status line cannot read `options`, so their bounds stay in `budget.mjs`.
  Each plugin with options costs one dialog at install, so a plugin adds an option only for a real user choice.

## File size

- A normal file has 300 lines or fewer.
- A test file has 500 lines or fewer.
- `FILE_MAX_LINES` and `TEST_FILE_MAX_LINES` are in `tools/limits.mjs`.
  A test in `tests/support/file-size.test.mjs` fails on a file over its bound and names the file.
- Generated files, such as `schemas/` and lock files, are excluded by name.
- The 300-line bound also applies to Markdown files, so a long page is split into linked pages.
- A test searches `plugins/` for the repository bounds and finds none.

## Related pages

- [Plugin layout](Plugin-Layout)
- [Development](Development)
- [Parts](Parts)
