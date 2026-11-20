# Claudetto

claudetto is a Claude Code 2.1.327 plugin that keeps only what measurably beats vanilla Claude Code.

## Install

```sh
claude plugin install claudetto --marketplace xsyetopz/bedrock
```

## Builtin Plugins

Claude Code bundles 13 plugins (`<name>@builtin`). A plugin cannot refuse a bundled plugin when modules load, so at each session start claudetto sets every bundled id to `false` under `enabledPlugins` in the user settings file (`$CLAUDE_CONFIG_DIR/settings.json`, else `~/.claude/settings.json`). When it changes the file, it logs the ids it turned off. A bundled plugin that already loaded keeps running until `/reload-plugins` or the next start.

claudetto leaves a settings file that does not hold a JSON object untouched and logs that it did.

## Handover

claudetto writes a handover in place of Claude Code's compaction summary. It writes one when an automatic compaction runs, before a typed `/clear`, and at a task boundary (a finished last task, a commit, or a stop with nothing open) when the context is above the renewal threshold (70,000 tokens by default). A status line reads "Writing handover…" while the handover is written.

Each knob mirrors a compaction knob, with "handover" for "compact" and `CLAUDETTO_` for `CLAUDE_CODE_`:

| Knob | Effect |
| --- | --- |
| `CLAUDETTO_DISABLE_HANDOVER` (env) | Turns every handover path off. |
| `CLAUDETTO_DISABLE_AUTO_HANDOVER` (env) or `autoHandoverEnabled: false` (settings) | Leaves automatic compaction to Claude Code; the `/clear` handover stays. |
| `precomputeHandoverEnabled: false` (settings) | Leaves only the ahead-of-time compaction to Claude Code. |
| `CLAUDETTO_AUTOHANDOVER_PCT_OVERRIDE` (env) | Renewal threshold as a percent of the context window. |
| `CLAUDETTO_AUTO_HANDOVER_WINDOW` (env) or `autoHandoverWindow` (settings) | Renewal threshold in tokens, such as `70k`; the env value wins. |

The handover runs as a fork of the session. When the main thread's last message is plain text rather than a tool result, that message is sent again uncached; above the renewal threshold the last message has been a tool result in every run measured.

A manual `/compact` keeps Claude Code's summary and asks it to keep the user's corrections, refusals, and consents word for word.

### Headless Runs

Under `claude -p` a plugin cannot start a compaction, so the task-end renewal does not run. Automatic compaction still runs there and still gets the handover. To renew near 70,000 tokens, the script that starts `claude -p` sets `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=35` on a 200,000-token window: Claude Code then compacts at the lower of that percent and the window minus 13,000 tokens. The renewal then happens mid-task at the threshold, not at a task end. Alternatively, the script sends `/clear` as a prompt between tasks, and claudetto writes the handover first.

## Output Style

claudetto ships one output style, `claudetto:Claudetto`, and selects it when your settings name no `outputStyle`; a style you chose stays. It keeps Claude Code's coding instructions and adds these lines:

- Report a pass or "done" only after a run that could have failed; run a test that touches time, randomness, ordering or shared state twice and report a split result as flaky. On a flaky test, Sonnet 5.5 ran it twice and reported the split in 7 of 7 runs with the style and 0 of 6 without it.
- Report what code does on an input only from a run on that input, and mark an unrun case "not run".
- Ask a choice that belongs to the user with one `AskUserQuestion` call.
- Before a commit or push, read the check's exit status and test count, and commit only after a run of at least one test with no failure in its output.
- Wait for a running subagent whose task still holds; stop it and start a new one when the task changed.
- Write a list of controls or steps the user performs with each literal name in backticks, as a bulleted list when order does not matter.
- Ask for an input that no file, command or source holds; read it from the repo when it is there.
- Commit edits found in the working tree that it did not make, in their own slice, unless told to leave them out.
- Run a step that would touch something off-limits on a stand-in, and carry out a choice the task or user already made.
- Edit files only inside the directory the session started in; for a fix that belongs in a sibling repository or shared library, give its path and the exact change in the reply. When the bug sat in a sibling repository, Sonnet 5.5 left that repository untouched and named the file in 6 of 6 runs with this line, 2 of 6 without the style, and 0 of 6 with the style before the line.
- On a stop or quiet order, end the turn with "Stopped." and nothing more. Sonnet 5.5 did so in 5 of 5 runs with this line and 1 of 6 without the style, and still carried out "Stop using var" in 3 of 3.

## Shell Commands

claudetto runs each Bash command with stdin from `/dev/null`, so a stray stdin reader ends at once instead of waiting for the 120-second timeout. Each command also runs under a wall-time limit, set by the `bashTimeLimitMinutes` option (30 by default, 0 turns it off). When the limit is reached, claudetto stops the command and its child processes, also when the command runs in the background, and tells the model why. A command that commits or pushes runs with `pipefail`, so `bun test | tail -3 && git commit` stops when the tests fail. These guards apply to a command the permission rules already allow; a command that names git runs without the stdin redirect and the time limit (it keeps `pipefail` when it commits), because Claude Code refuses a git command in a worktree-isolated agent unless it is a plain list; a command that needs approval runs as the model wrote it, so the approval dialog and saved rules show the model's own command.

claudetto allows `perl -0pi -e` and `perl -pi -e`, so one call can edit many places across files, also when run by `xargs`, `find -exec` or a loop (`git grep -l old | xargs perl -pi -e ...`). The output style and the Heracles agent ask for that form when one change repeats across files. After an in-place perl edit, the model sees the diff stat of the files it changed and reads them again before it writes them.

## Edit Fixes

When an `Edit` call's `old_string` carries the tab that follows the line number in `Read` output on every line, and the file lacks the text as written, claudetto drops that tab from both strings and runs the edit. The model then reads a note that says so, so its next `Edit` leaves the tab out.

## Subagents

claudetto ships three agents: `Artemis` (Haiku, read-only search), `Athena` (Sonnet, read-only review) and `Heracles` (Sonnet, reads, runs commands and edits). It hides Claude Code's other built-in agent types from the model, except `fork`. A subagent spawn that names Fable, Mythos or Opus is refused with a reason that tells the model to use Sonnet or Haiku, or to leave the model unset.

## Settings Defaults

At a session start, claudetto fills defaults into the user settings file, once per set of defaults. It writes a key only when you left it unset, and adds only the list entries that are missing, so a value you chose stays. It logs one line naming what it changed.

- Trimmed prompt: seven tools denied (`Workflow`, `ScheduleWakeup`, `ReportFindings`, `CronCreate`, `CronDelete`, `CronList`, `EnterPlanMode`), `skillListingMaxDescChars` 60, `bashOutputMaxChars` 8000, and several `env` switches.
- Commit trailer `Co-Authored-By: Claude <noreply@anthropic.com>`, which GitHub credits to Claude's account and GitLab writes in the same form, and never a `Signed-off-by`; PR line `Assisted-by: Claude Code`. A commit value an earlier version filled (`Assisted-by: Claude Code`) is replaced; one you wrote stays.
- `outputStyle` set to `claudetto:Claudetto`, as above.
- Subagents run on `claude-sonnet-5-5` unless an agent file names a model.
- The two `perl` forms allowed. `claude -p` is a paid run, so it keeps its permission prompt.
- Guard rules, below.

It also removes a `CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` that an earlier claudetto version wrote, and keeps one you wrote. It removes the `Bash(claude -p *)` allow that earlier versions wrote.

## Guards

The fill adds permission rules that Claude Code enforces: reads of `.env` files (not `.env.example` or `.env.sample`) and credential folders are denied, `git push --force` and `-f` are denied, a `git config` or `-c` that sets a hooks path is denied, and `git stash`, `git reset --hard`, `git clean`, `git branch -D`, tag pushes, `pkill`, `killall` and edits of the user settings file ask first. It turns the sandbox on with `autoAllowBashIfSandboxed`, denies sandboxed writes to shell start-up files, `~/.ssh`, `~/.gitconfig` and plugin and hook folders, and denies sandboxed reads of credential folders.

Before the model reads a tool result, claudetto masks the values of the project's env-style files and the secrets that `betterleaks` finds, or a set of built-in key shapes when `betterleaks` is not installed. It masks the tool's own record, so the session file in `~/.claude/projects` stores the masked value too: in a run with a printed token, an errored command and an env-style file read, vanilla left 3 of 3 values raw in the session file and claudetto 0 of 3, in 2 of 2 runs. A masked error result reaches the model wrapped in `<tool_use_error>`.

Four options in the plugin settings tune the hooks:

| Option | Effect |
| --- | --- |
| `protectedPaths` | Folders no session may read or write (default: the held-out eval folder). The fill adds a `Read` deny rule and sandbox `denyRead` and `denyWrite` for each, and a Bash call that names one, also through a glob, a variable or a `cd` to home, is refused. An empty list turns the check off. The `denyWrite` entry stops shell writers (`>`, `tee`, `cp`, `sed -i`) only while `sandbox.enabled` is true; with the sandbox off, only the `Read` deny and the Bash check apply. |
| `memoryFreeMinPercent` | A new `Bash`, `Monitor` or `Agent` call is refused while free memory (`memory_pressure -Q`) is under this percent (default 20; 0 turns it off). A failed read never blocks. |
| `bashTimeLimitMinutes` | The wall-time limit under Shell Commands. |
| `includeGitInstructions` | Adds a short git block to the `Bash` tool in place of Claude Code's own, which the fill turns off with the `includeGitInstructions` setting false (default on). The block carries the commit and pull request lines from the `attribution` setting and adds none for an unset or empty value. While the block is on, a Bash call whose inline commit message (`-m`, `--message` or `-F -`) lacks the commit lines is refused with the line to add; a message from a file, the editor or another commit is let through. When the setting or `CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS` turns the builtin block on, the builtin block stays alone and session start reports the conflict. Turned off, set `includeGitInstructions` to true in settings to get the builtin block back. |

## Notices

When a turn stops on an API error, claudetto raises a notification naming the error and says to reply to retry. When a response is cut mid-stream in a session with a person at it, claudetto submits a continuation so the answer resumes, at most twice in ten minutes; a further cut raises the notification.

## Status Line

claudetto shows one line: model, `ctx` percent, `5h` and `7d` rate-limit percent and `cache` hit of the last main-loop turn, leaving out a figure the engine has not reported. `/statusline` has the main model write a `statusLine` command into the user settings file itself, in place of starting the `statusline-setup` subagent.

## Shell Start-Up

At a session start, claudetto adds `setopt no_nomatch no_equals sh_word_split` to the session's env file for zsh, so an unmatched glob or a word starting with `=` reaches the command as written, and an unquoted `$VAR` that holds a command with its arguments (`C="echo hi"; $C`) or a list of files splits into words as it does in bash. `${pipestatus[1]}` and 1-based arrays keep their zsh meaning. claudetto also adds a `TRAPDEBUG` function that fills `PIPESTATUS` with bash's 0-based keys before each command, so `${PIPESTATUS[0]}`, which zsh leaves empty without an error, gives the first command's exit code. The trap costs about 0.1 ms per simple command, and under `set -x` it prints its own three lines before each command. The cost: an unquoted variable that holds one path with a space (`ls $d` with `d="My Dir"`) now splits; quote it as `"$d"`. None of 104,848 recorded Bash commands on the measuring machine had that shape.
