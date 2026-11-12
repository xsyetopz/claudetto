## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: A Denied Kill Shows the Pids the Session Started

When the gate denies a `kill` of a pid no result of the session shows it started, or an `xargs kill`, the denial SHALL name the pids that the non-error `Bash` calls of the session which ran something in the background printed, the last 8 of them, oldest first. When no such call exists, the denial SHALL say that the session's commands have started no process yet. `gate/processes.ts` records the pids through `Owns.pids`, and the pids that pass `kill` are the same ones.

#### Scenario: A Stranger Among Own Pids

- **WHEN** an earlier `swift run & echo $!` printed 49166 and the command is `kill 31337`
- **THEN** the gate denies it, and the denial lists 49166 as a pid the session's own commands started

#### Scenario: A Pid From a Command That Did Not Background

- **WHEN** only `pgrep app` printed 777, or the backgrounding call failed
- **THEN** the denial does not list 777 and says the session's commands have started no process yet
