# Development Release

This page shows how the types work, what CI runs, how to make a release, and how to publish the wiki.
Read [Development](Development) first.

## Types

- The root `tsconfig.json` gives an editor the types of the hooks module.
  It extends `plugins/claudetto/tsconfig.json`.
- Claude Code writes the `.claude-plugin/types/` folders and a `tsconfig.json` when an interactive session loads a plugin from your checkout, such as in `just sandbox`.
  Git ignores these files.
  `just check` needs them, and CI does not.
- A session with `-p` does not write the types.
  So a new clone gets them only from an interactive session.
- A linked worktree has no types.
  `just typecheck` runs `tools/types.ts`, which copies the missing folders from the main worktree.
  When `plugins/claudetto/.claude-plugin/types/tsconfig.json` is still missing, the script stops and tells you to start an interactive session.
- Claude Code writes the types again at each load, from the tools of that session.
  So a test gives no field that only some sessions have.

## Continuous Integration

The workflows are in `.github/workflows/`.

| Workflow | When it runs | What it does |
| --- | --- | --- |
| `ci.yml` | Each push and pull request | The `check` job runs `just ci` on Ubuntu and macOS, with `Bun` from `package.json`, `just` 1.58.0, and Claude Code 2.1.305. Require the `all-green` job in branch protection |
| `claude.yml` | An `@claude` mention in an issue, review comment, or review | Answers with `anthropics/claude-code-action`, only for users with write access. It needs the `CLAUDE_CODE_OAUTH_TOKEN` secret and the Claude GitHub App. Its steps skip when the secret is empty, so a fork has no failed run |
| `eval-new-claude-code.yml` | Each day at 06:00 UTC, and `workflow_dispatch`. Never on a pull request | Runs `just eval` for each release tag of `anthropics/claude-code` that is higher than the version in `ci.yml`. A cache entry marks each tag, so it runs once. Set the input `force` to run a marked tag again |

When an eval fails, fix the plugin, then set the version in `ci.yml` to the new release.

## Evals

`just eval --model M` runs `claude plugin eval` on the suite in `plugins/claudetto/evals/`.
It tests the checkout, not the installed copy.
`--max-cost-usd 5` (`EVAL_MAX_COST_USD`) bounds the cost.
The recipe needs `--model`, such as `--model haiku`, because otherwise the eval uses the session model.
A lock stops a second run.
Ask the owner of the repository before each new paid run.
See [Evals](Evals).

## Releases

1. Add each change to `CHANGELOG.md`.
   When the version in `package.json` has no tag yet, add the change under the heading of that version.
   Otherwise add it under `## [Unreleased]`.
   `just bump` fails when that heading is missing.
2. Preview the bump, then bump.
   The level is `major`, `minor`, `patch`, or `X.Y.Z`.

   ```bash
   just bump minor --dry-run
   just bump minor
   ```

   `just bump` changes the `version` line of `package.json` and two lines of `CHANGELOG.md`.
   It moves the `[Unreleased]` entries under a dated heading.
3. Copy the version to each `plugin.json`, then commit.

   ```bash
   just generate
   ```

   Commit before you tag.
   `claude plugin tag` checks that each `plugin.json` agrees with its marketplace entry, and it stops on a dirty tree.
4. Run `just release-check CHANGE`, with the name of the change folder under `openspec/changes/`.
   It fails while a row of `findings.md` has a `Task` that is not `none`, `done`, or `(checked)`.
5. Preview the tags, then tag and push.

   ```bash
   just release --dry-run
   just release
   ```

`just release` checks the tree, the generated files, and the tag names of all plugins before it tags.
So a bad manifest stops the release with no tag made.
It then pushes all tags to `origin` in one atomic push.
When a tag step or the push fails, it deletes the tags it made.
The notes of each release are in [Release History](Release-History).

## Wiki

1. Edit a page in `src/wiki/`.
   `just generate` writes `wiki/` from it.
   Do not edit `wiki/` by hand.
   `tests/support/wiki-links.test.ts` checks that each link resolves and each page name is unique.
2. Run `just wiki` to publish `wiki/` to the GitHub wiki.

The wiki repository exists only after the first page is made in the GitHub web UI.

## See Also

- [Development](Development)
- [Release History](Release-History)
- [Evals](Evals)
