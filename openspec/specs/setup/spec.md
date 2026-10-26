# setup Specification

## Purpose
`/claudetto:setup` writes the claudetto settings into a settings file, removes what an older claudetto wrote, and keeps each key of the user.

## Requirements

### Requirement: Merge Keeps User Keys

Setup SHALL merge the snippet into the chosen settings file and keep each key and rule of the user that the snippet does not own, when the user chooses `merge`.
Before it writes, it SHALL list each key where the user value and the snippet value differ, and the user chooses which value stays.

#### Scenario: User Allow Rule

- **WHEN** the user settings have `permissions.allow: ["Bash(make *)"]` and setup runs in `merge` mode
- **THEN** the file still has `Bash(make *)`

#### Scenario: Conflicting Value

- **WHEN** the user settings have `"cc-plugin-you-should-know@builtin": true` and setup runs in `merge` mode
- **THEN** the inventory lists the key with both values, and setup writes the value that the user chose

### Requirement: Plan Tier

Setup SHALL read the plan of the login and write the subagent cap of `agent-roster` for it.
When it cannot read the plan, it SHALL write no cap and say so.
It SHALL read only the plan keys of `oauthAccount` in `~/.claude.json`, and SHALL NOT print an email, a name, or a UUID.

#### Scenario: Unknown Tier

- **WHEN** `~/.claude.json` has no tier that setup knows
- **THEN** setup writes no cap and names the tier that it found

#### Scenario: No Identity in the Output

- **WHEN** setup runs with `--inventory` on a login with an email address
- **THEN** the output does not hold the email address, the organization name, or a UUID

### Requirement: No Code-Intelligence Offer

Setup SHALL NOT offer or run `codegraph install` or another code-intelligence installer.

#### Scenario: Setup Run

- **WHEN** setup runs in a project of any language
- **THEN** it offers no code-intelligence tool, and it writes no `UserPromptSubmit` hook

### Requirement: Inventory

`claudetto-setup --inventory` SHALL print one JSON object with the plan, the enabled plugins, the built-in mods and their state, the MCP servers with their scope, the user skills with their description sizes, the state of the claude.ai skill sync, and the conflicts with the snippet.
It SHALL write no file.

#### Scenario: Duplicate Skill

- **WHEN** `~/.claude/skills/find-docs/SKILL.md` exists and `claudetto-docs` is enabled
- **THEN** the inventory names `find-docs` as a copy of `claudetto-docs:find-docs`, with its size

#### Scenario: Unused MCP Server

- **WHEN** the user config of `~/.claude.json` has the MCP server `apple-docs`, and the project uses no Apple framework
- **THEN** the inventory lists `apple-docs` with the scope `user`, and the skill `setup` asks the user whether to keep it

### Requirement: Merge or Replace

The skill `setup` SHALL show the inventory and ask the user to choose `merge` or `replace`, with `merge` first.
`replace` SHALL write the snippet as the whole file, keep a backup of the old file next to it, and print the path of the backup.

#### Scenario: Replace

- **WHEN** the user chooses `replace`
- **THEN** the settings file equals the snippet, and a backup file holds the old content

### Requirement: Demo Mode Note

Setup SHALL tell the user that `IS_DEMO=1 claude` hides the email and the organization, and that it also skips the trust, MCP approval, API key, and bypass mode dialogs.
It SHALL offer a shell alias `claude-demo` for that command, and SHALL write `IS_DEMO` to no settings file.

#### Scenario: Demo Mode Asked

- **WHEN** the user asks setup to hide the email
- **THEN** setup gives the skipped dialogs and offers the `claude-demo` alias, and the settings file has no `IS_DEMO`

#### Scenario: Demo Alias

- **WHEN** the user says yes to the alias
- **THEN** the rc file of the shell of the user holds `alias claude-demo='IS_DEMO=1 claude'` once

### Requirement: Jev Key in Secure Storage

`plugin.json` SHALL hold `userConfig.TYPESAFE_API_KEY` with `sensitive: true`.
`decide` and `guard` SHALL read the key from `register(on, options)` or from `CLAUDE_PLUGIN_OPTION_TYPESAFE_API_KEY`.

#### Scenario: Key Set

- **WHEN** the user entered a key at install
- **THEN** the key is in secure storage and Jev runs

#### Scenario: Key Not in Settings

- **WHEN** setup writes the settings file
- **THEN** the file holds no key value

### Requirement: Unused MCP Servers

The skill `setup` SHALL offer a `deniedMcpServers` entry in the project settings for each MCP server that the project does not use, and write it only when the user agrees.

#### Scenario: Apple Docs

- **WHEN** the project uses no Apple framework and the user has `apple-docs`
- **THEN** setup offers `deniedMcpServers` for `apple-docs`

### Requirement: Subagent Cap Restart

Setup SHALL set `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan tier from `slices/setup/limits.ts`: Pro 3, Max 5x 4, and Max 20x 5.
For an API key or an unknown tier, it SHALL keep the value of the user.
It SHALL say when a restart is needed.

#### Scenario: Max 20x Cap

- **WHEN** the plan is Max 20x and the user value is `6`
- **THEN** setup writes `5`

#### Scenario: Unknown Tier Cap

- **WHEN** the tier is unknown and the user value is `6`
- **THEN** setup keeps `6`

#### Scenario: Cap Changed

- **WHEN** setup changes the cap in a running session
- **THEN** setup tells the user to restart Claude Code

### Requirement: Old Deny Rules Go

Setup SHALL remove `Bash(rm -rf /*)` and `Bash(rm -rf ~/*)` from the user settings, and SHALL report each removed rule.

#### Scenario: Upgrade from Alpha 1

- **WHEN** setup runs on a settings file that the 0.3.0-alpha.1 setup wrote
- **THEN** the file has no `Bash(rm -rf /*)` and no `Bash(rm -rf ~/*)`, and setup lists both

### Requirement: Off or On for Each Item

Setup SHALL list each tool, MCP server, LSP plugin, and skill that a session loads, with its docs text, and SHALL ask the user off or on for each.
It SHALL write an off tool as a bare name in `permissions.deny`, an off MCP server in `deniedMcpServers` of the project settings, an off plugin in `enabledPlugins` of the project settings, and an off skill in `skillOverrides` as `off`.

#### Scenario: Tool Off

- **WHEN** the user turns off `NotebookEdit`
- **THEN** `permissions.deny` holds `NotebookEdit`

#### Scenario: Server Off in One Project

- **WHEN** the user turns off `apple-docs` in this project
- **THEN** the project settings hold `deniedMcpServers` with `apple-docs`, and the user settings keep the server

#### Scenario: Skill Off

- **WHEN** the user turns off the user skill `find-skills`
- **THEN** `skillOverrides` holds `"find-skills": "off"`

### Requirement: OpenSpec Goes

The inventory SHALL find each OpenSpec install: `@fission-ai/openspec` in the global packages of `bun`, `npm`, `pnpm`, or `yarn`, an `openspec` on `PATH`, and the `openspec-*` skills and `opsx` commands in `~/.claude/` and in the project.
After the yes of the plan of changes, setup SHALL remove each one with the tool that owns it and SHALL check that `openspec` is not on `PATH`.

#### Scenario: Global Bun Install

- **WHEN** `bun pm ls -g` lists `@fission-ai/openspec@1.14.3`
- **THEN** setup runs `bun remove -g @fission-ai/openspec`, and `which openspec` finds nothing

#### Scenario: Dev Dependency Stays

- **WHEN** a project lists `@fission-ai/openspec` only in `devDependencies`
- **THEN** setup reports it and leaves it

### Requirement: Global Memory File

Setup SHALL write `~/.claude/CLAUDE.md` with the title `# CLAUDE.md`, an origin line, and at most `GLOBAL_CLAUDE_MD_MAX_LINES` lines.
It SHALL put its own lines between HTML comments and keep each user line outside them.
It SHALL list each `~/.claude/rules/*.md` in the inventory with its owner when a known installer wrote it.
It SHALL NOT edit, fold, or delete an owned file, and SHALL offer only the owner's removal command for it.
It SHALL offer to fold or remove a rule with no known owner.

#### Scenario: New Global File

- **WHEN** no `~/.claude/CLAUDE.md` exists and the user says yes to the plan
- **THEN** the file starts with `# CLAUDE.md`, names claudetto setup as its origin, and has 20 lines or fewer

#### Scenario: User Lines Stay

- **WHEN** `~/.claude/CLAUDE.md` has user lines outside the claudetto comments
- **THEN** setup rewrites only the lines between the comments

#### Scenario: Rules of the User Are Not a Template

- **WHEN** setup runs for a second user with no `~/.claude/CLAUDE.md`
- **THEN** the new file holds the origin block and the answers of that user, and no toolchain line of another user

#### Scenario: Over the Bound

- **WHEN** the user lines and the claudetto lines add up to more than 20 lines
- **THEN** setup writes nothing and asks the user which lines to move to `~/.claude/rules/`

#### Scenario: Owned Rule Stays

- **WHEN** `~/.claude/rules/context7.md` holds the `ctx7` rule and `claudetto-docs:find-docs` is on
- **THEN** setup leaves the file as it is and offers `ctx7 remove --claude --cli`
