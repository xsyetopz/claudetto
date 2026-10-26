## MODIFIED Requirements

### Requirement: Inventory

`claudetto-setup --inventory` SHALL print one JSON object with the plan, the enabled plugins, the built-in mods and their state, the MCP servers with their scope, the user skills with their description sizes, the state of the claude.ai skill sync, and the conflicts with the snippet.
It SHALL write no file.

#### Scenario: Duplicate Skill

- **WHEN** `~/.claude/skills/find-docs/SKILL.md` exists and `claudetto` is enabled
- **THEN** the inventory names `find-docs` as a copy of `claudetto:find-docs`, with its size

#### Scenario: Unused MCP Server

- **WHEN** the user config of `~/.claude.json` has the MCP server `apple-docs`, and the project uses no Apple framework
- **THEN** the inventory lists `apple-docs` with the scope `user`, and the skill `setup` asks the user whether to keep it

#### Scenario: Old Docs Plugin

- **WHEN** the enabled plugins hold `claudetto-docs`
- **THEN** the inventory names `claudetto-docs` as removed, with the command that uninstalls it

### Requirement: Subagent Cap Restart

Setup SHALL set `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` by plan tier from the bounds file of the `setup` module: Pro 3, Max 5x 4, and Max 20x 5.
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

### Requirement: Global Memory File

Setup SHALL write `~/.claude/CLAUDE.md` with the title `# CLAUDE.md`, an origin line, 3 rules of claudetto, and at most `GLOBAL_CLAUDE_MD_MAX_LINES` lines.
The 3 rules SHALL be these:

- Report results, not plans.
- Take a key, flag, or default from the repo or the docs of the installed version, and name the source.
- A value that the user set and an option that the user rejected stay until the user changes them.

It SHALL put its own lines between HTML comments and keep each user line outside them.
With `--apply`, it SHALL write `~/.claude/rules/claudetto-tests.md` when the file is not there, with a `paths:` list for test files and the rule of behavior tests, and SHALL leave an existing file as it is.
It SHALL list each `~/.claude/rules/*.md` in the inventory with its owner when a known installer wrote it, and SHALL list `claudetto-tests.md` with the owner `claudetto` and no offer.
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

#### Scenario: Old Block Gets the Rules

- **WHEN** `~/.claude/CLAUDE.md` has the block of an older setup with the origin line only
- **THEN** setup writes the block of a new file between the comments, and keeps each user line

#### Scenario: Rule for Test Files

- **WHEN** setup writes the global file with `--apply` and no `~/.claude/rules/claudetto-tests.md` exists
- **THEN** setup writes the file with its `paths:` list, and a later run leaves an edit of the user as it is

#### Scenario: Owned Rule Stays

- **WHEN** `~/.claude/rules/context7.md` holds the `ctx7` rule and `claudetto:find-docs` is on
- **THEN** setup leaves the file as it is and offers `ctx7 remove --claude --cli`
