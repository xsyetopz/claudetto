# Development

This page is for contributors.
It shows the commands, the layout rules, and the steps to test, release, and publish a change.

## Before you begin

- Install Node.js 22.18 or later (`.node-version` names the version of CI), [pnpm](https://pnpm.io), and `just`.
- Run `pnpm install`.
  It installs the pinned Biome, markdownlint-cli2, and TypeScript from `pnpm-lock.yaml`.
- Install Claude Code 2.1.296 or later.
  `just validate`, `just lab`, `just update`, and `just release` call the `claude` CLI.
- Run each command in the repository root.

## Commands

| Command | What it does |
| --- | --- |
| `just test` | Runs `node --test` on `tests/**/*.test.mjs`. Arguments name the test files to run in place of all of them. |
| `just lint` | Runs `pnpm run lint` (Biome) and `pnpm run lint:md` (markdownlint-cli2). |
| `just typecheck` | Runs `pnpm run typecheck` (`tsc --noEmit -p tsconfig.json`). It checks the lab tests `plugins/*/tests/*.test.ts` and `plugins/dotclaude/hooks/register.mjs` with what it imports. The `.mjs` files use JSDoc types, and `any` is not allowed. |
| `just validate` | Runs `pnpm run validate`, which checks the manifests, skills, and agents. |
| `just lab` | Runs `claude plugin test` on each plugin that has a `tests/` folder, the hook lab. |
| `just check` | Runs lint, typecheck, test, validate, and lab. It must pass before you call a change done. |
| `just ci` | Runs lint, test, validate, and lab: the gate of the CI `check` job. CI has no type check, because Claude Code writes `.claude-plugin/types/` only when an interactive session loads the plugin. |
| `just sandbox` | Runs Claude Code with this checkout as its plugin, in its own config. See [Sandbox](Sandbox). |
| `just sandbox-clean` | Removes the sandbox. |
| `just usage` | Shows where your Claude Code usage went. Add `--days N` or `--json`. |
| `just update` | Updates the marketplace, then each plugin under `plugins/` that you installed. Restart Claude Code after it. |
| `just bump <level>` | Bumps the version. See [Releases](#releases). |
| `just release` | Tags each plugin and pushes the tags. See [Releases](#releases). |
| `just hook-text` | Writes the descriptions and the prompt hook texts of each `hooks.json` from the text files next to it. |
| `just measure` | Sizes the start of a session by source from a transcript, and fails above the start bounds of `tools/limits.mjs`. Arguments go to `dotclaude-start` (a `.jsonl` path, `--compare BASE OTHER`). |
| `just capture` | Logs the requests of Claude Code through a local proxy and sizes each part of the first one. Arguments go to the proxy (`--port N`, `--out DIR`, `--no-count`). |
| `just schema` | Writes the settings schemas of the installed Claude Code to `schemas/`. Arguments go to `dotclaude-schema` (`--bundle FILE`, `--version X.Y.Z`). |
| `just eval` | Runs the eval cases of the core plugin with `claude plugin eval`, on a path target so the checkout and not the installed copy is tested. `--max-cost-usd` bounds the cost, and a lock stops a second run while one is in progress. |
| `just eval-variant <ref>` | Runs the eval cases on the checkout and on a variant at a git ref (in a temporary worktree), to compare the two plugin arms. |
| `just debug-agents` | Runs one headless sandbox session with a debug log, and fails when the log names an unknown frontmatter field. |
| `just start-run` | Captures and measures the start of a clean sandbox session: send one prompt, then type `/exit`. Arguments go to the script (`--port N`, `--dir DIR`). |
| `just wiki` | Publishes `wiki/` to the GitHub wiki. |

```bash
just check                                     # must pass before you call a change done
just test tests/dotclaude/guard/rules.test.mjs # one file
just usage --days 7                            # where your usage went
pnpm run lint:md                               # lint Markdown
```

Headings and code blocks in Markdown have a 100-column bound.
Each `.md` file has at most 300 lines.

## The tests layout

| Folder | What it holds |
| --- | --- |
| `tests/` | The repository tests, with one folder for each plugin. `just test` runs them with `node --test`. |
| `plugins/<name>/tests/*.test.ts` | The hook lab tests of the plugins with a hooks module. `just lab` runs them. |
| `tools/` | The repository scripts: `bump-version.mjs`, `eval-variant.mjs`, `hook-text.mjs`, `limits.mjs`, `lock.mjs`, `measure.mjs`, `sizes.mjs`, `start-run.mjs`, and `unsandboxed.mjs`. `hook-text.mjs` writes the `description` and the `Stop` prompt of each `hooks.json` from `description.txt` and `Stop.prompt.txt` next to it. `lock.mjs` lets one eval run run at a time. `unsandboxed.mjs` stops an eval run that starts inside the Bash sandbox of Claude Code. |

### The hook lab

`just lab` loops over `plugins/*/` and runs `claude plugin test` on each plugin that has a `tests/` folder.
Each test file imports from `claude-code/testing`, loads `hooks/register.mjs`, and fires events.
It stubs the engine verdict, the environment, `session.id`, and `process.run`.
No command runs, no session starts, and no network call goes out.

| Plugin | Test file | Tests |
| --- | --- | ---: |
| `dotclaude` | `drift.test.ts` | 12 |
| `dotclaude` | `mod.test.ts` | 8 |
| `dotclaude` | `sembr.test.ts` | 12 |
| `dotclaude` | `surface.test.ts` | 17 |
| `dotclaude` | `variants.test.ts` | 6 |
| `dotclaude-browser` | `web-search.test.ts` | 19 |
| `dotclaude-jev` | `ask-user-question.test.ts` | 4 |
| `dotclaude-jev` | `second-opinion.test.ts` | 11 |

The counts are the `test(` calls of each file.
The guard tests of `mod.test.ts` include:

- A deny of the engine stays a deny.
- The first call to a repository of another owner with a policy asks once.
- A repository of the user, or one with no policy, keeps the verdict.

## Layout rules

| Rule | Meaning |
| --- | --- |
| One owner for each number | `plugins/dotclaude/lib/budget.mjs` holds the shared runtime bounds, `features/<name>/limits.mjs` the bounds of one feature, and `tools/limits.mjs` the repository bounds. Tests pin the copies in code and config, not in prose. |
| No copy of Claude Code | Runtime JavaScript (`plugins/`) does only the work that the latest Claude Code does not do. When Claude Code has a setting, a hook, or another extension point for a need, use it. |
| Layered imports | `plugins/dotclaude/lib/` imports only itself. A folder in `features/` imports only `lib/` and itself. The entry points (`hooks/register.mjs`, `features/*/cli.mjs`, and the skill scripts) import `lib/` and features. |
| Guards get strings | The tests give commands to the guards as strings, and never run a guarded command. |
| No patch of Claude Code | Never patch the CLI binary or its npm package. Reading the bundle for evidence is allowed. |

*Why:* a number with two owners drifts, and the drift shows up as two bounds that disagree.
Layered imports keep the start of each hook small and its failure local.
A test that runs a destructive command can do the damage that the guard exists to stop.
See the design principles on the [Design](Design) page.

The removed `dotclaude-modder` plugin is in git history at commit `5cf4cb4`, in `plugins/dotclaude-modder/`.
You can restore its skills and the `um` command from there as a base for your own plugin.

## Types

- The root `tsconfig.json` gives an editor the types of the Claude Code hooks module.
  It extends `plugins/dotclaude/.claude-plugin/types/tsconfig.json`.
- Claude Code writes that folder when it loads the plugin from your checkout, for example in `just sandbox`.
- Git ignores the folder.
  `dotclaude`, `dotclaude-browser`, and `dotclaude-jev` each have a `tsconfig.json` that extends the types folder of their own plugin.
  The other plugins have none, because they have no hooks module.

## Test in your config

1. Run `just sandbox` to use a separate config.
   A test then does not change your own setup.
1. To try the checkout in your own config, run this command:

   ```bash
   claude --plugin-dir /path/to/dotclaude/plugins/dotclaude
   ```

## Releases

1. Add each change to the CHANGELOG under `[Unreleased]`.
1. Preview the bump.

   ```bash
   just bump minor --dry-run
   ```

1. Bump the version.
   The level is `major`, `minor`, `patch`, or `X.Y.Z`.

   ```bash
   just bump minor
   ```

1. Preview the tags.

   ```bash
   just release --dry-run
   ```

1. Tag and push.

   ```bash
   just release
   ```

- `just bump` sets one version in the manifests, and it moves the `[Unreleased]` CHANGELOG entries under a dated heading.
- `just release` runs `claude plugin tag` on each plugin under `plugins/` at `HEAD`.
- It checks all plugins before it makes a tag, so a bad manifest stops the release with no tag made.
- It then pushes all tags to `origin` in one atomic push.
- Before 1.0, a release can change or remove behavior without a compatibility layer.

## Wiki

1. Change a page in `wiki/`.
   A change goes through a pull request, like a code change.
1. Publish the folder to the GitHub wiki.

   ```bash
   just wiki
   ```

> **Note:** The wiki repository exists only after the first page is made in the GitHub web UI.

## Evals

0.27.0 removed the behavior evals and `just eval-agent`.
0.28.0 removed the Bun harness and the root `evals/` folder.
`just eval` now wraps `claude plugin eval` and runs the suite in `plugins/dotclaude/evals/`.
The suite format is now the one of `claude plugin eval` ([Evals](Evals)).
The old results are on the [Eval history](Evals-History) page.

## Next steps

- [Sandbox](Sandbox) tells how to test in a separate config.
- [Design](Design) gives the design principles.
