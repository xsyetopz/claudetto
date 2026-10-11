# Hooks

This page lists each hook of each dotclaude plugin.
A plugin registers a hook in one of two ways:

- A hooks module is a file (`hooks/register.ts`) that Claude Code runs itself, with no Bun and no Node.js.
  The `hooks.json` file names it with `modules`.
  It handles events of the mods API, such as `tool.check` and `prompt.section`.
- A classic command hook is an entry in `hooks/hooks.json` that runs a command, `bun --no-env-file <script>`, with the event JSON on stdin.
  It needs Bun 1.4.3 or later on `PATH`.

A matcher or an `if` limits when a hook runs.
Each hook fails open: on an error, a timeout, or a missing `bun`, the call goes on and the permission rules and the sandbox still apply.
No hook sets `onFailure`, so the default `continue` applies ([Guards](Guards#the-auto-mode-classifier)).
The plugins `dotclaude-docs`, `dotclaude-sessions`, and `dotclaude-lab` register no hook.

## `dotclaude`

The module is `plugins/dotclaude/hooks/register.ts`.
The classic hooks are in `plugins/dotclaude/hooks/hooks.json`.
The module sees the events below in the order that Claude Code runs them.

### Hooks module

| Event | Matcher | What it does |
| --- | --- | --- |
| `tool.check` | all tools | Asks once for each session and repository before a call that reaches a GitHub repository of another owner with a `CLAUDE.md`, `AGENTS.md`, or `AI_POLICY.md` file. It returns a deny of the engine unchanged. It never allows. See [Contributions](Contributions). |
| `tool.check` | `Bash` | Asks before `git stash`, `git reset`, and a `git checkout` or `git restore` of a path. Also asks before a `Bash` write to a protected file: a test file, a limits file, a lint or type-check config, a check runner config, a CI file, a hook file, a settings file, or a `justfile` or `Makefile`. The write forms are `sed -i`, `perl -i`, `>`, `>>`, `tee`, `cp`, `mv`, `install`, `rm`, `unlink`, `truncate`, `ln -f`, `git checkout --`, `git restore`, `git rm`, `git mv`, and `find` with `-delete` or `-exec rm`, also inside `&&`, `;`, `$(...)`, `bash -c`, and a quoted heredoc given to a shell. A quoted heredoc is also read as commands when a loop, a reader, `xargs`, or a shell takes its lines and the text runs a script in a variable, such as `bash -c "$c"` in a `while read` loop. Each quoted heredoc is read as commands when a shell reads its input (`\| sh`, `bash "$f"`), when `source` or `.` runs, or when a script comes from a substitution (`sh -c "$(cat)"`). A here-string given to a shell (`bash <<< '...'`) is read as commands. A git subcommand from a variable, a substitution, or the input of `xargs` gets the git ask. Code in any language that a program other than the shell runs is read too: a heredoc or a here-string that the program reads, an argument with a space, a bracket, or a `;` (`python3 -c '...'`, `node -e '...'`), and a heredoc written to a file that the program then runs. The check has no parser for the language. It reads the words of the code, so `os.system("git stash")` and `["git", "stash"]` get the git ask, and a protected path that the code names gets the write ask, because the check cannot tell whether the code writes it. Text for a command that only reads data (`cat`, `tee`, `echo`, `git`, `gh`, `grep`, `rg`, and others in `lib/shellkinds.ts`) is not read as code. The check also reads the script file that a command runs (`./x.py`, `python3 x.py`, `bash run.sh`, `awk -f x.awk`), up to 8 files of one command and 1 MB for each file. A file that a shell runs, or that has the shebang of a shell, is read as shell. A file in another language gives the git ask and the write ask only for the commands in it, such as `os.system("git stash")`, and not for each path that it names, because a script names many paths that it only reads. A test run (`node --test`, `pytest`, `jest`, `go test`, and others) and a file tool (`cp`, `rm`, `sed`, and others) are not read. The check does not follow the imports of a script. `git rm --cached` gets no ask. For a test file or a limits file, a write that only adds (a new file, `>>`, or `tee -a`) gets no ask, the same as a `Write` of a new file. Any write to the other kinds asks. A path under `/dev`, or under a variable other than `CLAUDE_PROJECT_DIR` or `HOME`, gets no ask. A path under `~`, `$HOME`, or `${HOME}`, or outside the project root, gets the ask for a lint or type-check config, a check runner config, a CI file, a hook file (also `~/.claude/hooks/`), a settings file (also `~/.claude/settings*.json`), and a `justfile` or `Makefile`, and not for a test file or a limits file. `git checkout <path>` with no `--` asks for an operand that is an existing protected file, and a branch switch gets no ask. The check does not follow `cd`. For a path with a variable or a glob, it asks only when the literal part is a protected path, such as `tests/*.test.mjs`. For `mv` and `git mv`, a protected folder as a source asks. For `find` with a `-name` or `-path` filter, it asks when a filter value, joined with each start path, is a protected path, and `find tests -name '*.pyc' -delete` gets no ask. Without a filter, it asks when a start path is a protected path. |
| `tool.check` | `Write`, `Edit`, `MultiEdit` | Asks before a change or removal of an existing line of a test file or of a number or `const` line of a `limits` or `budget` file. Also asks before an edit of a lint or type-check config, a check runner config, a CI file (`.github/workflows/`, `.github/actions/`, `.github/dependabot.yml`, and the CI files of other hosts), or a hook file (`hooks/hooks.json`, `hooks/register.ts`, a `hooks/*.txt` text, `.claude/hooks/`, a script that a `hooks.json` command names, the inline `hooks` of `plugin.json`, `.husky/`, and `.pre-commit-config.yaml`), the keys `hooks`, `permissions`, `disableAllHooks`, `enabledPlugins`, and `sandbox` of `.claude/settings*.json`, the linter sections of `pyproject.toml` and `setup.cfg`, a check script of `package.json`, and a check recipe of a `justfile` or `Makefile`, and before an added skipped or focused test or an added inline lint suppression. Each ask reason tells you what the change is and why it can hide a defect. |
| `tool.call` | `Write` | Puts each sentence of a Markdown file on its own line. See [Semantic line breaks](Semantic-Line-Breaks). |
| `tool.call` | `Edit` | Repairs an `old_string` that spans two sentences, then breaks the lines of `new_string`. It reads the file with `$.fs.read` when the file exists. |
| `tool.call` | `Bash` | Breaks the lines of the quoted heredoc of `git commit` and `gh pr create`. |
| `tool.call` | `Bash` | Denies a command that prints a file (`cat`, `sed -n`, `head`, or `tail` on one file, also in one part of a list, and not into a pipe), and gives the `Read` call with the same range. A file over 4 MiB (`READ_MAX_BYTES`) is denied by its size. A generated file, such as one in `node_modules` or a `.log` file, stays allowed. See [Context bound](Context-Bound). |
| `prompt.compose` | all | Adds the system prompt variant of the model of the session. The key is chosen at the first call and kept. It does nothing for the `bare` trait. See [System prompt](System-Prompt). |
| `agent.spawn` | all | Adds the model block to the end of the task prompt of a subagent. |
| `prompt.section` | `context_management` | Gives the shorter text that says compaction is off, when `DISABLE_COMPACT` is set. The built-in guard `sec-default` skips it. |
| `prompt.attachment` | `sandbox_instructions`, `auto_mode`, `session_context`, `agent_listing_delta` | Gives a shorter text. The sandbox text is shorter only when the settings set `sandbox.allowUnsandboxedCommands`. With `true`, it keeps the rule that a run outside the sandbox needs an approval. Any other attachment type passes on. See [Prompt surface](Prompt-Surface). |
| `agent.offer` | `claude-code-guide`, `statusline-setup` | Leaves the agent out of the listing and out of dispatch. |
| `tool.describe` | `Agent`, `Bash`, `Read`, `AskUserQuestion`, `ListAgents` | Gives a shorter description for the first three, and defers the last two. |
| `session.start` | all | The drift check. It appends one note to the conversation when the settings differ from the [settings snippet](Settings-Snippet). A resumed session gets no second note. |

The `tool.check` handler is the only guard in the module.
A recursive `rm` is an `ask` rule of the settings snippet, and the module has no parser for it.

### Classic hooks

| Event | Matcher and `if` | Command | What it does |
| --- | --- | --- | --- |
| `PostToolUse` | all tools | `hooks/PostToolUse/context.ts` | In a subagent only, tells it to report now when its context passes the bound of its model or when 2 turns are left. It tells and does not block. The main session gets no note. See [Context bound](Context-Bound). |

The `Bash` write ask has these gaps.
It does not read `xargs` input, `dd of=`, `rsync`, `curl -o`, a `find -exec` command other than `rm`, or a file that a script writes (`python -c`).
It does not follow `cd` or a variable.
A command over the scan bound gets no write ask.
A `Bash` write to `pyproject.toml`, `setup.cfg`, or `package.json` gets no ask, because only an `Edit` or `Write` shows a changed check section or script.
A test file or limits file over the read bound counts as a new file.

The classic hooks of `dotclaude` use the default timeout of Claude Code.

## `dotclaude-codegraph`

All hooks are classic command hooks of `plugins/dotclaude-codegraph/features/graph/cli.ts`.
Each one runs only in a project that has `.codegraph/codegraph.db`, and otherwise prints nothing.

| Event | Matcher and `if` | Command argument | What it does |
| --- | --- | --- | --- |
| `SessionStart` | all | `session-start` | Runs `codegraph sync -q` and adds one line about `codegraph impact`, `callers`, and `callees`. The timeout is 10 s. |
| `PostToolUse` | `Edit\|Write\|MultiEdit\|NotebookEdit` | `sync` | Syncs the index in the background (`async`, 60 s). |
| `PostToolUse` | `Bash` with `if` for `git commit`, `merge`, `rebase`, `pull`, `checkout`, `switch`, `reset`, `cherry-pick`, `revert`, `stash`, `apply`, or `am` | `sync` | The same background sync. There is one entry for each git command. |

The hooks never deny and never ask.
See [Code graph](Code-Graph).

## `dotclaude-browser`

The module is `plugins/dotclaude-browser/hooks/register.ts`.

| Event | Matcher | What it does |
| --- | --- | --- |
| `tool.call` | `WebSearch` | Runs the search in the headless browser with `agent-browser`. When the browser fails or the page has no results, the built-in `WebSearch` runs. It denies the call only for an empty query, or for the `cloakbrowser` backend with no CloakBrowser binary. In that case, Claude asks you to install CloakBrowser or to set the `backend` option to `agent-browser`. |

See [Browser](Browser).

## `dotclaude-jev`

The module is `plugins/dotclaude-jev/hooks/register.ts`.

| Event | Matcher | What it does |
| --- | --- | --- |
| `session.start` | all | Registers the `second_opinion` tool, only when `TYPESAFE_API_KEY` is set. With no key, no tool is registered. |
| `tool.call` | all tools, then `AskUserQuestion` or the tool by name | Serves each call of the `second_opinion` tool. For `AskUserQuestion`, adds the Jev pick to a question that facts decide. It runs only with the key, and a failure leaves the question as asked. |

One `tool.call` handler serves both tools, because Claude Code refuses a second handler with no matcher.
See [Second opinion](Second-Opinion).

## Test the hooks

- `just lab` runs the tests of the modules with stubbed events (`plugins/*/tests/`).
- `just test` runs the tests of the classic hooks with the payload JSON.
- Both give commands to the guards as strings and never run a guarded command.
- See [Development](Development).

## Related pages

- [Core plugin](Core-Plugin)
- [Guards](Guards)
- [Claude mods](Claude-Mods)
- [Troubleshooting](Troubleshooting)
