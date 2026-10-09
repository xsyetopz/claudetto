# Auto-fix

The auto-fix hook lets the formatters and linters of your project fix the files that Claude edits.
Claude then spends context only on the issues that no tool can fix.
The hook has two parts, both in `plugins/dotclaude/features/autofix/cli.mjs`.

## Off by default

Auto-fix is off until you turn it on.
Hook commands run outside the Bash sandbox.
A project tool can load a config file, such as `eslint.config.js`, and that file runs with full network and file access.
A prompt-injected model could write such a file.
For this reason both parts exit at once, print nothing, and run nothing, unless `env.DOTCLAUDE_AUTOFIX` is `1`.

`/dotclaude:setup` asks "Turn on auto-fix?" and states this risk in the question.
On yes, it runs `settings.mjs --with autofix`, which writes `env.DOTCLAUDE_AUTOFIX=1` to the settings file that you picked.
To turn auto-fix off again, remove that entry.
The switch is a settings `env` entry because a `hooks.json` entry cannot be turned off by a setting, and setup cannot write a `userConfig` option.

## How it works

| Event | Matcher | What the hook does |
| --- | --- | --- |
| `PostToolUse` | `Edit`, `Write`, `MultiEdit`, `NotebookEdit` | Appends the path of the edited file to a session file in the temp folder. It changes no file. |
| `Stop` | none | Runs each detected tool on the recorded files, one time, and removes the session file. |

A fix between two edits could change a region that the next `old_string` must match.
For this reason the hook fixes at `Stop`, in one batch.
On Claude Code 2.1.293 a changed file does not make the next `Edit` fail, but Claude Code warns the model to read a changed region again.
The hook also costs less at `Stop`, because it runs one time and not after each edit.
The release notes of 2.1.295 say that `Edit` no longer treats a file as fully read when its contents changed and its modification time did not advance.
The measure above was not repeated on 2.1.295.

## Which files and tools

- The hook fixes only files that Claude edited in the turn and that are in the project folder.
- It skips `node_modules`, `.git`, `vendor`, `dist`, `build`, `target`, `coverage`, `.venv`, `venv`, `__pycache__`, and `.next`.
- It runs a tool only when the project has a config file of the tool or a local binary of the tool.
- It prefers a local binary in `node_modules/.bin`, `.venv/bin`, or `venv/bin` to a binary on `PATH`.
- It does not install a tool, it runs no shell, and it runs no `package.json` script.
- It passes the file paths after `--`, except for `markdownlint-cli2`, which has no `--` form.

## Detection table

The table is in `plugins/dotclaude/features/autofix/data.mjs`.
A file goes to the first detected tool of a group, so Biome takes a file before Prettier.

| Tool | Files | Config files |
| --- | --- | --- |
| Biome | `js`, `jsx`, `ts`, `tsx`, `mjs`, `cjs`, `mts`, `cts`, `json`, `jsonc`, `css` | `biome.json`, `biome.jsonc` |
| Prettier | the web files above, `scss`, `html`, `yaml`, `yml`, `md`, `mdx` | `.prettierrc*`, `prettier.config.*` |
| ESLint | `js`, `jsx`, `ts`, `tsx`, `mjs`, `cjs`, `mts`, `cts` | `eslint.config.*`, `.eslintrc*` |
| Ruff | `py`, `pyi` | `ruff.toml`, `.ruff.toml`, `pyproject.toml` with a `[tool.ruff` table |
| rustfmt | `rs` | `rustfmt.toml`, `.rustfmt.toml`, `Cargo.toml` |
| gofmt | `go` | `go.mod` |
| clang-format | `c`, `h`, `cc`, `cpp`, `cxx`, `hpp`, `hh`, `m`, `mm` | `.clang-format`, `_clang-format` |
| shfmt | `sh`, `bash` | `.editorconfig` |
| markdownlint-cli2 | `md`, `mdx` | `.markdownlint*`, `.markdownlint-cli2.*` |

The table has no row for line breaks.
The `sembr` formatter fixes line breaks before the write, so that no later fix changes the file.

## What Claude sees

- When the tools fix all issues, Claude gets no text.
- When issues remain, the hook blocks the stop one time.
  The block has at most 20 lines: a short header, and the lines `file:line rule`.
  When more issues remain, the last line gives the count that is not shown.
- The hook returns at once when `stop_hook_active` is true, so it never blocks a second time in a turn.
- A tool that is missing, fails to start, or passes its time limit gives no text, and Claude stops.
  One tool run has 20 seconds, and all runs of a stop have 45 seconds.

The bounds are in `plugins/dotclaude/features/autofix/limits.mjs`.
A test pins the `timeout` of the `Stop` hook in `hooks/hooks.json` to them.
