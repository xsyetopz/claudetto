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
- The `dotclaude-spec` commands `ready` and `merge` do two steps of `/ship` with no model call.
  `ready <id>` prints the packages that can start, with no overlap of `owns` between them, and `merge <package> <branch>` needs the package in `review`, commits the lane files, merges the branch, runs `just generate`, sets the lane `done`, and commits `plugins/` with the lane files.
  `lane` also sets the checkbox of the package line in `packages.md`, `validate` reports a checkbox that does not agree with the lane, and `record` writes the empty sections of a hotfix record.
- The `spec` slice moves the lane of a package with no model call.
  An `agent.spawn` hook runs `dotclaude-spec lane <package> doing` when `/ship` starts the `implementer` of the package, and a `turn.complete` hook runs `lane <package> review` when that subagent ends.
  The hooks find the package in the `id:` line of the brief in the prompt, and run in the main session, where `lane` works.
- The plugin `dotclaude-sessions` answers the typed commands `/dotclaude-sessions:usage` and `/start-cost` with a `command.run` hook.
  The hook runs the CLI and shows its output with no model turn.
  Arguments that need a shell go to the skill.

### Changed

- The spec store keeps its lane changes in an append-only `events.jsonl`, one line for each change, in place of `state.json`.
  The lane of a package is its last line, and `.gitattributes` sets `merge=union` so two branches merge with no conflict.
  The store no longer names the handoff file.
- The `drift` command of `dotclaude-setup` reports a rule file in `.claude/rules/` whose `paths` front matter does not parse, whose braces expand over 1000 patterns, or whose glob matches no tracked file.
  The `trim` slice lists the rules with no `paths` as a source of context at the start of a session.
- The spec store takes the packages of a change from its package files.
  A package with a file and no line in `events.jsonl` is `planned` for `lane`, `status`, `next`, `validate`, and the status line.
- The `lib/` and `features/` files of each plugin are TypeScript (`.ts`), and `bun check` type-checks them with `noUncheckedIndexedAccess`.
- The core hooks module is `hooks/register.ts`.
  The check that denies a `Bash` command that only prints a file runs in its `tool.call` hook, and the checks that ask before an edit run in its `tool.check` hook.
  So a `Bash`, `Write`, or `Edit` call no longer starts a Bun process for these checks.
- The print check denies a print of a file over 4 MiB by its size, because the hooks module cannot read a file that large.
- The classic `PostToolUse` context hook is at `hooks/PostToolUse/context.ts`.
- The add-on step of `setup` checks the Bun version for `dotclaude-sessions` and `dotclaude-lab`, and names Bun 1.4.3 when it is older.
  It checked Node.js 22.18 before, but the bins of these plugins run on Bun.
- The write ask for code in another language, such as `ruby -e` or `python3 -c`, counts a path that the code names only when the same code has a write word (`File.write`, `json.dump`, `os.remove`, an open mode `"w"`, or a `>` redirect).
  A command such as `ruby -e 'YAML.load_file(".github/workflows/check.yml")'` that only reads the path no longer asks.
- The `asks` slice never asks for a read.
  A change to a protected file asks unless every changed part is on the safe list of its kind.
  The protected kinds are a test file, a limits file, a lint config, a runner config, a CI file, a hook file, and a settings file.
  The safe parts are a format change, a comment change, a move with the same content, a new file, and an added check.
  An added check is an added test, a stricter rule, an added step, job, or hook, an added `deny` or `ask` rule, or a removed `allow` rule.
  Every other change asks, also a changed `model`, an added `env` key, a key that the code does not know, and a line that follows the last command of a hook script.
  A shell edit in place, such as `sed -i`, of a protected file asks, because the text after the edit is not known before the command runs.

### Removed

- The classic `PreToolUse` hooks of the core plugin (`features/reads/cli` and `features/adherence/cli`).
  The hooks module does their checks.

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
