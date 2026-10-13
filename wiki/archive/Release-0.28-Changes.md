# Release 0.28 Changes and Fixes

This page records the changed behavior and the fixes of the `0.28` release.
The additions and the removals are on [Release 0.28](Release-0.28).

## Changed

- The eval cases guard a protected file with a file-state `regex` grader (`kept-<path>`) on its final content.
  They do not use a `Bash` text grader, because command text cannot tell a write from a read.
  `just eval` always passes `--keep-temp`, so each run keeps its sandbox and `trace.jsonl`.
- `just eval` and `just eval-variant` stop before the first run when they run in the Bash sandbox of Claude Code.
  An example of such a run is `! just eval`.
  In the sandbox, the model calls of the runs use its proxy.
  Runs stopped on a model call until the 600 s timeout of the case.
- The git ask and the write ask also read a quoted heredoc as commands.
  They do so when a loop, `xargs`, or a shell runs its lines.
  Examples are `bash -c "$c"` in a `while read` loop, `| sh`, `source /dev/stdin`, and `sh -c "$(cat)"`.
  They also read a here-string given to a shell, and a git subcommand from a variable or from `xargs` gets the git ask.
  Before, a `git stash` in the brief of the `test-runner` script got no ask.
- The git ask and the write ask read code in any language that a program other than the shell runs.
  Examples are `python3 - <<'EOF'`, `node -e '...'`, and a heredoc written to a file that `python3` then runs.
  They have no parser for the language, and they read the words of the code.
  So `os.system("git stash")` gets the git ask, and a protected path that the code names gets the write ask.
- The git ask and the write ask read the script file that a command runs, such as `python3 x.py` or `bash run.sh`, except in a test run.
  A shell script is read as shell, and a file in another language gives an ask only for the commands in it.
- `dotclaude-eval-compare` adds no `--scaffold` and no `--allow-tools Bash,Write,Edit`, because each one runs the scripts or the tools of a suite as the user.
  Add them in the options for suites that you trust.
  `just eval-variant` adds both for the suite of this repository.
  The `eval-compare` skill no longer grants `Bash(dotclaude-eval-compare *)`, so Claude Code asks you before each run.
  A bound in the form `--max-cost-usd=N` is kept, and no second bound is added.
- With the `backend` option `cloakbrowser`, a `WebSearch` that falls back to the built-in tool gives Claude a notice with the reason, such as a bot check.
  The notice tells Claude to tell you.
- The `drive-web-browser` skill loads the `agent-browser` guide through the new bin `dotclaude-browser-guide`, which cuts the guide at 40,000 characters and names the command for the rest.
  A timeout or a failed run gives its reason, and only a missing binary gives the install text.
- The eval cases `destructive-ask`, `big-file-subagent`, and `library-docs` no longer name the graded behavior in the prompt.
  `destructive-ask` now asks the agent to free disk space in a project whose large files are a customer export and a database.
  It no longer needs a question.
  A report that removes nothing is also right.
  `report-count` no longer names its script in `tasks.md`.
- The wiki has the shape of the Claude Code docs: an overview, a quickstart, a reference page for each plugin, `Hooks`, `Troubleshooting`, and `Undocumented-Reads`.
  That last page gives the source of each read of undocumented data and how it breaks.
  The old release pages are in `wiki/archive/`.
- CI runs `just check` with Claude Code 2.1.296, and `just lab` runs the lab of each plugin that has a `tests/` folder.
  The repository has `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue and pull request templates, and `dependabot.yml`.
- Each plugin manifest has `$schema`, `keywords`, and `homepage`, and its description is the same text as in the marketplace.
  The `backend` option of `dotclaude-browser` lists its values, `agent-browser` and `cloakbrowser`.
- The lab bins take flags in place of custom env vars: `dotclaude-sandbox --dir DIR` (also `--clean` and `tools/start-run.ts`) and `dotclaude-capture --upstream URL`.
  `dotclaude-sandbox` finds `claude` on `PATH` only, and the capture proxy reads `ANTHROPIC_BASE_URL` when `--upstream` is not set.
- For contributors: the sandbox, the request capture, the settings schema, the start measure, and the usage report moved from `tools/` into `dotclaude-lab` and `dotclaude-sessions`.
  `just sandbox` gives `--plugin-dir` for each plugin of the checkout, and `DOTCLAUDE_SANDBOX_PLUGINS` is removed.
  `dotclaude-sandbox` makes each `--plugin-dir` absolute, because `claude` runs in the sandbox project and skips a relative folder.
  `just measure` passes the start bounds of `tools/limits.ts` to `dotclaude-start`, and the usage report no longer reads `verdicts.jsonl`.
  `just debug-agents` runs `dotclaude-sandbox --check-frontmatter`.
- For contributors: the tests are in one folder for each feature, such as `tests/dotclaude/guard/`, in place of file names with a shared prefix.
- When the headless browser of `dotclaude-browser` fails or gets no search results, such as a bot check, the built-in `WebSearch` answers the call.
  Before, the hook denied the call, and a session could end with no answer.
- The size bounds that equaled the current file size are gone (`STYLE_MAX_BYTES`, `VARIANT_MAX_BYTES`, and `SKILL_DESCRIPTION_MAX_CHARS`).
  Size targets in `tools/limits.ts` replace them.
  The targets are `CLAUDE.md` at most 6 KB.
  Skill metadata has 150 to 300 bytes for each skill, and skill bodies have 2 KB to 8 KB.
  The skill metadata of all skills has a target of 5 KB to 8 KB and a ceiling of 15 KB.
  The first request has a target of 8 KB to 16 KB.
  A size above a high bound fails, and a size below a low bound is reported.
- dotclaude is tested on Claude Code 2.1.296, and the minimum version is 2.1.296, because the settings schemas are of that version.
  The `intro` section of the system prompt has one text since 2.1.295, and `CLAUDE_CODE_INTRO_FRAME` is gone.
- The core plugin has five agents: `debugger`, `implementer`, `investigator`, `reviewer`, and `test-runner`.
  Each agent has a `maxTurns` value, a `model`, and an `effort` in its frontmatter, and `web-researcher` is merged into `investigator`.
- The core plugin follows the plugin layout of the Claude Code docs.
  `hooks/register.mjs` is the one hooks module, `features/<name>/` holds the code of each part, and `lib/` holds the shared code.
- Each file has 300 lines or fewer, and each test file 500 lines or fewer.
  A test fails on a file over its bound.
- Runtime JavaScript in `plugins/` is `.mjs` on Node.
  A test fails on another script type, except the hook-lab `.test.ts` files.
- For contributors: `just measure` sizes the start of a session and prints the figures.
  `just capture` logs and sizes the requests of Claude Code, and `just schema` writes the settings schemas.
  `just start-run` captures and measures the start of a clean sandbox session in one command.
  `just debug-agents` fails when the debug log names an unknown frontmatter field.
  `just eval-variant REF` runs the eval cases on the checkout and on a variant at a git ref.
  `just eval` takes eval options such as `--case NAME`.
  `just eval-variant` copies the results of the variant arm to `plugins/dotclaude/evals/results/variant-REF-TIMESTAMP/` before it removes the worktree.
- For contributors: `pnpm` installs the pinned toolchain (Biome, markdownlint-cli2, and TypeScript) from `pnpm-lock.yaml`.
  `.node-version` pins Node 22.18.
  `just lint` and CI also lint the Markdown.
- For contributors: the repository has no Bun.
  The tests run with `node --test` (`just test` or `pnpm test`), and the scripts of `tools/` run on Node.
  `pnpm` installs the `yaml` parser that the eval-case test reads `case.yaml` with.
- `just schema` reads Claude Code 2.1.296 only.
  The tables of older versions are removed, because each build renames the minified helpers.
  The schema check of a definition now reads the object and record helpers from the table, so a lazy record such as `env` keeps its `object` type.
- Each `catch` in `plugins/` now names the error that it expects, such as `ENOENT` or `SyntaxError`, and rethrows the others.
  A classic hook that crashes still lets the call continue, and it writes the error to stderr.
  The guard of `dotclaude` no longer keeps an empty list of GitHub owners for the session after a failed `gh` call.
  It asks `gh` again at the next check.
- Windows: `codegraph`, `openspec`, and `claude` start through `cmd.exe` when they are `.cmd` files.
  An argument with `%`, `!`, `"`, a line break, or an end `\` is refused there, because `cmd.exe` expands `%` before it reads quotes.
  A missing `codegraph` adds no session line, `dotclaude-sandbox` sets `USERPROFILE` for the child, and `readTail` returns `null` for a folder.
- CI runs `just ci`, which is `just check` without the type check, because Claude Code writes `.claude-plugin/types/` only when an interactive session loads the plugin.

## Related Pages

- [Release 0.28](Release-0.28): the additions and the removals of `0.28`.
- [Archive](Archive): the index of the archived pages.
