## ADDED Requirements

### Requirement: A Branch the Person Named Is Not Denied

The branch gate SHALL ask, not deny, before `git branch -D` of a branch this session did not create, and SHALL allow it when a message of the person in this session names that branch or asks to delete the other local branches.

#### Scenario: The Person Asked

- **WHEN** the person wrote "delete all other local branches" and the agent runs `git branch -D old-feature`
- **THEN** the command runs

#### Scenario: No Request

- **WHEN** no message of the person mentions deleting branches
- **THEN** the gate asks the person instead of denying

### Requirement: The Read Redirect Parses Only a File Operand

The redirect that sends `cat`, `head`, `tail`, and `sed -n` to `Read` SHALL take as `file_path` only an operand that is not an option or a `sed` script, and SHALL apply only when the whole command is that one read. A compound command SHALL run as it is.

#### Scenario: A sed Range

- **WHEN** the agent runs `sed -n 370,376p hooks/texts.ts`
- **THEN** the redirect names `hooks/texts.ts`, never `370,376p`

#### Scenario: A Compound Command

- **WHEN** the agent runs `git log -1 && head -5 CHANGELOG.md`
- **THEN** the command is not refused for its `head` part

### Requirement: A Switch That Would Touch a Protected Path Stops First

Before `git switch`, `git checkout <ref>`, `git reset --hard`, or `git rebase`, the gate SHALL compare `HEAD` with the target under each path the sandbox denies writes to, and SHALL deny the command with the list of paths when any differ.

#### Scenario: Skills Differ

- **WHEN** `.claude/skills` is under the sandbox's `denyWithinAllow` and `git diff --name-only HEAD main -- .claude/skills` lists 7 files
- **THEN** `git switch main` is denied, the files are named, and `HEAD` does not move

#### Scenario: No Difference

- **WHEN** the protected paths match between `HEAD` and the target
- **THEN** the switch runs

### Requirement: A Standing Instruction Covers a Later Remark

The work gate SHALL read the person's earlier messages in the session, and SHALL allow an edit when the newest message is a remark that falls under a standing instruction from one of them.

#### Scenario: Yet Another Fault

- **WHEN** the person earlier wrote "any issue you find that is holding you back, add them to the next list of issues" and now writes "so that is yet another fault to report"
- **THEN** the `Edit` to the issues file runs with no popup

### Requirement: A Walled Path Is Reached by No Tool

The gate SHALL deny a call that names a path under a wall (the `protectedPaths` option, by default `~/.claudetto-holdout`), in any spelling: `~`, `$HOME`, `${HOME}`, a relative path joined to the folder of an earlier `cd` in the same command, `..` folds, a word after `=`, or a redirect target.

#### Scenario: A Compound Head

- **WHEN** the agent runs `cd /tmp; ls; head -c 1 ~/.claudetto-holdout/canary.txt`
- **THEN** the call is denied over an allow
- **AND** the lab tests are `gate.test.ts`, "by default a compound head, a grep, and a Read of the held-out folder are denied over an allow", and `gate/walled.test.ts`, "a shell command that names a walled path in any spelling is denied"

### Requirement: File Tools Are Judged by Their Path Fields for a Wall

The gate SHALL read the `file_path` of `Read`, the `path` of `Grep`, and the `path` and `pattern` of `Glob` the same way as a shell command for a walled path.

#### Scenario: A Read of the Wall

- **WHEN** a `Read` names a file under the wall
- **THEN** the call is denied over an allow

### Requirement: A Walled Path Denial Names the Wall and Hands Off to the Person

The denial of a walled path SHALL name the path and the wall, SHALL say the person walled it off, and SHALL tell the agent to ask the person to run their own `! <command>`.

#### Scenario: A Denial Text

- **WHEN** the gate denies a call for a walled path
- **THEN** the text names the path and the wall, says the person walled it off, and tells the agent to ask for a `! <command>`

### Requirement: A Sibling of a Wall Passes

A path that only shares a name prefix with a wall SHALL pass. A call that spells no wall's last name SHALL cost no lookup of the home folder.

#### Scenario: A Sibling

- **WHEN** a command names a folder beside the wall, or only mentions the wall's name as text
- **THEN** the call passes
- **AND** the lab test is `gate/walled.test.ts`, "a command that only mentions a walled path, or names a sibling, passes"

#### Scenario: No Wall Name Spelled

- **WHEN** a call spells no wall's last name
- **THEN** the home folder is not looked up

### Requirement: A Wall With No Read Deny Is Reported at Startup

At a `startup` session start, the gate SHALL read `permissions` from the settings and, when a wall has no `Read(<wall>/**)` entry in `permissions.deny` (in its `~/` or `//` absolute form), SHALL log one line that names each such wall and its missing rule and says that only the gate keeps sessions out. It SHALL log nothing when each wall has its entry.

#### Scenario: A Wall With No Deny

- **WHEN** the settings hold no `Read(~/.claudetto-holdout/**)` and a session starts
- **THEN** one line names `~/.claudetto-holdout` and `Read(~/.claudetto-holdout/**)`
- **AND** the lab tests are `gate.test.ts`, "a startup logs one line when the settings lack the wall's Read deny" and "a startup with the wall's Read deny in the settings logs nothing"

### Requirement: A Background Wait With No Limit Is Denied

The gate SHALL deny a `Bash` call with `run_in_background` set whose command is a `while` or `until` loop that sleeps and holds no `timeout` with a number and no `$SECONDS` test. The denial SHALL tell the agent to give the loop a limit and an exit on failure. The same loop in the foreground SHALL pass, because the `Bash` timeout ends it.

#### Scenario: A Loop That Counts Successes

- **WHEN** the agent starts a background `until` loop that sleeps and waits for four successes, with no time limit
- **THEN** the call is denied
- **AND** the lab tests are `gate/processes.test.ts`, "a background wait loop with no time limit is denied" and "the same wait loop in the foreground is not denied, since the Bash timeout ends it"

### Requirement: A Monitor Command Is Judged as a Shell Command

The gate SHALL judge the `command` of a `Monitor` call by the same rules as a `Bash` command.

#### Scenario: A Refused Monitor Command

- **WHEN** a `Monitor` call holds a command the gate refuses in `Bash`
- **THEN** the call is denied
- **AND** the lab test is `gate.test.ts`, "a Monitor command the gate refuses is denied like a Bash one"

### Requirement: A /tmp Folder Carries Its Session's Marker

The gate SHALL deny a `mkdir` or `mktemp` of a folder directly below `/tmp` (or `/private/tmp`) or below the sandbox's `/tmp/claude-<uid>`, when the command writes no `.created-by-claudetto` file and this session did not mark or find the folder, and SHALL deny a `Write`, `Edit`, or `NotebookEdit` that would make one. A variable set by an earlier assignment-only command of the call SHALL be expanded first. The denial SHALL give the one command that makes the folder and its marker together.

#### Scenario: A Folder Made with No Marker

- **WHEN** the agent runs `mkdir -p /tmp/probe` alone
- **THEN** the call is denied with the `mkdir` and marker line

#### Scenario: A Folder Made Through a Variable in the Sandbox Temp Base

- **WHEN** the agent runs `S=/tmp/claude-501/gate20 && mkdir -p $S`
- **THEN** the call is denied with the marker line for `/tmp/claude-501/gate20`
- **AND** the lab test is `gate/processes.test.ts`, the `gateTmpMarker("/tmp/claude-501/gate20")` case

#### Scenario: A Folder That Is There

- **WHEN** a `Write` goes under a `/tmp` folder that exists already, or outside `/tmp`
- **THEN** the call passes
- **AND** the lab tests are `gate/processes.test.ts`, "a Write that would make a /tmp folder is denied with the marker line" and "a Write under a /tmp folder that is there already, or outside /tmp, passes"

### Requirement: A /tmp Removal Needs This Session's Marker

The gate SHALL deny an `rm` under `/tmp` of a top folder whose marker does not hold this session's id, and of any path with `..`. The sandbox's temp base `/tmp/claude-<uid>` SHALL be a base like `/tmp` itself: each folder in it is a top with its own marker, and the base is no top. A marker counts when a non-error `Bash` call of this session wrote it, and the file holds this session's id.

#### Scenario: A Folder of Another Session

- **WHEN** the agent runs `rm -rf /tmp/other` and its marker holds another session's id
- **THEN** the call is denied

#### Scenario: A Folder in the Sandbox Temp Base

- **WHEN** the agent runs `rm -rf /tmp/claude-501/gate20` and its marker holds this session's id
- **THEN** the call passes
- **AND** `rm -rf /tmp/claude-501/other` with no marker of this session, and `rm -rf /tmp/claude-501` itself, are denied
- **AND** the lab test is `gate/processes.test.ts`, the `/tmp/claude-501` cases

### Requirement: The Session Removes Only What It Made

The gate SHALL deny `git worktree remove` of a path that no earlier successful `git worktree add` or `EnterWorktree` of this session names, and that is no isolated worker's `.claude/worktrees/agent-<id>` of an `Agent` call that returned that id. The denial SHALL tell the agent to leave it or ask the person.

#### Scenario: A Worktree of Another Session

- **WHEN** the agent runs `git worktree remove ../other` and no earlier call of the session made it
- **THEN** the call is denied as not owned
- **AND** the lab tests are `gate/processes.test.ts`, "`<command>` is denied as not owned" and "`<command>` passes as owned"

### Requirement: What the Session Made Meets No Vendored Delete Rule

A removal of a /tmp folder with this session's marker, and a move or delete of a branch this session created (`update-ref` of `refs/heads/<name>`, or `branch -f <name>`), SHALL NOT meet the vendored `fs:recursively_delete`, `git:force_delete_branch`, or `git:delete_ref` rule or the ref-move ask.

#### Scenario: A Branch the Session Created

- **WHEN** the agent runs `git branch -f <name>` on a branch this session created
- **THEN** no vendored rule and no ref-move ask meets it

### Requirement: A Kill Needs a Pid the Session Started

The gate SHALL deny `pkill` and `killall`, and SHALL deny `kill` and `xargs kill` of a pid that no result of this session shows a background command printed. A job (`%1`), `$!`, a signal check (`-0`, `-l`, `-L`) SHALL pass. A pid printed by a command that was not backgrounded SHALL be denied. The denial SHALL tell the agent to stop its own tasks with `TaskStop`.

#### Scenario: A Pid Nobody Printed

- **WHEN** the agent runs `kill 4242` and no result shows a background command printed `4242`
- **THEN** the call is denied
- **AND** the lab tests are `gate/processes.test.ts`, "kill of a pid no result shows is denied", "kill of a pid a background command printed passes", and "a pid printed by a command that was not backgrounded is denied"

### Requirement: A Released Claude Program Is Read, Not Run

The gate SHALL deny a command whose program path holds `claude/versions/<version>`, and SHALL point the agent at the cc-inspect `code` tool. The installed `claude` command, and a command that only names such a path as an operand (`ls <path>`), SHALL pass.

#### Scenario: Running a Release

- **WHEN** the agent runs `<data>/claude/versions/2.1.318 --help`
- **THEN** the call is denied and the text names cc-inspect
- **AND** the lab tests are in `gate/processes.test.ts`, "`<command>` is denied and points at cc-inspect" and "`<command>` passes"

### Requirement: A Branch Move Asks

The gate SHALL ask before `git reset` to a ref other than `HEAD`, `@`, or their `~`/`^` forms when a mode flag is given, `git reset` to `FETCH_HEAD`, `ORIG_HEAD`, `MERGE_HEAD`, or `CHERRY_PICK_HEAD`, `git update-ref`, and `git branch -f`, unless the command moves one branch this session created. The ask SHALL tell the agent to resolve the target to a full hash with `git rev-parse` and to check `git diff --quiet <expected> HEAD` in the same call.

#### Scenario: A Hard Reset

- **WHEN** the agent runs `git reset --hard origin/main`
- **THEN** the gate asks and names the hash form
- **AND** the lab tests are `gate/refs.test.ts`, "`<command>` asks and names the hash form" and "`<command>` passes"

### Requirement: A Vanished File Is Not Recreated Unasked

The gate SHALL ask when a call creates a file that this session saw (by `Read`, `Write`, `Edit`, a `Bash` operand that existed, an `ls` or `Glob` listing, or the transcript before a resume), that is gone now, and that no call of this session removed.

#### Scenario: A Copy over a Vanished File

- **WHEN** the session read `notes.md`, the person deleted it, and the agent runs `cp /tmp/notes.md notes.md`
- **THEN** the gate asks, because the file was removed outside this session
- **AND** the lab tests are `gate.test.ts`, "a copy to a file the session saw and that is gone now asks" and "recreating a file after the session's own rm passes"

### Requirement: What Counts as Creating a Vanished File

A `Write`, a `cp` or `mv` target, `touch`, and `ln -s` SHALL count as creating. `sed -i` SHALL NOT.

#### Scenario: An In-Place Edit

- **WHEN** the agent runs `sed -i` on a file that is gone
- **THEN** the gate does not ask for recreating it

### Requirement: What Counts as a File the Session Saw

A file seen by its real path and named through a symlink, or the reverse, SHALL be the same file. A read that failed, and a call still in flight in the transcript, SHALL NOT make a file seen.

#### Scenario: A Failed Read

- **WHEN** a `Read` of a file failed and the agent later creates it
- **THEN** the gate does not ask, because the file was never seen

### Requirement: An Unreadable Command Asks

When the gate cannot parse a `Bash` command, it SHALL still apply the rules that read the whole text, and SHALL otherwise ask, with a text that says a person must approve the command.

#### Scenario: Unreadable

- **WHEN** a command cannot be parsed and matches no rule that reads the whole text
- **THEN** the gate asks
- **AND** the lab test is `gate/rules.test.ts`, "an unreadable command asks"

### Requirement: A Read-Only Ask Becomes an Allow

The gate SHALL answer `allow` to a `Bash` call whose engine verdict is an `ask` that no rule, setting, hook, or plugin made, when every command of the text only reads (`cd`, `ls`, `grep`, `rg`, `wc`, `pwd`, `which`, `echo`, `stat`, `du`, `df`, `head`, `tail`, and `git status`, `git diff`, `git log`) with no wrapper, no file redirect, and no `--output` or `--pre` flag. An ask a settings rule made SHALL stay an ask.

#### Scenario: A Bare Ask on a Read

- **WHEN** the engine asks with no rule on `git status`
- **THEN** the gate allows it
- **AND** an ask that a settings rule `Bash(git status)` made stays an ask
- **AND** the lab tests are `gate.test.ts`, "an ask a settings rule made on a read-only command stays an ask" and "an ask on `<command>` stays an ask"

### Requirement: A Gate Failure Asks

When the gate throws while it judges a call, it SHALL answer `ask` with the text "The gate failed: <error>. A person must approve this call.", where `<error>` is the failure's message, or its kind when it has no message, so the person can file the fault. The catch SHALL read the failure from the `next` argument of the handler and SHALL NOT call `next`, which would run the hooks beneath. A failed scan of a tool result SHALL withhold the result and name the failure.

#### Scenario: The Gate Fails

- **WHEN** a part of the check throws
- **THEN** the verdict is `ask`, and its reason matches "The gate failed: .+. A person must approve"
- **AND** the lab test is `gate.test.ts`, "a gate that fails holds the call for a person"

### Requirement: Each Ask and Deny Is Logged

The gate SHALL append one JSON line for each `ask` or `deny` verdict, and none for an `allow`, to `~/.claude/claudetto/gate-asks/<session id>.jsonl`. The line SHALL hold the time, the tool, the decision, the repository root, the rule (or the reason when no rule), and the command, with each of the last two cut to 200 characters and each secret in them replaced by `[REDACTED]`. A failed write SHALL lose its line and keep the verdict. Writes SHALL queue, so parallel checks lose no line.

#### Scenario: An Ask

- **WHEN** the engine asks on `git push` by the rule `Bash(git push:*)`
- **THEN** one line holds `tool`, `decision` `ask`, `rule` `Bash(git push:*)`, and `command` `git push`
- **AND** the lab tests are `gate.test.ts`, "an ask is logged with its rule, tool, and time", "a deny is logged", "an allow is not logged", and "a command past 200 characters is cut to 200"

### Requirement: A Repeat Denial Is Explained

When the same call (the same tool and input) has been denied twice since the person's last message, the gate SHALL deny it at `tool.check` before the engine answers, with a text that gives the count and the last reason, or "none given" when it was empty, and tells the agent to change the call or ask the person. A call with another input SHALL NOT be refused. A task notification SHALL NOT reset the count.

#### Scenario: Two Denials

- **WHEN** a call was denied twice with a reason, and the agent sends it again
- **THEN** the gate denies it with the count and the earlier reason
- **AND** the lab tests are `gate.test.ts`, "a call denied twice is refused at the next check with the earlier reason", "the same tool with another input is not refused after two denials", and "a task notification after two denials leaves the call refused"

## MODIFIED Requirements

### Requirement: Denied Calls Stop

After a `PermissionDenied` with a reason, the system SHALL answer `retry` for the first denial of a call since the person's last message, and SHALL NOT answer `retry` for the second. A denial with no reason, or one that says "(it gave no explanation)", SHALL NOT be retried. After the second denial, the repeat-denial check SHALL refuse the call with the reason and SHALL NOT tell the model to look for another way. The hook SHALL answer `retry` alone and never a decision. The rule reported SHALL be the gate's own rule.

#### Scenario: Denied Push

- **WHEN** a call is denied by a rule
- **THEN** the model receives the rule text and no hint to work around it

#### Scenario: Denied by the Gate

- **WHEN** the gate itself denies a call, at `tool.check` or at the permission dialog
- **THEN** the answer carries the gate's reason and the rule that denied it, and a dialog denial carries the command
- **AND** the first denial of that call is retried once and a second is left denied
- **AND** the lab tests are `gate.test.ts`, "a denied call is retried once, then left denied", "a denial with no reason is not retried", and "the denial hook answers retry alone, never a decision"

#### Scenario: Denied by the Engine

- **WHEN** the engine's own verdict is `deny` with a `rule`
- **THEN** the gate keeps the engine's reason and adds "The rule `<rule>` denies it.", because the engine's text does not name the rule and a model reads it as unexplained
- **AND** an engine denial with no rule keeps the engine's text unchanged
- **AND** the lab tests are `gate.test.ts`, "a rule denial of the engine names the rule beside its own text" and "a denial with no rule keeps the engine's text"

#### Scenario: The Rule Reported Is the Gate's

- **WHEN** the gate denies a call
- **THEN** the rule reported is the gate's own and not a `permissions.allow` rule to add, because no allow rule lifts a denial of this gate
- **AND** the gate stops a call that loses bytes for good, tampers with the system, or reads a secret, and a person lifts such a denial by changing the request
- **AND** "the exact rule to add", as this requirement first read, describes a denial by a settings rule and not by the gate

## REMOVED Requirements

### Requirement: A Secret Stays off the Command Line

**Reason**: No gate rule denies a secret expanded into an argument, and the person chose to remove it with `GATE_ENV_VALUES` and `GATE_ENV_DUMP`, which nothing uses.
**Migration**: None. Keep a secret in the environment with `export` and `exec`, as before.

### Requirement: A Search Pattern Is Not a Path

**Reason**: No secrets gate reads a `grep` or `rg` pattern as a path, so the rule has nothing to hold. The only gate that reads each word as a path is the wall check (`walled.ts:39`), which denies a path under a wall alone.
**Migration**: None. A pattern that spells no walled path passes.
