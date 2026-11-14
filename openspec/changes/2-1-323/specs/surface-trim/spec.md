## ADDED Requirements

### Requirement: The Package Manager Is Detected at Session Start

A classic `SessionStart` command hook SHALL name the project's package manager once per session. It SHALL read the `packageManager` field of `package.json` first, then the lock files, and SHALL work for any package manager. Claudetto SHALL hold no Bun line in the prompt, no `BUN_FACT`, no `bunRuleEnabled` option, and no npm deny table, because those rules were hard-coded for one manager and enforced through denials.

#### Scenario: A Field and a Lock File Disagree

- **WHEN** `package.json` sets `packageManager` to `pnpm@9.0.0` and the folder also holds `bun.lock`
- **THEN** the hook names `pnpm`

#### Scenario: Only a Lock File

- **WHEN** `package.json` has no `packageManager` field and the folder holds `yarn.lock`
- **THEN** the hook names `yarn`

#### Scenario: An npm Command in a Bun Project

- **WHEN** the model runs `npm install` in a project whose manager is Bun
- **THEN** no claudetto hook denies the call

## MODIFIED Requirements

### Requirement: The Silent Turn Reminder Is Ours

Setup SHALL write `env.CLAUDE_CODE_SILENT_TURN_REMINDER` as `"0"`, which turns the reminder off, and SHALL remove `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` when it holds a text an earlier setup wrote, in `fill` and `replace` mode alike, because each reminder asks the model to write text in the middle of a turn of work. A text the user wrote stays.

#### Scenario: Setup Writes It

- **WHEN** the user picks "Features off" in setup
- **THEN** `env.CLAUDE_CODE_SILENT_TURN_REMINDER` is `"0"` and no reminder text is written (`groups.test.ts`)

#### Scenario: A Rerun Removes the Old Text

- **WHEN** `env.CLAUDE_CODE_SILENT_TURN_REMINDER_TEXT` holds a text an earlier setup wrote, and the user picks "Fill unset"
- **THEN** the key is gone, and a text the user wrote stays (`groups.test.ts`)

## REMOVED Requirements

### Requirement: Built-in Agents Are Withheld and Mapped

**Reason**: Settings turn the built-in agents off, and claudetto no longer denies an `Agent` call by its type.
**Migration**: Setup writes `CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS=1` and `permissions.deny` `Agent(<name>)` entries; see "Built-in Agents Are Off Through Settings" in `subagent-prompts`.

### Requirement: A Mapped Agent Call Runs in the Foreground and Is Rewritten Only When It Must Be

**Reason**: The `delegation.ts` deny that refused a foreground or non-`claudetto:` `Agent` call goes, so no call needs a mapping.
**Migration**: Agent calls reach Claude Code unchanged; see "Claudetto Denies No Agent Call by Its Type" in `subagent-prompts`.

### Requirement: A Whole Read of a Heavy File Is Denied

**Reason**: The read guard and its `readGuardEnabled` option go with the claudetto gates, which caused most denials in the session audits.
**Migration**: None; a `Read` with no `limit` runs as Claude Code allows it.

### Requirement: A Bun Repo Is Told It Uses Bun

**Reason**: The Bun rule was hard-coded for one package manager; `BUN_FACT` and `bunRuleEnabled` go.
**Migration**: See "The Package Manager Is Detected at Session Start" in this capability.
