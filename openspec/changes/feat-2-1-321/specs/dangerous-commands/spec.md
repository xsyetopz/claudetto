## MODIFIED Requirements

### Requirement: The Gate Keeps Only What the Rules Do Not Cover

`hooks/gate/rules.ts` SHALL hold only what the generated rules do not cover, and `commandVerdicts` SHALL judge each command by the verdicts that the scenario "The Command Verdicts" lists. The strictest verdict SHALL win, a `deny` before an `ask`. A write into a system folder through a redirect or `tee` SHALL be a patch rule, and each patch rule SHALL name its measured gap in `design.md`. `writesWhole` SHALL pass an `echo` of `$!`, `$$`, or `$?` alone, which records a value and no file content.

#### Scenario: The System Path Check

- **WHEN** `Write` or `Edit` targets a system path
- **THEN** `systemPath` judges it, and it stays in `gate.ts`

#### Scenario: The Command Verdicts

- **WHEN** `commandVerdicts` judges a command
- **THEN** it uses the package rules of `packages.ts`, ref moves (`refVerdict`), kill of an unowned pid (`killVerdict`), owned worktree and branch removal and an `rm` of a temp base (`ownedVerdict`), a run of a released `claude/versions/<v>` (`releaseVerdict`), the hook-write ask, `Write`-over-Bash (`writesWhole`), and `Read`-over-Bash (`printsFile`)

#### Scenario: A Package Tool Beside Another Tool's Files

- **WHEN** the folder holds `bun.lock` and no `package-lock.json`, and the command is `npm install` or `pnpx tsc`; or it holds `xmake.lua` and no `CMakeLists.txt`, and the command is `cmake -B build`
- **THEN** the gate denies it and names the equivalent: `bun install`, `bunx tsc`, or `xmake config` and `xmake build`

#### Scenario: A Redirect into a System Folder

- **WHEN** the command is `echo hi > /etc/hosts`
- **THEN** the gate denies it, naming `claudetto:write-system-path`, because no surveyed list matches a redirect into a system folder

#### Scenario: A Pid Record

- **WHEN** the command is `echo $! > "$TMPDIR/s.pid"`, or `bun run oxlint > "$TMPDIR/ox.log" 2>&1`
- **THEN** the gate passes it, because it writes a value or a command's output; `printf 'a' > notes.txt` stays denied

#### Scenario: One Command, Two Verdicts

- **WHEN** a command draws an `ask` from one verdict and a `deny` from another
- **THEN** the gate returns the `deny`
