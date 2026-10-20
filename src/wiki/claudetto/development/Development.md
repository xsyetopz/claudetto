# Development

This page helps you change the `claudetto` repository.
It lists what to install, the rules, the commands, and the tests.
Types, CI, releases, and the wiki are on [Development Release](Development-Release).

## What to Install

| Tool | Version | Note |
| --- | --- | --- |
| [`Bun`](https://bun.sh) | 1.4.3 or later | `package.json` sets the minimum in `engines`, `packageManager`, and `.bun-version` |
| `just` | any (CI uses 1.58.0) | Runs the recipes |
| Claude Code | 2.1.305 or later | `MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` sets it. The recipes `sandbox`, `validate`, `lab`, `eval`, and `release` call `claude` |
| `docker` (OrbStack or Docker) | any | For `just docker` and `just sandbox-linux` |

Then run `bun install` in the repository root.
It installs the dev dependencies that `bun.lock` pins: Biome, `markdownlint-cli2`, `jscpd`, OpenSpec, `yaml`, `bun-types`, and `@types/node`.

## Rules

- Edit the source in `src/`, then run `just generate`.
  Do not edit `plugins/` by hand, because a test fails when a generated file differs from its source.
- Change a bound only in its owner file: `src/kernel/budget.ts` (shared), `slices/<s>/limits.ts` (slice), or `tools/limits.ts` (repository).
  See [Bounds](Bounds).
- Use the env vars and flags of Claude Code.
  Add a `CLAUDETTO_` env var only when neither can do the work.
- Never patch the Claude Code CLI binary or its npm package.
  Reading the bundle for evidence is allowed.
- Write docs in STE-flavored ASD-STE100, with semantic line breaks and inline code for each code item.
- Add a CHANGELOG entry under the version in the manifests when that version has no tag yet.
  Otherwise add it under `[Unreleased]`.

The files in `.claude/rules/` apply to some paths only.
Claude Code loads a rule when Claude works on a matching file.

| Rule file | Subject |
| --- | --- |
| `arrow-functions.md` | Each function is an arrow function |
| `slice-imports.md` | A slice imports only `src/kernel/` and its own folder |
| `plugin-imports.md` | A plugin imports no other plugin |
| `hooks-module.md` | The hooks module graph has no `node:`, no `bun:`, and no `Bun` |
| `cli-adapters.md` | A CLI adapter runs on Bun and may use `node:`, `bun:`, and `Bun` |
| `engine-facts.md` | Facts of Claude Code that a hook relies on ([Engine Facts](Decisions-Engine)) |
| `extension-points.md` | No runtime code for a feature that Claude Code has |
| `lab-tests.md` | Hook lab tests are in `lab/*.test.ts` |
| `ste-messages.md` | Messages to Claude are in strict ASD-STE100 |
| `tests.md` | A test never runs a guarded command |
| `wiki.md` | Title Case and the style of the wiki pages |

## Commands

Run `just` with no argument to list the recipes.
Each recipe runs from the repository root.

| Command | What it does |
| --- | --- |
| `just check` | Runs lint, typecheck, `generate --check`, test, validate, lab, and dry. It must pass before a change is done |
| `just ci` | The same gate without the type check. It is the CI `check` job |
| `just docker [RECIPE]` | Runs a recipe (`check` by default) in a container with at most `DOCKER_CPUS` CPUs |
| `just test [FILE]` | Runs `just generate`, then `bun test`. A file argument runs only that file |
| `just lint` | Runs Biome and `markdownlint-cli2` |
| `just typecheck` | Checks each `.ts` file and the core hooks module |
| `just validate` | Fails on an eval case that checks only the reply, then runs `claude plugin validate --strict` |
| `just lab` | Runs `claude plugin test` on each plugin that has a `tests/` folder |
| `just dry` | Fails on a code clone that `.jscpd-baseline.json` does not hold |
| `just generate [--check]` | Writes each shipped text from `src/`. `--check` names each file that differs |
| `just schema` | Writes the settings schemas of the installed Claude Code to `schemas/` |
| `just update` | Refreshes the marketplace and updates your installed plugins. Restart Claude Code after it |
| `just bump LEVEL` | Bumps the version and moves the `[Unreleased]` CHANGELOG entries |
| `just release-check [CHANGE]` | Fails while a row of `findings.md` has no passed check |
| `just release` | Tags each plugin at `HEAD` and pushes the tags |
| `just wiki` | Publishes `wiki/` to the GitHub wiki |
| `just eval --model M` | Runs the eval cases with `claude plugin eval`. It costs money |
| `just eval-variant REF --model M` | Runs the eval cases on the checkout and on a variant at a git ref |
| `just sandbox`, `sandbox-alone`, `sandbox-install`, `sandbox-installed`, `sandbox-linux`, `sandbox-clean`, `debug-agents` | Run Claude Code in a separate config ([Sandbox](Sandbox)) |
| `just capture` | Logs the requests of Claude Code through a local proxy ([Sandbox Sessions](Sandbox-Sessions)) |

```bash
just check                                     # must pass before a change is done
just test tests/claudetto/guard/rules.test.ts  # one file
bun run lint:md                                # lint Markdown
```

Headings and code blocks of Markdown have a 100-column bound.

### The Check Lock

`just check` and `just docker` run under the `check` lock of `tools/lock.ts`, so one check runs in a checkout at a time.
The lock file is `node_modules/.cache/claudetto/.check.lock`.
A second run exits with `75` (`HELD_CODE`), and a lock fault exits with `70` (`TOOL_ERROR_CODE`).
To stop a run, stop only the process of the PID in the lock file.
A container has its own `node_modules/` volume and its own lock.

## Tests

`just test` runs `just generate` first, because many tests import the generated copy in `plugins/`.

| Folder | What it holds |
| --- | --- |
| `tests/claudetto/<slice>/` | Tests of each slice of the core plugin |
| `tests/claudetto-<add-on>/` | Tests of each add-on |
| `tests/kernel/` | Tests of `src/kernel/` |
| `tests/support/` | Test helpers and repository checks, such as `wiki-links.test.ts` and `hook-evals.test.ts` |
| `tests/tools/` | Tests of the scripts in `tools/` |

### The Hook Lab

`just lab` runs `claude plugin test` on each plugin folder that has a `tests/` folder.
A slice keeps its lab tests in `lab/*.test.ts`, and `just generate` copies them to `plugins/<name>/tests/`.
Each test fires events at the hooks module with stubbed reads.
Test each change to `hooks/register.ts` in the lab before a live session.
See [Plugin Layout](Plugin-Layout#hook-evals) for the eval entry of each hook.

## See Also

- [Development Release](Development-Release)
- [Sandbox](Sandbox)
- [Plugin Layout](Plugin-Layout)
- [Decisions](Decisions)
