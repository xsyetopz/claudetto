## ADDED Requirements

### Requirement: The Permission Gates Group Replaces the Bash Gate

Setup SHALL offer a "Permission gates" group that writes the settings of the `permission-policy` spec: `permissions.ask` for a branch move (`Bash(git reset *)`, `Bash(git update-ref *)`, `Bash(git branch -f *)`), for `Bash(git worktree remove *)`, and for a branch delete; `permissions.deny` for `Bash(pkill *)` and `Bash(killall *)`; and `permissions.allow` for read-only commands. It SHALL keep each permission rule the user holds.

#### Scenario: The Group Written

- **WHEN** setup writes "Permission gates" on an empty file
- **THEN** `permissions.ask` holds the branch-move, worktree-remove, and branch-delete rules, and `permissions.deny` holds `Bash(pkill *)` and `Bash(killall *)`

#### Scenario: The User's Rules Kept

- **WHEN** the user's `permissions.allow` holds `Bash(ls)`
- **THEN** the written list holds `Bash(ls)` beside the read-only rules the group adds

## MODIFIED Requirements

### Requirement: The Shipped Code Rules Are Offered as Copies

Setup SHALL offer each of the eight shipped rules as a copy to `<config>/rules/claudetto/<name>.md`, showing the whole rule text and saying that a session loads it at its start. It SHALL offer none that the user already holds byte for byte, SHALL store the SHA-256 of a copy it wrote, and SHALL stop the rest when a question is dismissed.

#### Scenario: Each Missing Rule

- **WHEN** the user holds none of the rules
- **THEN** setup offers `useLeastCode`, `noUnrequestedEdits`, `noImpossibleStateGuards`, `findFactsByExperiment`, `useOneObviousWay`, `useBlockLanguage`, `lookForAClone`, and `useHeadlineseNames`
- **AND** each is a dialog of its own, and a Write puts the shipped text under `rules/claudetto` and writes no settings key (`hooks/command.run/useSetup/setup.rules.test.ts`, "each rule the user lacks is a dialog of its own", "Write puts the shipped text under rules/claudetto and writes no settings key")

#### Scenario: The Naming Rule

- **WHEN** the user holds no `useHeadlineseNames.md` copy
- **THEN** setup offers it as a dialog of its own, with the text the `naming-rule` spec states

#### Scenario: A Dismissed Question

- **WHEN** a rule question is dismissed
- **THEN** the rest are not asked and the report says so ("a dismissed rule dialog stops the rest and says so")

#### Scenario: The Dialog Text

- **WHEN** a rule dialog opens
- **THEN** it shows the whole rule and says the rule loads at the start of a session ("a rule dialog shows the whole rule and says it loads at session start")

### Requirement: The Models and Windows Group Carries Fixed Values

The "Models and windows" group SHALL write `model` Opus 5.5 at `effortLevel` `medium`, `fallbackModel` Sonnet 5.5, `modelSettings` with a `maxEffortLevel` per model, and for Haiku 5.5 an `autoCompactWindow` of 200000; `idleCompaction` `false`, and the default-model env vars. It SHALL NOT write a top-level `autoCompactWindow` or `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`, so Opus 5.5 and Sonnet 5.5 compact at Claude Code's default window.

#### Scenario: Haiku Window

- **WHEN** the "Models and windows" group is written
- **THEN** `modelSettings["claude-haiku-5-5"].autoCompactWindow` is 200000

#### Scenario: Default Window for the Others

- **WHEN** the "Models and windows" group is written
- **THEN** the file holds no top-level `autoCompactWindow` and no `env.CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`

### Requirement: Setup Caps Subagent Nesting at One

The setup env group SHALL write `env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` as `"1"`, and its description SHALL name subagents that start subagents among what it turns off. Each spawn cap SHALL go through Claude Code's own env keys: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`, `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, and `CLAUDE_CODE_MAX_SUBAGENTS_PER_SESSION`. No mod SHALL count spawns or deny an `Agent` call to enforce a cap.

#### Scenario: A Clean Write

- **WHEN** setup writes the env group
- **THEN** `env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH` is `"1"` (`hooks/command.run/useSetup/settings.test.ts`)

#### Scenario: A Nested Agent

- **WHEN** a subagent at depth 1 would start another subagent
- **THEN** Claude Code has dropped the `Agent` tool from it, and no claudetto hook judges the call

### Requirement: The Protected Paths Group Denies Each Wall's Reads

The "Protected paths" group SHALL write, for each `protectedPaths` entry, `permissions.deny` `Read(<wall>/**)` and the wall in both `sandbox.filesystem.denyRead` and `sandbox.filesystem.denyWrite`. The `Read` rule SHALL use `~/` for a path under `~`, `$HOME`, or `${HOME}`, and `//` for any other. With no entry it SHALL be no group.

#### Scenario: Three Spellings

- **WHEN** `protectedPaths` holds `~/.claudetto-holdout`, `$HOME/b`, and `/srv/holdout/`
- **THEN** the deny list holds `Read(~/.claudetto-holdout/**)`, `Read(~/b/**)`, and `Read(//srv/holdout/**)`

#### Scenario: Sandbox Walls

- **WHEN** `protectedPaths` holds `~/.claudetto-holdout`
- **THEN** `sandbox.filesystem.denyRead` and `sandbox.filesystem.denyWrite` each hold that path

#### Scenario: No Protected Path

- **WHEN** `protectedPaths` is empty
- **THEN** setup writes no `Read` deny and no sandbox wall for it
