# Development

This page is for contributors.
Read it before you change the repository.
It shows the needs, the commands, and the tests.
The types, CI, releases, and the wiki are on [Development Release](Development-Release).

## Needs

- Install [`Bun`](https://bun.sh) 1.4.3 or later.
  The `engines` field of `package.json` sets the minimum, and `packageManager` and `.bun-version` pin 1.4.3.
- Install `just`.
  CI uses `just` 1.58.0.
- Run `bun install` in the repository root.
  It installs the dev dependencies that `bun.lock` pins: Biome, `markdownlint-cli2`, `jscpd`, OpenSpec, `yaml`, `bun-types`, and `@types/node`.
- Install Claude Code 2.1.303 or later.
  `MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` sets the minimum, and CI installs that version.
  The recipes `sandbox`, `validate`, `lab`, `eval`, and `release` call the `claude` command.
- Install `docker`, OrbStack or Docker, for `just docker` and `just sandbox-linux`.

## Rules

- Edit the source in `src/`, then run `just generate`.
  Do not edit `plugins/` by hand.
  A test fails when a generated file differs from its source.
- Change a shared runtime bound only in `src/kernel/budget.ts`, a slice bound only in `slices/<s>/limits.ts`, and a repository bound only in `tools/limits.ts`.
  Tests pin the copies of each bound in code and config.
  See [Bounds](Bounds).
- Use the env vars and flags of Claude Code.
  Add a `CLAUDETTO_` env var only when neither can do the work.
- Never patch the Claude Code CLI binary or its npm package.
  Reading the bundle for evidence is allowed.
- Write docs in STE-flavored ASD-STE100, with semantic line breaks and inline code for each code item.
- Add a CHANGELOG entry under the section of the version in the manifests when that version has no tag yet.
  Otherwise add it under `[Unreleased]`.

The files in `.claude/rules/` apply to some paths only.
Claude Code loads a rule when Claude works on a matching file.

| Rule file | Subject |
| --- | --- |
| `arrow-functions.md` | Each function is an arrow function. |
| `slice-imports.md` | A slice imports only `src/kernel/` and its own folder. |
| `plugin-imports.md` | A plugin imports no other plugin. |
| `hooks-module.md` | The hooks module graph has no `node:`, no `bun:`, and no `Bun`. |
| `cli-adapters.md` | A CLI adapter runs on Bun and may use `node:`, `bun:`, and `Bun`. |
| `engine-facts.md` | Facts of Claude Code that a hook relies on. See [Decisions Engine](Decisions-Engine). |
| `extension-points.md` | No runtime code for a feature that Claude Code has. |
| `lab-tests.md` | Hook lab tests are in `lab/*.test.ts`. |
| `ste-messages.md` | Messages to Claude are in strict ASD-STE100. |
| `tests.md` | A test never runs a guarded command. |
| `wiki.md` | Title Case and the style of the wiki pages. |

## Commands

Run `just` with no argument to list the recipes.
Each recipe runs from the repository root.

| Command | What it does |
| --- | --- |
| `just check` | Runs lint, typecheck, `generate --check`, test, validate, lab, and dry. It must pass before a change is done. |
| `just ci` | The same gate without the type check. It is the gate of the CI `check` job. |
| `just docker [RECIPE]` | Runs a recipe, `check` by default, in a container with at most `DOCKER_CPUS` CPUs. |
| `just test [FILE]` | Runs `just generate`, then `bun test`. A file argument runs that file in place of all of them. |
| `just lint` | Runs Biome on `plugins`, `tests`, `tools`, and `src`, and `markdownlint-cli2` on the Markdown files. |
| `just typecheck` | Runs `bun check`, which checks each `.ts` file and the core hooks module. |
| `just validate` | Fails on an eval case that checks only the reply, then runs `claude plugin validate --strict` on the marketplace and each plugin. |
| `just lab` | Runs `claude plugin test` on each plugin under `plugins/` that has a `tests/` folder. |
| `just dry` | Merges `jscpd.local.json` into `.jscpd.json`, then fails on a clone that `.jscpd-baseline.json` does not hold. |
| `just generate [--check]` | Writes each text that a plugin ships from `src/`. `--check` names each file that differs. |
| `just schema` | Writes the settings schemas of the installed Claude Code to `schemas/`. |
| `just update` | Refreshes the marketplace, then updates each plugin under `plugins/` that you installed. Restart Claude Code after it. |
| `just bump LEVEL` | Bumps the version in `package.json` and moves the `[Unreleased]` entries of the CHANGELOG. |
| `just release-check [CHANGE]` | Fails while a row of `findings.md` of an OpenSpec change has no passed check. |
| `just release` | Tags each plugin under `plugins/` at `HEAD` and pushes the tags. |
| `just wiki` | Publishes `wiki/` to the GitHub wiki. |
| `just eval --model M` | Runs the eval cases of the core plugin with `claude plugin eval`. It costs money. |
| `just eval-variant REF --model M` | Runs the eval cases on the checkout and on a variant at a git ref. |
| `just sandbox`, `sandbox-alone`, `sandbox-install`, `sandbox-installed`, `sandbox-linux`, `sandbox-clean`, `debug-agents` | Run Claude Code in a separate config. See [Sandbox](Sandbox). |
| `just capture` | Logs the requests of Claude Code through a local proxy. See [Sandbox Sessions](Sandbox-Sessions). |

`just check` and `just docker` run under the `check` lock of `tools/lock.ts`, so only one check runs in a checkout at a time.
The lock file is `node_modules/.cache/claudetto/.check.lock`.
A second run exits with `75` (`HELD_CODE`), and a fault of the lock exits with `70` (`TOOL_ERROR_CODE`).
To stop a run, stop the process of a PID in the lock file, and no other process.
A container has its own `node_modules/` volume, so it has its own lock.

```bash
just check                                     # must pass before a change is done
just test tests/claudetto/guard/rules.test.ts  # one file
bun run lint:md                                # lint Markdown
```

The headings and the code blocks of Markdown have a 100-column bound.

## Tests

`just test` runs `just generate`, then `bun test`.
Many tests import the generated copy in `plugins/`, such as each `prompts.ts`, so a test without the generate step can check old code.

| Folder | What it holds |
| --- | --- |
| `tests/claudetto/<slice>/` | The tests of each slice of the core plugin. |
| `tests/claudetto-<add-on>/` | The tests of each add-on plugin. |
| `tests/kernel/` | The tests of `src/kernel/`. |
| `tests/support/` | The helpers of the tests, and the repository checks, such as `wiki-links.test.ts` and `hook-evals.test.ts`. |
| `tests/tools/` | The tests of the scripts in `tools/`. |

### The Hook Lab

`just lab` runs `claude plugin test` on each plugin folder under `plugins/` that has a `tests/` folder.
A slice keeps its lab tests in `lab/*.test.ts`, and `just generate` copies them to `plugins/<name>/tests/`.
Each test file fires events at the hooks module with stubbed reads.
Test each change to `hooks/register.ts` in the lab before a live session.
See [Plugin Layout](Plugin-Layout#hook-evals) for the eval entry of each hook.

## Related Pages

- [Development Release](Development-Release): types, CI, releases, and the wiki.
- [Sandbox](Sandbox): the separate config.
- [Plugin Layout](Plugin-Layout): the folders of each plugin.
- [Decisions](Decisions): the decisions in force.
