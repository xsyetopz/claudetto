# Changelog

This file records the notable changes to this project.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and the versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).
Before 1.0.0, a release can change or remove behavior.
After each update, do the steps in the "Update" section of the README.
The [Release History](https://github.com/xsyetopz/dotclaude/wiki/Release-History) page of the wiki has the notes of older releases.

## [Unreleased]

### Added

- The `handoff` slice of the core plugin ports the handoff of 0.28.0 to the hooks module and a CLI `dotclaude-handoff`.
  The handoff file goes to `.dotclaude/handoff/`.
  The `/handoff` skill names the file, and the `turn.complete` hook runs `/clear` and the resume prompt.
  The option `mainHandover` is `manual` by default, and it takes `auto` and `off`.
  A `tool.call` hook adds a report-now note to a subagent that nears its context bound or its `maxTurns`.
  The `turn.complete` hook runs the resume only after an `answer` turn, waits at most `HANDOFF_WAIT_TURNS` turns for the file, submits the write prompt once more, and then gives the `manual` hint.
  A `dotclaude-spec merge` also counts as a package that is done, and quoted text does not.
  On one session, a handoff against a compaction of the same session cost $0.0630 against $0.2288, took 9.1 s against 23.2 s, and left 18,487 tokens of context at the last call against 28,418 at the first call of the follow-up.
  Each side is one run.
  The measurement is in `.dotclaude/spec/changes/1.0.0/evidence/handoff-cost.md`.
- The `dotclaude-spec` commands `ready` and `merge` do two steps of `/ship` with no model call.
  `ready <id>` prints the packages that can start, with no overlap of `owns` between them, and `merge <package> <branch>` needs the package in `review`, commits the lane files, merges the branch, runs `just generate`, sets the lane `done`, and commits `plugins/` with the lane files.
  `lane` also sets the checkbox of the package line in `packages.md`, `validate` reports a checkbox that does not agree with the lane, and `record` writes the empty sections of a hotfix record.
- The `spec` slice moves the lane of a package with no model call.
  An `agent.spawn` hook runs `dotclaude-spec lane <package> doing` when `/ship` starts the `implementer` of the package, and a `turn.complete` hook runs `lane <package> review` when that subagent ends.
  The hooks find the package in the `id:` line of the brief in the prompt, and run in the main session, where `lane` works.
- The plugin `dotclaude-sessions` answers the typed commands `/dotclaude-sessions:usage` and `/start-cost` with a `command.run` hook.
  The hook runs the CLI and shows its output with no model turn.
  Arguments that need a shell go to the skill.
- The CLI `dotclaude-run-checks` of the new `checks` slice runs a batch of check commands in order, with no model turn.
  For each command it prints the exit status, the time, the counts of passed, failed, and skipped tests (`bun test`, `vitest`, `jest`, `pytest`, `cargo test`, `go test`), and the failure lines.
  The full output goes to a log file in `.dotclaude/checks/`, and the exit status is 1 when any command fails.
  A command of plain words runs with no shell, and a command with shell syntax runs through `sh -c`.
- The workflow `claude.yml` answers an `@claude` mention with `anthropics/claude-code-action`.
- The workflow `eval-new-claude-code.yml` runs `just eval` one time for each release of `anthropics/claude-code` that is higher than the version of `ci.yml`.
  Both workflows need the secret `CLAUDE_CODE_OAUTH_TOKEN`, and they skip when it is empty.
- The `handoff` slice gives a subagent a report note at 4 turns left.
  The note tells the subagent to commit its work first, and then to report.
  In a subagent, the `guard` hook denies a git command that changes the shared checkout or `refs/stash` (`git.shared-checkout`).
- The `/ship` skill runs one `reviewer` on the diff of each package, with no implementer report.
  Each wave starts with `dotclaude-spec runs`.
  It counts the runs against the tier cap that `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` sets, and against the `five_hour` and `seven_day` windows.
  The status line writes `.dotclaude/rate-limits.json` atomically.
- The `dotclaude-setup settings --apply` command writes `autoMode.hard_deny` rules to the user settings only.
  The rules come from the catalog in `src/kernel/policy/`, and `$defaults` stays in place.
  The command puts `system.privilege` in `soft_deny`.
- The `guard` hook denies the literal destructive forms of git, the system, and the disk in every session.
  A stopped agent stops, and it asks the user to run the exact command with `!`.
- The shared prompt names `dotclaude-run-checks`, and it tells the agent to quote each command.
  The CLI exits 2 when an argument starts with `-`.
  The summary of a passing command shows its output when the output has at most 10 lines.
- The `decide` slice of the core plugin asks Jev for each decision that facts settle.
  The CLI `dotclaude-decide` calls the TypeSafe API.
  When the TypeSafe client fails, for example with no key, an invalid key, or no balance, the decision goes to a small Claude model through `$.model.complete`.
- The `prompt` slice gives each model its own system prompt variant.
  It adds a block to the end of each subagent task prompt, and it sends a `context_management` section without compaction.
- The `surface` slice shortens the descriptions of the tools `Agent`, `Bash`, `ListAgents`, and `Read`.
  It drops some built-in agent types from the agent listing and from dispatch.
- The `sembr` slice rewrites a Markdown file on `Write` and `Edit`, so each sentence starts on its own line.
  In `Bash`, it rewrites the quoted text of `git commit` and `gh pr create` in the same way.
- The output style `dotclaude:Concise` is based on the built-in Concise style.
- The core plugin has the skills `/setup`, `/spec`, `/hotfix`, `/ship`, `/handoff`, and `/rules-creator`.
  `/rules-creator` writes the rule files of `.claude/rules/`, with `paths` globs.
- The `setup` slice reads the account type from `claude auth status --json`.
  Pro is the baseline, and Max 5x and Max 20x get more parallel subagents and a higher effort.
- The `setup` slice writes `autoMode` to the user settings, with `$defaults` in each list.
  The `autoMode.allow` list lets the classifier run the removal of agent worktrees and of the Claude Code temp folder.
- The `trim` slice turns off 10 built-in parts that no slice of dotclaude uses.
  Each part has its env var or settings key.
- The `stamp` slice of the core plugin appends the dotclaude version and the short build SHA to each session at its start, as a `system` notice.
  The SHA comes from `installed_plugins.json`, or from `git` when the plugin root is a dotclaude checkout, else it is `unknown`.
  The notice costs no model token.
- The `dotclaude-usage` report shows the build of each session, and the cost of each build.
  A session with no stamp row shows `unknown`.

### Changed

- The spec store keeps its lane changes in an append-only `events.jsonl`, one line for each change, in place of `state.json`.
  The lane of a package is its last line, and `.gitattributes` sets `merge=union` so two branches merge with no conflict.
  The store no longer names the handoff file.
- The `drift` command of `dotclaude-setup` reports a rule file in `.claude/rules/` whose `paths` front matter does not parse, whose braces expand over 1000 patterns, or whose glob matches no tracked file.
  The `trim` slice lists the rules with no `paths` as a source of context at the start of a session.
- The spec store takes the packages of a change from its package files.
  A package with a file and no line in `events.jsonl` is `planned` for `lane`, `status`, `next`, `validate`, and the status line.
- The `slices/` and `kernel/` files of each plugin are TypeScript (`.ts`), and `bun check` type-checks them with `noUncheckedIndexedAccess`.
- The core hooks module is `hooks/register.ts`.
  The check that denies a `Bash` command that only prints a file runs in its `tool.call` hook, and the checks that ask before an edit run in its `tool.check` hook.
  So a `Bash`, `Write`, or `Edit` call no longer starts a Bun process for these checks.
- The print check denies a print of a file over 4 MiB by its size, because the hooks module cannot read a file that large.
- The add-on step of `setup` checks the Bun version for `dotclaude-sessions` and `dotclaude-lab`, and names Bun 1.4.3 when it is older.
  It checked Node.js 22.18 before, but the bins of these plugins run on Bun.
- The write ask for code in another language, such as `ruby -e` or `python3 -c`, counts a path that the code names only when the same code has a write word (`File.write`, `json.dump`, `os.remove`, an open mode `"w"`, or a `>` redirect).
  A command such as `ruby -e 'YAML.load_file(".github/workflows/check.yml")'` that only reads the path no longer asks.
- The `asks` slice never asks for a read.
  A new file gets no ask.
  A change to a protected file asks unless every changed part is on the safe list of its kind.
  The safe list of each kind is:
  - A test file: a format or comment change, a move of lines, a rename of a test title, and an added line that holds no control flow, skip, focus, timeout, or hidden test.
  - A limits file: a change that keeps every bound and changes no other code.
  - A lint config or a runner config: a format or comment change, a move with the same content, an added key with the strictest value, an added entry in a list of rules or files, a raised level or threshold, and a strict flag that goes to `true`.
    A new `select`, `include`, or `only` key asks.
    A config in JavaScript or TypeScript gets the same check on its tokens.
  - A CI file: a format or comment change, a move of lines, a change of a `name` key, and an added step or job with no risky key or failure-hiding command.
  - A hook file: a format change, an added hook, and a change of `description`.
  - A hook script: a format or comment change, an added blank line or comment, a stricter `set` line in a shell script, and a `"use strict"` line in a JavaScript or TypeScript file.
  - A settings file: a format change, an added `deny` or `ask` rule, a removed `allow` rule, and a plugin that goes on in `enabledPlugins`.
  Every other change asks.
  A format that the code cannot read asks.
  A shell edit in place, such as `sed -i`, of a protected file asks, because the text after the edit is not known before the command runs.
- The status line is rebuilt.
  It shows numbers and Unicode icons, a color scale, and a change segment with the count of done packages.
  `NO_COLOR` turns off the colors and keeps the icons.
- The settings snippet lists its top-level keys in the property order of the settings schema.
  The keys of `env` are in alphabetical order.
- The core plugin has six agents: `debugger`, `implementer`, `investigator`, `planner`, `researcher`, and `reviewer`.
  Each agent file sets its own model and effort.
- dotclaude writes its own files to `.dotclaude/`.
  The `setup` slice adds the runtime paths of `.claude/` that git does not ignore to `.git/info/exclude`.
- dotclaude uses the worktrees of Claude Code.
  No file in `src/` runs `git worktree add`.
- The `dotclaude-usage` report prices each call by the model version, from the pricing page of 2026-10-13.
  It adds the Mythos models and the two prompt tiers of Haiku 5.5, and the cache read of Sonnet 5.5 is $0.10.
  A version that is not in the table gets the prices of the newest version of its family.

### Removed

- The `test-runner` agent of the core plugin.
  The CLI `dotclaude-run-checks`, run through `Bash`, replaces it.
- The classic `PreToolUse` hooks of the core plugin, in the `guard` and `surface` slices.
  The hooks module does their checks.
- The OpenSpec workflow, with the `openspec/` folder and its skills.
  The spec store and the `/spec` skill replace it.
- The add-on `dotclaude-jev`.
  Its decisions go to the `decide` slice of the core plugin.

## Older Releases

| Series | Releases |
| --- | --- |
| [0.28](https://github.com/xsyetopz/dotclaude/wiki/Release-0.28) | 0.28.0 |
| [0.27](https://github.com/xsyetopz/dotclaude/wiki/Release-0.27) | 0.27.0 |
| [0.26](https://github.com/xsyetopz/dotclaude/wiki/Release-0.26) | 0.26.0 |
| [0.25](https://github.com/xsyetopz/dotclaude/wiki/Release-0.25) | 0.25.1, 0.25.0 |
| [0.24](https://github.com/xsyetopz/dotclaude/wiki/Release-0.24) | 0.24.0 |
| [0.23](https://github.com/xsyetopz/dotclaude/wiki/Release-0.23) | 0.23.2, 0.23.1, 0.23.0 |
| [0.22](https://github.com/xsyetopz/dotclaude/wiki/Release-0.22) | 0.22.3, 0.22.2, 0.22.1, 0.22.0 |
| [0.21](https://github.com/xsyetopz/dotclaude/wiki/Release-0.21) | 0.21.0 |
| [0.20](https://github.com/xsyetopz/dotclaude/wiki/Release-0.20) | 0.20.8, 0.20.7, 0.20.6, 0.20.5, 0.20.4, 0.20.3, 0.20.2, 0.20.1, 0.20.0 |
| [0.19](https://github.com/xsyetopz/dotclaude/wiki/Release-0.19) | 0.19.1, 0.19.0 |
| [0.18](https://github.com/xsyetopz/dotclaude/wiki/Release-0.18) | 0.18.1, 0.18.0 |
| [0.17](https://github.com/xsyetopz/dotclaude/wiki/Release-0.17) | 0.17.1, 0.17.0 |
| [0.16](https://github.com/xsyetopz/dotclaude/wiki/Release-0.16) | 0.16.1, 0.16.0 |
| [0.15](https://github.com/xsyetopz/dotclaude/wiki/Release-0.15) | 0.15.1, 0.15.0 |
| [0.14](https://github.com/xsyetopz/dotclaude/wiki/Release-0.14) | 0.14.1, 0.14.0 |
| [0.13](https://github.com/xsyetopz/dotclaude/wiki/Release-0.13) | 0.13.1, 0.13.0 |
| [0.12](https://github.com/xsyetopz/dotclaude/wiki/Release-0.12) | 0.12.1, 0.12.0 |
| [0.11](https://github.com/xsyetopz/dotclaude/wiki/Release-0.11) | 0.11.1, 0.11.0 |
| [0.10](https://github.com/xsyetopz/dotclaude/wiki/Release-0.10) | 0.10.2, 0.10.1, 0.10.0 |
| [0.9](https://github.com/xsyetopz/dotclaude/wiki/Release-0.9) | 0.9.0 |
| [0.8](https://github.com/xsyetopz/dotclaude/wiki/Release-0.8) | 0.8.2, 0.8.1, 0.8.0 |
| [0.7](https://github.com/xsyetopz/dotclaude/wiki/Release-0.7) | 0.7.0 |
| [0.6](https://github.com/xsyetopz/dotclaude/wiki/Release-0.6) | 0.6.2, 0.6.1, 0.6.0 |
| [0.5](https://github.com/xsyetopz/dotclaude/wiki/Release-0.5) | 0.5.1, 0.5.0 |
| [0.4](https://github.com/xsyetopz/dotclaude/wiki/Release-0.4) | 0.4.0 |
| [0.3](https://github.com/xsyetopz/dotclaude/wiki/Release-0.3) | 0.3.0 |
| [0.1 and 0.2](https://github.com/xsyetopz/dotclaude/wiki/Release-0.1-0.2) | 0.2.0, 0.1.0 |

[unreleased]:
  https://github.com/xsyetopz/dotclaude/compare/dotclaude--v0.28.0...HEAD
