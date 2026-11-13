## REMOVED Requirements

### Requirement: Generated Upstream Rules Decide Dangerous Commands

**Reason**: The Bash gate in `tool.check/useBashRules/` is deleted, together with the vendored shellfirm rules, their fixtures, and their licence, because Claude Code's own `permissions`, sandbox, and `autoMode` gates do this job.

**Migration**: Setup writes `permissions.ask` for branch moves, `git worktree remove`, and branch deletes, `permissions.deny` for `pkill` and `killall`, and the `autoMode` lists, as the `permission-policy` spec states.

### Requirement: An Upstream Severity Is the Gate's Verdict

**Reason**: No vendored rule is left to carry a severity, because the rules go with the gate.

**Migration**: The `permissions.deny` and `permissions.ask` rules that setup writes, and the `autoMode.hard_deny` and `autoMode.soft_deny` lists, give the verdicts.

### Requirement: The Pin Is Recorded and Tested

**Reason**: The generated file, its generator, its pin, and its fixtures are deleted with the vendored rules.

**Migration**: None is needed. Claude Code maintains the `permissions`, sandbox, and `autoMode` gates that setup configures.

### Requirement: The Gate Keeps Only What the Rules Do Not Cover

**Reason**: `rules.ts`, `commandVerdicts`, and every verdict they combine are deleted with the gate.

**Migration**: The settings that setup writes take over: `permissions.ask`, `permissions.deny`, `permissions.allow`, `sandbox.filesystem.denyRead` and `denyWrite`, and `autoMode`. The read and write advice stays in the Bash tool text, and no denial enforces it.

### Requirement: A Linter's Unsafe Fixes Are Denied

**Reason**: The patch rule `claudetto:lint-unsafe-fix` is deleted with the gate and its patch file.

**Migration**: The `autoMode` lists that setup writes judge the command, and Claude Code's permission dialog asks where no rule settles it.

### Requirement: A Denied Kill Shows the Pids the Session Started

**Reason**: The kill rule and its record of the session's pids are deleted with the gate.

**Migration**: Setup writes `permissions.deny` for `Bash(pkill *)` and `Bash(killall *)`, and the agent stops its own tasks with `TaskStop`.
