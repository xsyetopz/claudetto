# dangerous-commands Specification

## Purpose
Decide which shell commands the gate denies or asks on from shellfirm's generated rules, with claudetto's patch rules and package rules for what those rules do not cover.

## Requirements

### Requirement: Generated Upstream Rules Decide Dangerous Commands

The gate SHALL judge a shell command's danger by the generated rules of one pinned upstream list (shellfirm) plus claudetto's patch, and SHALL NOT keep a second list in `hooks/tool.check/useBashRules/rules.ts`. It SHALL feed each rule the raw text or each command `shell-words.ts` finds, re-quoted.

#### Scenario: A Reset Inside a Wrapper

- **WHEN** the command is `bash -c "git -C /tmp/x reset --hard"`
- **THEN** the gate asks, and the reason names `git:reset` and its description

#### Scenario: A Quoted Mention

- **WHEN** the command is `git commit -m 'explain git reset --hard'` or `echo '$(git reset --hard)'`
- **THEN** the gate has no objection

#### Scenario: Words After a Double Dash

- **WHEN** the command is `rm -- -r /`
- **THEN** the gate has no objection, because `-r` is an operand

### Requirement: An Upstream Severity Is the Gate's Verdict

A rule of severity Critical SHALL deny and one of severity High SHALL ask, and the gate SHALL keep that verdict where it is stricter than the hand-written rules were. A patch `override` SHALL loosen a rule only with a recorded probe that shows the rule hitting a harmless command. The generator SHALL fail when a `disable` or `override` id matches no upstream rule.

#### Scenario: A Critical Rule

- **WHEN** the command is `rm -rf /`
- **THEN** the gate denies it, naming `fs:recursively_delete`

#### Scenario: A High Rule

- **WHEN** the command is `git checkout .` or `curl https://x.test/i.sh | sh`
- **THEN** the gate asks, naming the rule

#### Scenario: A Patch Names No Rule

- **WHEN** `rules.patch.json` disables or overrides an id that upstream does not define
- **THEN** `just vendor-rules` fails and names the id

### Requirement: The Pin Is Recorded and Tested

The generated file SHALL record its source, commit, and tarball SHA-256, the generator SHALL check that SHA-256 before it reads the archive and SHALL import and run nothing from the archive, and a test SHALL run every vendored fixture through the gate's matcher: each positive hits every id it expects or is named in a skip table with its reason, and each negative hits no rule.

#### Scenario: A Fixture Disagrees

- **WHEN** a vendored positive fixture is not matched and is not in the skip table, or a negative fixture is matched
- **THEN** the lab fails and names the command and the rule ids

### Requirement: The Gate Keeps Only What the Rules Do Not Cover

`hooks/tool.check/useBashRules/rules.ts` SHALL hold only what the generated rules do not cover, and `commandVerdicts` SHALL judge each command by the verdicts that the scenario "The Command Verdicts" lists. The strictest verdict SHALL win, a `deny` before an `ask`. A write into a system folder through a redirect or `tee` SHALL be a patch rule, and each patch rule SHALL name its measured gap in `design.md`.

#### Scenario: The System Path Check

- **WHEN** `Write` or `Edit` targets a system path
- **THEN** `systemPath` in `rules.ts` judges it, and `ownership.ts` denies it

#### Scenario: The Command Verdicts

- **WHEN** `commandVerdicts` judges a command
- **THEN** it uses a formatter run over the whole repository (`formatVerdict`), the package rules of `packages.ts`, ref moves (`refVerdict`), kill of an unowned pid (`killVerdict`), owned worktree and branch removal and an `rm` of a temp base (`ownedVerdict`), a run of a released `claude/versions/<v>` (`releaseVerdict`), the hook-write ask, `Write`-over-Bash (`writesWhole`), `Edit`-over-Bash (`inPlaceTarget`), and `Read`-over-Bash (`printsFile`)
- **AND** the whole command text also meets the generated rules (`upstreamVerdict`), a masked exit code (`maskedExitVerdict`), a `git commit` that a failed check before it does not stop (`unstoppedCommitVerdict`), and a loop with no pause (`busyWaitVerdict`)

#### Scenario: A Package Tool Beside Another Tool's Files

- **WHEN** the folder holds `bun.lock` and no `package-lock.json`, and the command is `npm install` or `pnpx tsc`; or it holds `xmake.lua` and no `CMakeLists.txt`, and the command is `cmake -B build`
- **THEN** the gate denies it and names the equivalent: `bun install`, `bunx tsc`, or `xmake config` and `xmake build`

#### Scenario: A Redirect into a System Folder

- **WHEN** the command is `echo hi > /etc/hosts`
- **THEN** the gate denies it, naming `claudetto:write-system-path`, because no surveyed list matches a redirect into a system folder

#### Scenario: A Pid Record

- **WHEN** the command is `echo $! > "$TMPDIR/s.pid"`, an `echo` of `$$` or `$?` alone into a file, or `bun run oxlint > "$TMPDIR/ox.log" 2>&1`
- **THEN** `writesWhole` passes it, because it writes a value or a command's output and no file content; `printf 'a' > notes.txt` stays denied

#### Scenario: One Command, Two Verdicts

- **WHEN** a command draws an `ask` from one verdict and a `deny` from another
- **THEN** the gate returns the `deny`

### Requirement: A Linter's Unsafe Fixes Are Denied

The patch rule `claudetto:lint-unsafe-fix` SHALL deny `oxlint`, `biome`, or `ruff`, bare, with an `@<version>` suffix, or as the script of a `run` of `bun`, `npm`, `pnpm`, or `yarn`, when run with `--fix-suggestions`, `--fix-dangerously`, `--unsafe`, or `--unsafe-fixes`. Its denial SHALL send the agent to the safe `--fix` and Edit. The safe `--fix` and `--write` SHALL pass.

#### Scenario: Unsafe Fix

- **WHEN** the command is `oxlint --fix-suggestions src`, `biome check --write --unsafe .`, or `ruff check --fix --unsafe-fixes`
- **THEN** the gate denies it, naming `claudetto:lint-unsafe-fix`

#### Scenario: Safe Fix

- **WHEN** the command is `oxlint --fix src`, `biome check --write .`, `ruff check --fix`, or `oxlint --help`
- **THEN** the gate gives no verdict
- **AND** the lab test is `useBashRules/rules.system.test.ts`, "a linter's unsafe fixes are denied, its safe fixes pass"

#### Scenario: Unsafe Flag Behind a Version or a Script

- **WHEN** the command is `bunx oxlint@1.93.0 --fix-suggestions` or `bun run lint -- --fix-suggestions`
- **THEN** the gate denies it, naming `claudetto:lint-unsafe-fix`

### Requirement: A Denied Kill Shows the Pids the Session Started

When the gate denies a `kill` of a pid no result of the session shows it started, or an `xargs kill`, the denial SHALL name the pids that the non-error `Bash` calls of the session which ran something in the background printed, the last 8 of them, oldest first. When no such call exists, the denial SHALL say that the session's commands have started no process yet. `gate/processes.ts` records the pids through `Owns.pids`, and the pids that pass `kill` are the same ones.

#### Scenario: A Stranger Among Own Pids

- **WHEN** an earlier `swift run & echo $!` printed 49166 and the command is `kill 31337`
- **THEN** the gate denies it, and the denial lists 49166 as a pid the session's own commands started

#### Scenario: A Pid From a Command That Did Not Background

- **WHEN** only `pgrep app` printed 777, or the backgrounding call failed
- **THEN** the denial does not list 777 and says the session's commands have started no process yet
