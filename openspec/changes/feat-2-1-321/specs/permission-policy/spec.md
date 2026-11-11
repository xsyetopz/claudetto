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

## ADDED Requirements

### Requirement: A Temp Base Itself Stays

A temp base is `/tmp`, `/tmp/claude`, or `/tmp/claude-<uid>`, each with or without `/private` before it, or `$TMPDIR` as written. The gate SHALL deny an `rm` that names a temp base itself, every entry of one through a glob, or a path under one that holds `..`, and the denial SHALL tell the agent to name the folder it made. Any other `rm` under a temp base SHALL pass.

#### Scenario: A Scratch Folder

- **WHEN** the agent runs `rm -rf /tmp/claude-501/gate20` or `rm /tmp/el.log`
- **THEN** the call passes
- **AND** the lab tests are in `gate/processes.owned.test.ts`

#### Scenario: The Base Itself

- **WHEN** the agent runs `rm -rf /tmp`, `rm -rf /private/tmp/claude-501`, `rm -rf /tmp/claude-501/*`, `rm -rf "$TMPDIR"`, or `rm -rf /tmp/mine/../other`
- **THEN** the call is denied

## REMOVED Requirements

### Requirement: A /tmp Folder Carries Its Session's Marker

**Reason**: The marker stopped no delete of another session's folder in 58 sampled denials, and none of the 9,567 folders in the temp base held one, because test runs make the folders and no rule reaches them.

**Migration**: Make a temp folder with a plain `mkdir` or `mktemp`. A `.created-by-claudetto` file that is there already is an ordinary file.

### Requirement: A /tmp Removal Needs This Session's Marker

**Reason**: The rule denied the removal of the session's own scratch files and folders, about 350 times in three days.

**Migration**: Remove a temp folder with a plain `rm`. The requirement "A Temp Base Itself Stays" keeps the base and a path with `..` denied.
