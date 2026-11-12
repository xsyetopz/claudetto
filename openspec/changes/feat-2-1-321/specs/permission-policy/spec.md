## MODIFIED Requirements

### Requirement: A Branch the Person Named Is Not Denied

The branch gate SHALL ask, not deny, before `git branch -D` of a branch this session did not create. It SHALL ask the Decider one Noul over the person's messages in this session: whether a message asks to delete that branch, by its name or as one of a group such as the other local branches. It SHALL allow the delete on `yes`, and SHALL ask the person on `no`, on `unsettled`, and when the Decider fails.

#### Scenario: The Person Asked

- **WHEN** the person wrote "delete all other local branches" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: No Request

- **WHEN** no message of the person mentions deleting branches
- **THEN** the gate asks the person instead of denying

#### Scenario: The Person Forbade It

- **WHEN** the person wrote "do not delete old-feature" and the agent runs `git branch -D old-feature`
- **THEN** the gate asks the person

#### Scenario: Words Outside a Fixed List

- **WHEN** the person wrote "get rid of the stale branches, old-feature included" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: The Decider Fails

- **WHEN** Jev does not answer and the fallback call is not answered
- **THEN** the gate asks the person

### Requirement: What the Session Made Meets No Vendored Delete Rule

An `rm` whose every path lies under a temp base, and a move or delete of a branch this session created (`update-ref` of `refs/heads/<name>`, or `branch -f <name>`), SHALL NOT meet the vendored `fs:recursively_delete`, `git:force_delete_branch`, or `git:delete_ref` rule or the ref-move ask.

#### Scenario: A Branch the Session Created

- **WHEN** the agent runs `git branch -f <name>` on a branch this session created
- **THEN** no vendored rule and no ref-move ask meets it

### Requirement: A Shell In-Place Edit Is Denied

The gate SHALL deny a Bash command in which `sed`, `perl`, or `ruby` reads `-i` or `--in-place` as its own flag, alone, in a chain, behind `xargs`, or run by `find -exec`, `-execdir`, `-ok`, or `-okdir`, and name `Edit` with the file, because an in-place shell edit skips the edit tool's diff and the user's review. A letter in another flag's value, such as the `i` of `-Mstrict`, and a flag after the program file of `perl` or `ruby` SHALL NOT count.

#### Scenario: An In-Place Edit

- **WHEN** the agent runs `git status && sed -i 's/a/b/' src/a.ts`
- **THEN** the gate denies it and names `Edit` on `src/a.ts`

#### Scenario: Several Scripts and a Chain

- **WHEN** the agent runs `sed -i '' -e 's/a/b/' -e 's/c/d/' src/a.ts; grep -n a src/a.ts`
- **THEN** the gate denies it and names `Edit` on `src/a.ts`

#### Scenario: A Letter in a Flag's Value

- **WHEN** the agent runs `perl -Mstrict -e 'print 1'`, `ruby -rtime -e 'puts 1'`, or `sed -es/i/j/` on stdin
- **THEN** the call passes

#### Scenario: A Flag of the Script

- **WHEN** the agent runs `perl tool.pl -i in.txt`
- **THEN** the call passes

### Requirement: A Vanished File Is Not Recreated Unasked

The gate SHALL ask when a call creates a file that this session saw (by `Read`, `Write`, `Edit`, a `Bash` operand that existed, an `ls` or `Glob` listing, or the transcript before a resume), that is gone now, and that no call of this session removed. A `Bash` operand the engine refuses to read as a path SHALL count as a file that is not there, and the gate SHALL NOT ask the person about it.

#### Scenario: A Copy over a Vanished File

- **WHEN** the session read `notes.md`, the person deleted it, and the agent runs `cp /tmp/notes.md notes.md`
- **THEN** the gate asks, because the file was removed outside this session
- **AND** the lab tests are `gate.vanish.test.ts`, "a copy to a file the session saw and that is gone now asks" and "recreating a file after the session's own rm passes"

#### Scenario: A Search Pattern That Is No Path

- **WHEN** the agent runs `grep -v "/\.git/" list.txt`, and the engine refuses `$.fs.exists` on the pattern as a network location
- **THEN** the call passes with no question
- **AND** the lab tests are `gate.vanish.test.ts`, "a `grep -v …` passes, since its pattern is no path the engine reaches", one per reported command

### Requirement: An Unreadable Command Asks

When the gate cannot parse a `Bash` command, it SHALL still apply the rules that read the whole text, and SHALL otherwise ask, with a text that says a person must approve the command. A command whose program is `[` or `[[` SHALL be read as the shell's test command, and the gate SHALL NOT ask about it for that word.

#### Scenario: Unreadable

- **WHEN** a command cannot be parsed and matches no rule that reads the whole text
- **THEN** the gate asks
- **AND** the lab test is `gate/rules.test.ts`, "an unreadable command asks"

#### Scenario: A Bracket Test

- **WHEN** the agent runs `[ -f x ] && echo y`, `[[ -f x ]] && echo y`, or `if [ -d node_modules ]; then echo y; fi`
- **THEN** the gate has no objection
- **AND** the lab tests are `gate/rules.test.ts`, "passes …", one per command

### Requirement: A Check's Exit Code Reaches the Chain

The gate SHALL deny a test, lint, type, or build check piped into `tail`, `head`, `grep`, or `rg`, and a `git commit` or `git push` that follows any pipe, when no earlier `set -o pipefail` appears in the command, because a pipe returns its last command's exit code and a failing check then reads as a pass. It SHALL deny a `git commit` that follows a check or a loop of checks that `&&` does not tie to it, unless `set -e` comes first or `|| exit` follows the check.

#### Scenario: A Trimmed Check

- **WHEN** the agent runs `bun run lint 2>&1 | tail -8`
- **THEN** the gate denies it and names `set -o pipefail;` and a log file with `$?` as the forms that keep the exit code

#### Scenario: A Kept Exit Code

- **WHEN** the agent runs `set -o pipefail; bun run lint 2>&1 | tail -8`
- **THEN** the command runs

#### Scenario: A Commit After a Check That Does Not Stop

- **WHEN** the agent runs `bun test; git commit -m x`, `bun test | tail -3; git commit -m x`, or `for p in a b; do bun test $p; done; git commit -m x`
- **THEN** the gate denies it and names `&&` and `set -e` as the forms that stop before the commit
- **AND** the lab tests are `gate/pipefail.test.ts`, one per shape

#### Scenario: A Commit a Failure Stops

- **WHEN** the agent runs `bun test && git commit -m x`, `set -e; bun test; git commit -m x`, or `for p in a b; do bun test $p || exit 1; done; git commit -m x`
- **THEN** the command runs

### Requirement: The Read Redirect Parses Only a File Operand

The redirect that sends `cat`, `head`, `tail`, and `sed -n` to `Read` SHALL take as `file_path` only an operand that is no option or `sed` script, however the script flag is spelled, and SHALL apply to a read anywhere in a chain. For a `sed -n` line range or a `head` count it SHALL give the `Read` call with `offset` and `limit`. A read piped into a command that works on it SHALL run. A read piped into `cat`, `head`, `less`, `more`, `nl`, `tail`, or `sed -n`, which only show it, SHALL be denied.

#### Scenario: A sed Range

- **WHEN** the agent runs `sed -n 1,80p hooks/gate.ts; grep -n "X" -r hooks | head`
- **THEN** the denial names `hooks/gate.ts`, never `1,80p`, with `offset` 1 and `limit` 80
- **AND** the lab test is `gate/rules.test.ts`, "A sed Range: the denial holds the Read call with offset and limit"

#### Scenario: A Compound Command

- **WHEN** the agent runs `git log -1 && head -5 CHANGELOG.md`
- **THEN** the gate denies it and names `Read` on `CHANGELOG.md`

#### Scenario: A Piped Read

- **WHEN** the agent runs `cat src/a.ts | wc -l`
- **THEN** the command runs

#### Scenario: A Read Piped Into a Viewer

- **WHEN** the agent runs `cat src/a.ts | head -5`
- **THEN** the gate denies it and names `Read` on `src/a.ts`

#### Scenario: A sed Script Flag

- **WHEN** the agent runs `sed --quiet 1,80p f.ts`, `sed -n --expression=1p f.ts`, or `sed -n -e1p f.ts`
- **THEN** the gate denies it and names `f.ts`

#### Scenario: A Read With No Fixed Range

- **WHEN** the agent runs `cat f.ts`, `tail -n 5 f.ts`, or `sed -n '$p' f.ts`
- **THEN** the denial names `f.ts` and gives no `offset`

### Requirement: The Session Removes Only What It Made

The gate SHALL deny `git worktree remove` of a path that Claude Code's `WorktreeCreate` event did not name in this session. The event's `name` gives the folder `.claude/worktrees/<name>` and the branch `worktree-<name>`, for an isolated agent (`agent-<agentId>`) and for `EnterWorktree` alike. The gate SHALL keep these names in memory, not read them from shell text or from the transcript, so compaction does not lose them. The denial SHALL tell the agent to leave it or ask the person.

#### Scenario: A Worktree of Another Session

- **WHEN** the agent runs `git worktree remove ../other` and no `WorktreeCreate` event of the session names it
- **THEN** the call is denied as not owned
- **AND** the lab test is `gate/worktrees.test.ts`

#### Scenario: A Worktree Claude Code Made for an Agent

- **WHEN** a `WorktreeCreate` event named `agent-a1b2c3` came, and the agent runs `git worktree remove .claude/worktrees/agent-a1b2c3` or `git branch -D worktree-agent-a1b2c3`
- **THEN** the call passes as owned

#### Scenario: A Compacted Transcript

- **WHEN** the transcript no longer holds the call that made a worktree
- **THEN** the worktree is still owned

## ADDED Requirements

### Requirement: A Loop That Polls With No Pause Is Denied

The gate SHALL deny a `Bash` or `Monitor` command that holds a `while` or `until` loop whose body runs only `:` or `true` and whose condition runs no `sleep`, `read`, or `wait`, in the foreground and in the background. The denial SHALL tell the agent to put a `sleep` in the body and to give the loop a time limit. A `for` loop and a loop whose body runs any other program SHALL pass this rule.

#### Scenario: A Body That Runs Nothing

- **WHEN** the agent runs `until grep -q x f; do :; done`, with or without `run_in_background`
- **THEN** the call is denied
- **AND** the lab tests are `gate/processes.test.ts`, "a foreground loop whose body runs nothing is denied" and "a background loop whose body runs nothing is denied"

#### Scenario: A Loop That Pauses or Ends by Itself

- **WHEN** the agent runs `until grep -q x f; do sleep 1; done`, `until sleep 2 && grep -q x f; do :; done`, `while read -r line; do :; done < f`, or `for i in 1 2 3; do :; done`
- **THEN** the call passes
- **AND** the lab tests are `gate/processes.test.ts`, "… passes, since it pauses or ends by itself", one per command

### Requirement: A Temp Base Itself Stays

A temp base is `/tmp`, `/tmp/claude`, or `/tmp/claude-<uid>`, each with or without `/private` before it, or `$TMPDIR` as written. The gate SHALL deny an `rm` that names a temp base itself, every entry of one through a glob, or a path under one that holds `..`, and the denial SHALL tell the agent to name the folder it made by its literal path, and that Claude Code's own check denies an `rm` whose target ends in `$dir/` or `$dir/*` or is a `$(...)`. Any other `rm` under a temp base SHALL pass.

#### Scenario: The Cleanup Form

- **WHEN** the gate denies `rm -rf /tmp`
- **THEN** the denial gives `rm -rf /tmp/<name>` and names the targets `$dir/`, `$dir/*`, and `$(...)`

#### Scenario: A Scratch Folder

- **WHEN** the agent runs `rm -rf /tmp/claude-501/gate20` or `rm /tmp/el.log`
- **THEN** the call passes
- **AND** the lab tests are in `gate/processes.owned.test.ts`

#### Scenario: The Base Itself

- **WHEN** the agent runs `rm -rf /tmp`, `rm -rf /private/tmp/claude-501`, `rm -rf /tmp/claude-501/*`, `rm -rf "$TMPDIR"`, or `rm -rf /tmp/mine/../other`
- **THEN** the call is denied

## REMOVED Requirements

### Requirement: Each Ask and Deny Is Logged

**Reason**: No code reads `~/.claude/claudetto/gate-asks/` (P193), and the person approved the removal of the writer.

**Migration**: Count denials from the session transcript, where each denied call is a tool result with its reason.

### Requirement: A /tmp Folder Carries Its Session's Marker

**Reason**: The marker stopped no delete of another session's folder in 58 sampled denials, and none of the 9,567 folders in the temp base held one, because test runs make the folders and no rule reaches them.

**Migration**: Make a temp folder with a plain `mkdir` or `mktemp`. A `.created-by-claudetto` file that is there already is an ordinary file.

### Requirement: A /tmp Removal Needs This Session's Marker

**Reason**: The rule denied the removal of the session's own scratch files and folders, about 350 times in three days.

**Migration**: Remove a temp folder with a plain `rm`. The requirement "A Temp Base Itself Stays" keeps the base and a path with `..` denied.
