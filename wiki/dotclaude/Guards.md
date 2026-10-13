# Guards

This page describes the `guard` and `asks` slices of the core plugin `dotclaude`.
It is for a contributor who edits a guard rule, or a user who wants to know why Claude asks or stops a call.
The slices ask or deny a tool call in three cases.
The call would discard work, reach a repository with an AI policy, or print a file with a `Bash` command.

## What It Does

A session has three layers that guard a call.
The layers are the permission rules, the sandbox, and the hook module.

- Permission rules are the `permissions` keys of the settings snippet.
  Claude Code reads them, not the plugin.
  A plugin cannot set `permissions`.
  So you copy them with `dotclaude-setup settings`.
  Their source is the `permissions` object of `src/plugins/dotclaude/slices/prompt/slice.ts`.
- The sandbox runs `Bash` commands in the Claude Code sandbox.
  The `prompt` slice in the same file also sets the `sandbox` key.
- The hook module `hooks/register.ts` covers the cases that a rule cannot match.
  The `guard` and `asks` slices supply these hooks.

The hook module never weakens a rule of the user.
The `guard` slice asks, or it keeps a deny of the engine.
It does not allow a call that the engine denies.

## How It Works

### The `guard` Slice

The manifest is `src/plugins/dotclaude/slices/guard/slice.ts`.
It has two mod handlers.

| Event | Phase | Handler | Filter |
| --- | --- | --- | --- |
| `tool.call` | `check` | `onBashCall` in `slices/guard/adapters/mod.ts` | none |
| `tool.check` | `check` | `onCheck` in `slices/guard/adapters/mod.ts` | none |

The generated `plugins/dotclaude/hooks/register.ts` calls `on("tool.call", h4)` and `on("tool.check", h5)` for them.

#### The Destructive Floor

`onBashCall` ignores each call that is not `Bash`.
For a `Bash` call, `guardReason` in `slices/guard/domain/guard.ts` walks each simple command with `walk.ts`.
It runs each matcher from `MATCHERS` in `domain/matchers/index.ts`.
The matchers are the `git.ts` and `system.ts` matchers of `domain/matchers/`.
The first matcher that matches gives the deny reason from `domain/reason.ts`.

The tier of each matcher comes from the rule catalog in `src/kernel/policy/`.
The catalog has one file for each category: `rules/git.ts`, `rules/system.ts`, `rules/database.ts`, `rules/cloud.ts`, and `rules/backups.ts`.
`tierOf` in `domain/matchers/index.ts` gives `subagent` for a rule that the catalog marks `subagent`.
It gives `floor` for each other rule.
A matcher with no catalog entry gets `floor`.
The `floor` tier applies in every session.
The `subagent` tier applies only when the call has an `agentId`.
The only `subagent` rule is `git.shared-checkout`.
It keeps a subagent out of the shared checkout and `refs/stash`.

#### The Print Deny

A `Bash` command that prints one file is denied.
This applies also when the print is one part of a compound command.
The deny names the `Read` call with the same range.
`printsOf` in `domain/reads.ts` finds the print forms.
`printReason` in `domain/deny.ts` counts the lines of the file with `countOf` in `adapters/mod.ts`.
A file over `READ_MAX_BYTES` gives an infinite count.
So the print is denied by its size.
`READ_MAX_BYTES` is `4 * 1024 * 1024` in `slices/guard/limits.ts`.
The `sembr` slice rewrites a `Write` or `Edit` before this check runs.
So the deny checks the command that would run.

#### The AI Policy Ask

`onCheck` calls `next` first.
A deny of the engine stays a deny.
Then `askReason` in `domain/owners.ts` reads each GitHub repository in the tool input.
It asks only once for each repository in each session.
The `checked` map in `adapters/mod.ts` keeps this record.
The ask applies when the repository has another owner than the user.
The user is the login and the organizations from `gh`.
Each `gh` call has `POLICY_TIMEOUT_MS`, which is `5_000` in `src/kernel/budget.ts`.
The ask applies when the repository has one of the policy files in `POLICY_FILES`: `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md`.
Each file text is cut at `POLICY_FILE_MAX_CHARS`, which is `2_000` in `src/kernel/budget.ts`.
A failed `gh` call runs again at the next check.

The guard adds its ask before the ask of `next`.
So the ask of another slice stays.

#### Failure Behavior

The adapter has no catch-all on purpose.
When a handler throws after `next` resolves, Claude Code logs the failure.
The verdict of the engine stands.
When a handler throws before `next`, Claude Code skips the hook, and the call runs.
A path that `stat` cannot find gives `missing`.
Any other `stat` error counts as a folder.
So no matcher takes it for a file.

### The `asks` Slice

The manifest is `src/plugins/dotclaude/slices/asks/slice.ts`.
It has one handler, `onCheck` in `slices/asks/adapters/mod.ts`.
The handler listens on `tool.check` for `Bash`, `Write`, `Edit`, and `MultiEdit`.
A read never asks.
A change to a protected file asks, unless every changed part is on the safe list of its kind.
A `Bash` write to a protected file, such as `sed -i` or `tee`, asks.

The kinds of protected files are in `slices/asks/limits.ts`:

- The lint and type-check configs (`LINT_CONFIG_NAMES`).
- The check runner configs (`RUNNER_CONFIG_NAMES`).
- The `justfile` and `Makefile` recipes (`RECIPE_FILE_NAMES`).
- The CI files (`CI_FOLDERS`, `CI_GITHUB_PATHS`, `CI_NAMES`).
- The hook files (`HOOK_PATHS`, `SETTINGS_HOOK_FILES`).
- The test files (`TEST_NAMES`, `TEST_FOLDER`).

The domain code is in `slices/asks/domain/`.
It has one file for each kind of diff, such as `testdiff.ts`, `lintdiff.ts`, and `hookdiff.ts`.

The bounds of the `asks` slice are these:

| Name | Value | File |
| --- | --- | --- |
| `FILE_MAX_BYTES` | `1_000_000` | `slices/asks/limits.ts` |
| `SCAN_MAX_CHARS` | `200_000` | `slices/asks/limits.ts` |
| `ITEMS_SHOWN_MAX` | `8` | `slices/asks/limits.ts` |
| `SCRIPT_FILES_MAX` | `8` | `slices/asks/limits.ts` |
| `LINE_SHOWN_MAX_CHARS` | `80` | `slices/asks/limits.ts` |

The shell reader has its own bound, `SHELL_SCAN_MAX_CHARS`.
`src/kernel/budget.ts` sets it to `200_000`.
The reader reads only part of a longer command.
It reports the command as `truncated`.

### The Bounds of the `guard` Slice

| Name | Value | File |
| --- | --- | --- |
| `READ_MAX_BYTES` | `4 * 1024 * 1024` | `slices/guard/limits.ts` |
| `POLICY_TIMEOUT_MS` | `5_000` | `src/kernel/budget.ts` |
| `POLICY_FILE_MAX_CHARS` | `2_000` | `src/kernel/budget.ts` |

## Why

The rules of the user come first.
The hook adds an ask or a deny, and it keeps a deny of the engine.
The plugin cannot ship `permissions`.
So the rules of the destructive floor are in the settings snippet.
The hook covers what a rule cannot match.
Examples are a print of a file in a compound command, or a repository of another owner that a rule does not name.
The deny text names the exact command.
So Claude can run it or report it.

For the decisions behind each layer, see [Decisions](Decisions).

## Related Pages

- [Architecture](Architecture): the slices and the hook module.
- [Agents](Agents): the `subagent` tier and the `maxTurns` bound.
- [Settings-Snippet](Settings-Snippet): the `permissions` keys that the snippet sets.
