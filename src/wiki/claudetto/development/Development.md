# Development

This page helps you change the `claudetto` repository.
It lists what to install, the rules, the commands, and the tests.
Types, CI, releases, and the wiki are on [Development Release](Development-Release).

## What to Install

| Tool | Version | Note |
| --- | --- | --- |
| [`Bun`](https://bun.sh) | 1.4.3 or later | `package.json` sets the minimum in `engines`, `packageManager`, and `.bun-version` |
| `just` | any (CI uses 1.58.0) | Runs the recipes |
| Claude Code | 2.1.311 or later | `MIN_CLAUDE_CODE_VERSION` in `tools/limits.ts` sets it. The recipes `sandbox`, `validate`, `lab`, `eval`, and `release` call `claude` |
| `docker` (OrbStack or Docker) | any | For `just docker` and `just sandbox-linux` |

Then run `bun install` in the repository root.
It installs the dev dependencies that `bun.lock` pins: Biome, `markdownlint-cli2`, `jscpd`, OpenSpec, `yaml`, `bun-types`, and `@types/node`.

## Rules

- Edit the plugins in `plugins/`, because it is the source.
  Edit the wiki in `src/wiki/`, then run `just generate`, because `wiki/` is written from it.
- Change a bound only in its owner file: `plugins/claudetto/kernel/node/limits.ts` (kernel), `modules/<m>/limits.ts` (module), `slices/<s>/limits.ts` (add-on slice), or `tools/limits.ts` (repository).
  See [Bounds](Bounds).
- Use the env vars and flags of Claude Code.
  Add a `CLAUDETTO_` env var only when neither can do the work.
- Never patch the Claude Code CLI binary or its npm package.
  Reading the bundle for evidence is allowed.
- Write docs in STE-flavored ASD-STE100, with inline code for each code item.
- Add a CHANGELOG entry under the version in the manifests when `main` does not have that version yet.
  Otherwise add it under `[Unreleased]`.

The files in `.claude/rules/` apply to some paths only.
Claude Code loads a rule when Claude works on a matching file.

| Rule file | Subject |
| --- | --- |
| `changelog.md` | Where a CHANGELOG entry goes, and `just bump` for versions |
| `claude-code.md` | Env vars and flags of Claude Code first, pin tests for undocumented facts, and the cheapest code |
| `dev-tools.md` | Each file of `tools/` and `dev/` has a caller |
| `plugins.md` | A plugin imports no other plugin, the hooks module graph has no `node:`, `bun:`, or `Bun`, and no copy of a built-in feature |
| `rule-names.md` | One `on()` call and one `evals/hooks.json` key for each hook rule |
| `tests.md` | Behavior tests, Arrange-Act-Assert, the layout of `tests/`, and the hook lab tests |


## Commands

Run `just` with no argument to list the recipes.
Each recipe runs from the repository root.

| Command | What it does |
| --- | --- |
| `just check` | Runs `tools/check.ts`: lint, typecheck, `generate --check`, test, validate, lab, and dry. The test step fails on a test file with 0 cases. It must pass before a change is done |
| `bun tools/check.ts --ci` | The same gate without the type check. It is the CI `check` job |
| `just docker [RECIPE]` | Runs a recipe (`check` by default) in a container with at most `DOCKER_CPUS` CPUs |
| `just test [FILE]` | Runs `bun test`. A file argument runs only that file. Run `just generate` first after a change of `src/wiki/` |
| `just lint` | Runs Biome and `markdownlint-cli2` |
| `just typecheck` | Checks each `.ts` file and the core hooks module |
| `just validate` | Fails on an eval case that checks only the reply, then runs `claude plugin validate --strict` |
| `just lab` | Runs `claude plugin test` on each plugin that has a `tests/` folder |
| `just dry` | Fails on a code clone that `.jscpd-baseline.json` does not hold |
| `just generate [--check]` | Writes `wiki/` from `src/wiki/`. `--check` names each page that differs |
| `just schema` | Writes the settings schemas of the installed Claude Code to `schemas/` |
| `just update` | Refreshes the marketplace and updates your installed plugins. Restart Claude Code after it |
| `just bump LEVEL` | Bumps the version and moves the `[Unreleased]` CHANGELOG entries |
| `just release-check CHANGE` | Fails while a row of `findings.md` has no passed check |
| `just wiki` | Publishes `wiki/` to the GitHub wiki |
| `just eval --model M` | Runs the eval cases with `claude plugin eval`. It costs money |
| `just eval-variant REF --model M` | Runs the eval cases on the checkout and on a variant at a git ref |
| `just sandbox`, `sandbox-alone`, `sandbox-install`, `sandbox-installed`, `sandbox-linux`, `sandbox-clean`, `debug-agents` | Run Claude Code in a separate config ([Sandbox](Sandbox)) |
| `just capture` | Logs the requests of Claude Code through a local proxy ([Sandbox Sessions](Sandbox-Sessions)) |

```bash
just check                                     # must pass before a change is done
just test tests/claudetto/gate/gate.test.ts  # one file
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

`just test` runs `just generate` first, because some tests read the generated pages in `wiki/`.

| Folder | What it holds |
| --- | --- |
| `tests/claudetto/<slice>/` | Tests of each slice of the core plugin |
| `tests/claudetto-<add-on>/` | Tests of each add-on |
| `tests/claudetto/kernel/` | Tests of `plugins/claudetto/kernel/` |
| `tests/support/` | Test helpers and repository checks, such as `wiki-links.test.ts` and `hook-evals.test.ts` |
| `tests/tools/` | Tests of the scripts in `tools/` |

### The Hook Lab

`just lab` runs `claude plugin test` on each plugin folder that has a `tests/` folder.
The lab tests are in `plugins/<name>/tests/*.test.ts`.
Each test fires events at the hooks module with stubbed reads.
Test each change to `hooks/register.ts` in the lab before a live session.
See [Plugin Layout](Plugin-Layout#hook-evals) for the eval entry of each hook.

## Decision Numbers in Comments

A comment in the code may cite a decision as `D3` or `D46`.
These numbers name the decisions of `design.md` and the files `design-*.md` of the change `release-0-2-0`.
The folder is deleted from the tree, so read it at commit `1c579e10`:
`git show 1c579e10:openspec/changes/release-0-2-0/design.md`.

## Related Pages

- [Development Release](Development-Release)
- [Sandbox](Sandbox)
- [Plugin Layout](Plugin-Layout)
- [Decisions](Decisions)
