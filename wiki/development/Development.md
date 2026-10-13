# Development

This page is for contributors.
Read it before you change the repository.
It shows the needs, the commands, the layout rules, and the steps to test, release, and publish a change.

## Needs

- Install [`Bun`](https://bun.sh) 1.4.3 or later.
  The `engines` field of `package.json` sets the minimum.
  The `packageManager` field and `.bun-version` pin 1.4.3.
- Install `just`.
  CI uses `just` 1.58.0.
- Run `bun install` in the repository root.
  It installs the dev dependencies that `bun.lock` pins.
  These are `@biomejs/biome` 2.5.15, `markdownlint-cli2` 0.23.3, `bun-types` 1.4.3, `@types/node` 26.6.5, and `yaml` 2.9.1.
- Install Claude Code 2.1.296.
  CI installs the same version, which the `TESTED_VERSION` constant names.
  The recipes `sandbox`, `validate`, `lab`, `eval`, and `release` call the `claude` command.

## Commands

Run `just` with no argument to list the recipes.
Each recipe runs from the repository root.

| Command | What it does |
| --- | --- |
| `just test [FILE]` | Runs `bun test` on the tests of `tests/`. A file argument runs that file in place of all of them. |
| `just lint` | Runs Biome on `plugins`, `tests`, `tools`, and `src`, and `markdownlint-cli2` on the Markdown files. |
| `just typecheck` | Runs `bun check` with `tsconfig.json`, which checks each `.ts` file and the core hooks module. |
| `just validate` | Runs `tools/validate.ts`, which runs `claude plugin validate --strict` and checks the file size bounds. |
| `just lab` | Runs `tools/lab.ts`, which runs `claude plugin test` on each plugin with a `tests/` folder. |
| `just check` | Runs lint, typecheck, `generate --check`, test, check, and lab. It must pass before a change is done. |
| `just ci` | Runs lint, test, check, and lab. It is the gate of the CI `check` job. |
| `just sandbox [ARGS]` | Runs Claude Code with this checkout as its plugin, in a separate config. See [Sandbox](Sandbox). |
| `just sandbox-alone PLUGIN [ARGS]` | Runs Claude Code with only the plugin folder `PLUGIN`, in a new config with no settings. |
| `just sandbox-install [PLUGIN...]` | Installs plugins of this checkout with `claude plugin install` into a new config, as a user installs them, then runs Claude Code there. |
| `just sandbox-installed [ARGS]` | Runs Claude Code again in the config of `just sandbox-install`, with no new install. |
| `just sandbox-clean` | Removes the sandbox config and project. |
| `just capture [ARGS]` | Logs the requests of Claude Code through a local proxy, and sizes the first request. |
| `just measure [SESSION.jsonl]` | Sizes the start of a session, and exits 1 above the start bounds of `tools/limits.ts`. |
| `just start-run [ARGS]` | Captures and measures the start of a clean sandbox session. You send one prompt, then type `/exit`. |
| `just debug-agents` | Runs one headless sandbox session with a debug log, and fails when the log names an unknown frontmatter field. |
| `just usage [ARGS]` | Shows where your Claude Code usage went. Add `--days N`, `--runs N`, or `--json`. |
| `just update` | Refreshes the marketplace, then updates each installed plugin under `plugins/`. Restart Claude Code after it. |
| `just bump LEVEL` | Bumps the version in `package.json` and moves the `[Unreleased]` CHANGELOG entries. Then run `just generate`. See [Releases](#releases). |
| `just release` | Tags each plugin under `plugins/` at `HEAD`, and pushes the tags in one push. See [Releases](#releases). |
| `just generate` | Writes each text that a plugin ships from its source in `src/`. `--check` names each file that differs. |
| `just schema` | Writes the settings schemas of the installed Claude Code to `schemas/`. |
| `just eval` | Runs the eval suite of the core plugin with `claude plugin eval`. See [Evals](Evals). |
| `just eval-variant REF` | Runs the eval suite on the checkout and on a variant at a git ref, to compare them. |
| `just wiki` | Publishes `wiki/` to the GitHub wiki. See [Wiki](#wiki). |

`just check` is the local gate.
`just ci` is the same gate without the type check and without `generate --check`.
CI has no type check.
Claude Code writes the `.claude-plugin/types/` folder only when an interactive session loads a plugin.

`just measure` is not part of `just check` or `just ci`.
It exits 1 when the first request is above `START_TOKENS` in `tools/limits.ts`.
It also exits 1 when its text is outside the `FIRST_REQUEST_LOW_BYTES` and `FIRST_REQUEST_HIGH_BYTES` range.

```bash
just check                                     # must pass before a change is done
just test tests/dotclaude/guard/rules.test.ts  # one file
just usage --days 7                            # where your usage went
bun run lint:md                                # lint Markdown
```

## Size Bounds

The size bounds are in `tools/limits.ts`.
`FILE_MAX_LINES` is 300, and `TEST_FILE_MAX_LINES` is 500.
`just validate` fails when a file is above its bound.
Split a larger file into files that each hold one concern.
A Markdown file has the same 300-line bound.
Its headings and code blocks have a 100-column bound.
See [Bounds](Bounds) for each bound, its value, and its file.

## Tests

`just test` runs `bun test` on the test files of `tests/`.

| Folder | What it holds |
| --- | --- |
| `tests/dotclaude/<slice>/` | The tests of each slice of the core plugin, such as `guard/` and `setup/`. |
| `tests/<plugin>/` | The tests of each add-on plugin, without the `dotclaude-` prefix. The tests of `dotclaude-browser` are in `tests/browser/`. |
| `tests/kernel/` | The tests of `src/kernel/`. |
| `tests/support/` | The helpers of the tests, and the repository checks, such as `file-size.test.ts` and `wiki-links.test.ts`. |
| `tests/tools/` | The tests of the scripts in `tools/`. |

### The Hook Lab

`just lab` runs `tools/lab.ts`.
It runs `claude plugin test` on each plugin folder under `plugins/` that has a `tests/` folder.
In this checkout, these are `dotclaude`, `dotclaude-browser`, `dotclaude-codegraph`, and `dotclaude-sessions`.
Each test file fires events at a hooks module.
It stubs the reads of that module.
Test each change to `hooks/register.ts` in the lab before a live session.

## Layout Rules

The source of each plugin is in `src/`.
The `plugins/` folder holds the output of `just generate`.
Only `plugins/` ships to users.
Do not edit `plugins/` by hand.

| Rule | Meaning |
| --- | --- |
| Edit the source, then generate | Edit `src/`, then run `just generate`. A test fails when a generated file differs from its source. |
| One owner for each number | The shared runtime bounds are in `src/kernel/budget.ts`. A slice bound is in `slices/<slice>/limits.ts`, under `src/plugins/<plugin>/`. A repository bound is in `tools/limits.ts`. |
| A slice imports its own folder | A slice imports only `src/kernel/` and its own folder. Domain code in `domain/` imports no adapter and no `src/kernel/node/`. Biome enforces both rules with `noRestrictedImports`. |
| A plugin imports no other plugin | No file in `plugins/` imports another plugin, `tools/`, or `tests/`. |
| No Node or Bun import in the hooks module | A file in the import graph of `hooks/register.ts` has no `node:` import and no `bun:` import. Claude Code runs that module in its own runtime. |
| No patch of Claude Code | Never patch the Claude Code CLI binary or its npm package. Reading the bundle for evidence is allowed. |

*Why:* a number with two owners drifts.
The drift shows up as two bounds that disagree.
The import rules keep each part small.
They also keep each failure local.
See [Plugin-Layout](Plugin-Layout) for the folders of each plugin.
See [Design](Design) for the design principles.

## Types

- The root `tsconfig.json` gives an editor the types of the Claude Code hooks module.
  It extends `plugins/dotclaude/tsconfig.json`.
- Claude Code writes the `.claude-plugin/types/` folders when it loads a plugin from your checkout, such as in `just sandbox`.
  Git ignores these folders.
  `just check` needs them.
  CI does not.
- Claude Code writes the types again at each load, from the tools of that session.
  The tools can differ between sessions.
  For example, `WebSearch` had a `mode` field in one session of Claude Code `2.1.296` and none in another session with other env vars.
  So a test gives no field that only some sessions have, or it uses a type that fits both shapes, such as `search` in `src/plugins/dotclaude-browser/slices/search/lab/web-search.test.ts`.
- Claude Code also writes a `tsconfig.json` into each plugin folder that has none.
  Git ignores these files, so the check of the generated files does not report them.

## Test in Your Config

1. Run `just sandbox` to use a separate config.
   A test then does not change your own setup.
2. To load the checkout in your own config, run this command:

   ```bash
   claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
   ```

## The `/dotclaude:implement` Skill

The `/dotclaude:implement` skill (`plugins/dotclaude/skills/implement/SKILL.md`) runs the ready packages of a change in waves.
Each package has one `implementer` agent in its own worktree.
Before each wave, run `dotclaude-spec runs`.
It prints how many agent runs the wave may start.
The next phases are `/dotclaude:review`, `/dotclaude:merge`, `/dotclaude:accept`, and `/dotclaude:archive`.
The files and the states are on the [Spec-Store](Spec-Store) page.

## Evals

`just eval` runs `claude plugin eval` on the suite in `plugins/dotclaude/evals/`.
It tests the checkout, and not the installed copy.
`--max-cost-usd 5` bounds its cost.
A lock stops a second run while one is in progress.
The suite format and the results are on the [Evals](Evals) page.

## Continuous Integration

The workflows are in `.github/workflows/`.

- `ci.yml` runs on each push and each pull request.
  Its `check` job runs `just ci` on Ubuntu, macOS, and Windows.
  It installs `Bun` from `package.json`, `just` 1.58.0, and Claude Code 2.1.296.
  Its `all-green` job is the one to require in branch protection.
- `claude.yml` answers an `@claude` mention in an issue, a review comment, or a review, with `anthropics/claude-code-action`.
  It answers only users with write access to the repository.
  It needs the `CLAUDE_CODE_OAUTH_TOKEN` secret and the Claude GitHub App.
  Its steps skip when the secret is empty, so a fork has no failed run.
- `eval-new-claude-code.yml` runs `just eval` each day at 06:00 UTC, and from `workflow_dispatch`.
  It never runs on a pull request.
  It runs the evals for a release tag of `anthropics/claude-code` that is higher than the version in `ci.yml`.
  It marks each tag after the run, so each tag runs one time.
  Set the input `force` to run a marked tag again.
  A failed eval fails the run.
  Then fix the plugin, and set the version in `ci.yml` to the new release.

## Releases

1. Add each change under the `## [Unreleased]` heading of `CHANGELOG.md`.
   `just bump` fails when that heading is missing.
2. Preview the bump, then bump the version.
   The level is `major`, `minor`, `patch`, or `X.Y.Z`.

   ```bash
   just bump minor --dry-run
   just bump minor
   ```

   `just bump` changes `package.json` and the `[Unreleased]` lines of `CHANGELOG.md`.
3. Copy the version to each `plugin.json`, then commit the result.

   ```bash
   just generate
   ```

   Commit before you tag.
   `claude plugin tag` checks that each `plugin.json` agrees with its marketplace entry.
   It stops on a dirty working tree.
4. Preview the tags, then tag and push.

   ```bash
   just release --dry-run
   just release
   ```

- `just bump` moves the `[Unreleased]` entries under a dated heading.
- `just release` runs `claude plugin tag` on each plugin under `plugins/`.
  It checks all plugins before it makes a tag.
  So a bad manifest stops the release with no tag made.
- It then pushes all tags to `origin` in one atomic push.

## Wiki

1. Edit a page in `wiki/`.
   The test `tests/support/wiki-links.test.ts` checks that each link resolves.
   It also checks that each page name is unique.
   Some pages are generated from `src/wiki/`, such as [Bounds](Bounds).
   Edit the source there, then run `just generate`.
2. Run `just wiki` to publish the folder to the GitHub wiki.

> **Note:** The wiki repository exists only after the first page is made in the GitHub web UI.

## Related Pages

- [Sandbox](Sandbox) explains the separate config.
- [Plugin-Layout](Plugin-Layout) maps the folders of each plugin.
- [Hook Events](Hook-Events) lists the hook events.
- [Design](Design) gives the design principles.
- [Decisions](Decisions) lists the decisions in force.
