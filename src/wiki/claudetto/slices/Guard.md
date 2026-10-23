# Guard

This page tells how the `guard` slice of the core plugin `claudetto` decides which calls run, which ask a person, and which stop.
A user reads it to learn why Claude Code shows a dialog or a refusal.
A contributor reads it before an edit of `slices/guard/`.

## Why It Exists

The settings snippet has no `allow` list and no `ask` list.
`permissions.defaultMode` is `default`, and `permissions.disableAutoMode` is `disable`, so the classifier of auto mode is off.
The slice replaces the lists with one gate that reads the command.
The gate lets a call run unless the call can lose work for good, harm the system, or read a secret.
A rule of the settings cannot read a command, so it cannot tell `rm -rf node_modules` from `rm -rf src`.
The gate can.

## What the Hook Does

The slice adds one `tool.check` hook on the tools `Bash`, `Read`, `Grep`, `Glob`, `Edit`, and `Write`.
It gives each call one of three answers:

| Answer | What happens |
| --- | --- |
| Allow | The call runs. This is the default |
| `ask` | A person decides in the dialog, unless Jev decides first (see below) |
| `deny` | The call stops, and Claude gets the reason |

The hook keeps a `deny` of the engine, such as a `deny` rule of the user.
The slice reads the shell syntax and does not run the shell.
It finds a command in `$(...)`, `bash -c`, a group, and a branch of `if`.

## What the Gate Denies

The gate denies these calls:

- `sudo`, `doas`, and `su`.
- A command that can erase a disk or turn off a protection of the system:
  `mkfs`, `newfs`, `dd` with `of=/dev/`, `diskutil` with `erase`, `zero`, `secureErase`, `partition`, or `reformat`, `csrutil` (except `status`), `spctl --master-disable` and `--global-disable`, `nvram` that sets or deletes a value, and `security delete-*`.
- A recursive `chmod`, `chown`, or `chgrp` on `/` or the home folder.
- A write to `/System`, `/Library`, or `/usr` (but not `/usr/local`), by a command, by a redirect, or by `Edit` or `Write`.
- A read of a secret: a `.env` file (but not `.env.example`, a sample, or a template), `~/.ssh`, `~/.gnupg`, `~/.aws/credentials`, `~/.netrc`, and `~/.docker/config.json`.
  This covers `Read`, `Grep`, and the globs of `Glob`.
  It also covers `git add` of a secret file, and an upload of a secret file by an `@` or `<` word, such as `curl -d @.env`, `--data-binary @.env`, and `-F file=@.env`.
- A print of each environment variable: a bare `printenv`, or `env` with no command.
  `printenv PATH` and `env A=1 cmd` run.
- A delete of `/` or the home folder.

The reason of a `deny` of a `Bash` command, except a read of a secret or a print of the environment, ends with ``If the user wants this command, they can run `! <cmd>`.``

## What the Gate Asks

### Deletes

The commands `rm`, `shred`, `srm`, `unlink`, and `find` with `-delete` or `-exec rm` are deletes.

- A delete in the temporary folder runs, but a delete in a project in the temporary folder gets the check of the project.
- A delete of a build folder runs: `node_modules`, `dist`, `build`, `out`, `target`, `coverage`, `.next`, `.nuxt`, `.turbo`, `.cache`, `.parcel-cache`, `.build`, `DerivedData`, `__pycache__`, `.pytest_cache`, `.mypy_cache`, `.ruff_cache`, `.venv`, and `.gradle`.
- A delete outside the project asks.
- A delete inside the project runs `git status` and `git ls-files` for the paths.
  The delete runs when each path has a commit and no change.
  A path with a change, with no commit, or in a folder that `git` does not manage asks.
  For a delete, ignored and untracked files count as changes, because the delete removes them.
- A delete whose paths come from a pipe (`xargs` and `parallel`), or whose target the gate cannot read, asks.

### Local `git` Work

A `git` command that can lose local work asks when the paths have a change:
`reset --hard`, `checkout` with a force flag or paths, `restore`, `clean -f`, `stash drop`, and `stash clear`.
`clean -f` counts untracked files, and `clean -fx` and `clean -fX` count ignored files too.
`reflog expire` and `gc --prune=now` or `--prune=all` always ask.

### Shared State in a Subagent

A subagent shares the work tree and the processes of the main agent.
So `git stash` (except `stash list` and `stash show`) and `pkill -f` or `pkill --full` from a subagent ask.
The main agent runs them with no prompt.

### Bulk Stage over User Edits

`git add -A`, `git add --all`, `git add .`, and `git commit -a` stage each change of the work tree, also a change of the user.
These commands ask when the work tree holds a change of the user.
They run with no prompt when each changed file comes from a Claude session.

The gate finds a change of the user in the edit ledger of [Session Hygiene](Hygiene):

1. The adapter runs `git status` in the work tree of the command (the `-C` folder, or the working folder).
2. It hashes each changed file, and it reads the ledger file of the project.
3. A file is a change of the user when no ledger line of any session holds its path with its current hash.

The dialog names the files, up to `STAGE_NAMES_MAX` (10), and the reason tells Claude to stage only its own files by name.
The `ask` is for a person only, because Jev does not decide it.
The check hashes at most `STAGE_FILES_MAX` (200) changed files.

### History on a Remote

A `git push` with `--force`, `--force-with-lease`, `--delete`, `--mirror`, or a refspec that starts with `+` or `:` asks.
This ask is for a person only, because Jev does not decide it.

### Commands the Gate Cannot Read

These ask, because the gate cannot know what they do:

- `eval`.
- A shell script that the gate cannot read, or a script file with no commit.
- A command that is too long to read (`SHELL_SCAN_MAX_CHARS`).

## Who Decides an `ask`

Each `ask` carries `decider: "person"`, so the dialog has no "always allow" row, and no classifier settles it.
Where no person can be asked, Claude Code refuses the call.

An `ask` of a delete or of local `git` work goes to Jev first when both of these are true:

- The `decide` option of the plugin is `jev`, which is the default.
- The plugin option `TYPESAFE_API_KEY` or the exported `TYPESAFE_API_KEY` is set.

The gate sends one yes or no question to Jev from the mod with `$.http.fetch`, with a timeout of `JEV_TIMEOUT_MS` (12,000 ms).
The question is whether each file that the command can lose is safe to lose, such as build output, a cache, a log, or a temporary file.
The command and the reason of the `ask` go with it.
The call runs when `P(yes)` is `JEV_YES_MIN` (0.8) or more.
Any other answer, a failure, or a timeout leaves the `ask` to a person.
See [Decide](Decide) for the Jev client.

The `ask` for a push, for `eval`, and for a script is for a person only.

### Plan Usage Gate

At red for the 5-hour share (above 80%), the gate asks before an `Agent` call while another agent runs.
It also asks before `just sandbox`, `just sandbox-alone`, `just eval`, `just eval-tune`, and `just eval-variant`.
The ask goes to the log with the decider `person`.
The weekly share never sets this gate, because it falls only at its weekly reset.
An API key has no rate limits, so it sets no gate.

## The Log

The gate writes each `ask` as one JSON line to `<tmp>/claudetto/gate/<sessionId>.jsonl`.
The fields are `at`, `tool`, `target`, `reason`, and `decider`, which is `jev` or `person`.
A log that cannot be written changes no answer.
The session cleanup removes the log with the other files of the session ([Session Hygiene](Hygiene)).

## Fail Closed

Claude Code skips a hook that throws or times out, so the call would run.
The slice adds an error handler for this case.
If the hook fails, the handler gives an `ask` for a person, with the reason that the gate failed.
A `git` run that fails or takes more than `GIT_TIMEOUT_MS` (5,000 ms) counts as a change, so a person decides.

## Two Calls That the Gate Does Not Judge

Two more `tool.call` hooks of the slice change a call or refuse it.
Neither one is part of the gate.

- A second `Monitor` with the command of a running one gets a short refusal.
  The text names the task ID and says to use the events of that task or to stop it with `TaskStop`.
  The slice keeps the command, the task ID, and the deadline of each running `Monitor` in `$.state`.
  A `TaskStop` of the ID, a `Stop` event whose `background_tasks` lacks the ID, and the deadline each remove the entry.
- The `--title` and `-t` value of `gh pr create` and `gh issue create` runs in Chicago Title Case.
  The hook rewrites the command, and the result tells the model.
  A value that the shell can expand (`$`, a backtick, a backslash) stays as typed.

## What the Gate Does Not Cover

- A path that a variable, an alias, or a script hides from the shell reader.
  Only the cases above ask.
- A `Bash` edit of a file that is not a delete.
  The edit ledger of [Session Hygiene](Hygiene) tells Claude about it when a file changes.
- The `deny` list of the settings snippet.
  It is a second layer for the same dangers, and it holds in each mode ([Settings Snippet](Settings-Snippet)).

## Related Pages

- [Decide](Decide)
- [Session Hygiene](Hygiene)
- [Settings Snippet](Settings-Snippet)
- [Controls](Controls)
