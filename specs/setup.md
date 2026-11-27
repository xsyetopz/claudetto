# Setup

History, checks and sources: [evidence/setup.md](evidence/setup.md).

## SETUP-004 Statusline Answered From Prompt Text

claudetto answers `/statusline` from a Mod `skill.prompt` text, so no `statusline-setup` subagent run starts and the main model edits the settings file.

Given a TUI session
When `/statusline <request>` is typed
Then no `statusline-setup` Agent call is made
And vanilla makes one

## SETUP-007 Reminder Settings Stay Unset

claudetto leaves `totalTokensReminder`, `totalTokensReminderBudget`, `breakReminder`, `quietHours`, and `policyHelpers` unset, and writes `totalTokensReminder` "off" if it writes the reminder at all.

Given claudetto fills the settings
When the written settings are inspected
Then none of those keys is present
And `totalTokensReminder` is "off" if it is present

## SETUP-008 Plan-Accept Clear Setting

claudetto sets `showClearContextOnPlanAccept` true and leaves `plansDirectory`, `bashEditDiffEnabled`, `respondToBashCommands`, `askUserQuestionTimeout`, and `dialogExpiry` unset.

Given claudetto fills the settings
When the written settings are inspected
Then they hold `showClearContextOnPlanAccept: true`
And none of the five other keys is present

## SETUP-011 Builtins Turned Off at Session Start

claudetto, at session start, reads user settings and writes `false` for any id in the SETUP-010 constant that is not `false`, then runs `/reload-plugins` itself in an interactive session.

Given user settings where an id in the SETUP-010 constant is not `false`
When a session starts
Then user settings hold `false` for every id in the constant, including `cc-plugin-privacy@builtin`
And the user sees the notice
And a launch after the write loads no builtin

Given an interactive session
When the drift is repaired
Then claudetto runs `/reload-plugins` itself

Given a print session
When the drift is repaired
Then the command is refused
And the notice says the builtins stay loaded until the next start

## SETUP-022 Settings Never Written

claudetto never writes `disableAllHooks`, `disableSkillShellExecution`, `disableSideloadFlags`, `disableCommandPluginSources`, nor any key that removes /login, /logout, /doctor, or the updater, and never denies in `permissions.deny` a tool whose removal raises the request: removing ToolSearch adds 37,936 chars, Skill 8,720, and Bash saves 407 but takes the shell away.

Given a setup test
When any of these keys is written, or ToolSearch, Skill or Bash is in `permissions.deny`
Then the test fails
And it names the 2.1.327 cost (ToolSearch +28,025 bytes, Skill +8,855)

Given a shortened prompt piece changes behavior on the task set
When the change is reviewed
Then it is reverted
And the run is recorded

## SETUP-024 Sandbox Settles Shell Commands

claudetto enables the built-in sandbox and writes `sandbox.autoAllowBashIfSandboxed: true`, which approves sandboxed commands with no prompt and no classifier call, sets `allowUnsandboxedCommands` true so a blocked command retries outside under the permission flow, and lists no domains by hand.

Given a setup write
When the written settings are inspected
Then they hold `sandbox.enabled` and `autoAllowBashIfSandboxed: true`
And no hand-listed `allowedDomains`

## SETUP-027 Env Group Written

claudetto writes the env group: `CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH`="1", `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS`, `CLAUDE_CODE_DISABLE_CRON=1`, `CLAUDE_CODE_DISABLE_ADVISOR_TOOL`, and `worktree.baseRef` head.

Given claudetto fills the settings
When the written settings are inspected
Then each key is present
And `CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS` is "3" for every plan

## SETUP-033 Seven Tools Denied by Name

claudetto denies seven tools by name in `permissions.deny`, which removes each definition from the request: Workflow, ScheduleWakeup, ReportFindings, CronCreate, CronDelete, CronList, EnterPlanMode, while ExitPlanMode stays allowed.

Given the settings the fill wrote
When the first request is sent
Then it lacks the seven tool definitions

## SETUP-034 Temp Folder Write Rule

claudetto allows writes under `/private/var/folders` and denies `xcrun_db*` there.

Given the written `sandbox` group
When it is inspected
Then `allowWrite` holds `/private/var/folders`
And `denyWrite` holds `xcrun_db*`

## SETUP-036 Statusline Edit Text Names Settings File

claudetto names the settings file in the `/statusline` edit text under `CLAUDE_CONFIG_DIR` when it is set, and under HOME otherwise, so the model edits the file that bare `/statusline` writes.

Given a TUI `/statusline` run with `CLAUDE_CONFIG_DIR` set
When the edit text is sent
Then it names `settings.json` in that folder

## SETUP-044 Version Floor Constant

claudetto carries one version constant: each `plugin.json` `engines["claude-code"]` is `">=2.1.329"`, no hook or mod checks the running version, and claudetto runs `claude plugin validate` for the type check of a TypeScript hooks module.

Given the three `plugin.json` files
When they are inspected
Then each carries `engines["claude-code"]` `">=2.1.329"`
And `claude plugin validate` passes
And no hook reads the running version

## SETUP-047 No Hard-Coded Tool Versions

claudetto does not hard-code tool versions in setup's list (`Tool.version`, `SCANNER_VERSION`), and only the Claude Code floor stays pinned.

Given the repository
When `git grep SCANNER_VERSION` runs
Then it finds no hit

## SETUP-055 Output Limits Written

claudetto writes `bashOutputMaxChars: 8000` and `env.MAX_MCP_OUTPUT_TOKENS: "10000"`, so Claude Code truncates and the plugin cuts nothing.

Given claudetto fills the settings
When the written settings are inspected
Then both keys are present
And `MAX_MCP_OUTPUT_TOKENS` sits in `env` because it is read from process env

## SETUP-056 Stall Timeout Env Key

claudetto writes `CLAUDE_ASYNC_AGENT_STALL_TIMEOUT_MS` "900000" and no `CLAUDE_CODE_SCRIPT_CAPS`.

Given claudetto fills the settings
When the written env is inspected
Then it holds the stall timeout
And it holds no script caps key

## SETUP-058 No Avoidable Permission Prompts

claudetto removes the permission nagging that the Claude Code sandbox brings, through supported configuration and carefully scoped human approval, and keeps its own settings in the style of Claude's settings.json key-value conventions.

Given a normal run
When the model works through its tools
Then it raises no avoidable permission prompt

## SETUP-063 Silent-Turn Reminder Off

claudetto writes `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"` in the Features-off env and writes no `_TEXT` key, taking back a `_TEXT` value an earlier release wrote only through the ownership record of SETUP-071.

Given the construction of the settings
When its keys are listed
Then it names `CLAUDE_CODE_SILENT_TURN_REMINDER: "0"`
And it names no `_TEXT` key

## SETUP-064 Sandbox Block in Setup

claudetto writes the sandbox block of REQ-GUARDS (deny-list) in setup, with `withCacheDirs` and `cacheDirs` removed.

Given the written sandbox block
When it is inspected
Then it holds no `withCacheDirs` or `cacheDirs`
And it matches the guards item

## SETUP-070 No Approval Option of Its Own

claudetto offers no approval option of its own and writes no permission key, so unattended work uses Claude Code's `permissions.defaultMode` and `permissions.denyInsteadOfPrompting`.

Given the manifest and the hooks
When they are inspected
Then the manifest has no `autonomy` option
And no hook writes a permission key
And no source names `denyInsteadOfPrompting` or an `autonomy` store mark

## SETUP-071 Fill Built From the Release

claudetto, once per fill version at session start, builds its settings as one object from the release's own sources (the defaults, the guard rules and the walls) and applies it to user settings so that the construction wins over a user's value for each key it names.

Given a user who set `outputStyle: "Proactive"`
When the fill runs
Then `outputStyle` becomes `"claudetto:Claudetto"`
And records recurse and list entries it names are added
And a second fill changes nothing

Given a `Bash(...)` rule in `permissions.ask` or `permissions.deny` that matches a command the construction keeps free (`git stash`, `git stash list`, `git push origin main`)
When the fill runs
Then that rule is removed
And a rule in `permissions.allow` that matches a command it guards (`git stash clear`, `git push --force`, `claude -p x`) is removed
And rules that conflict with nothing are kept

Given a key the previous fill recorded in the store (`setup.owned`) that the construction no longer names
When the fill runs
Then the key is deleted only while it holds the value claudetto wrote
And the notice names values set, replaced and entries removed

## SETUP-072 Engineering Laws as User Rules

claudetto setup installs each engineering law the release ships (`plugins/claudetto/rules/laws/*.md`) as a user rule in `<config>/rules/claudetto/`, so it loads in every project outside the global `CLAUDE.md`, and keeps it current across releases while a user's edit or removal stands.

Given a first session start
When setup runs
Then each shipped law is in `<config>/rules/claudetto/`

Given a rule the user edited or removed
When a later release changes that law
Then the rule stays as the user left it

Given a rule that still holds the text claudetto wrote
When a release changes or retires that law
Then the rule takes the new text, or is emptied when retired

## SETUP-073 Session Start Held at Most 5 Seconds

claudetto's tool registrations, rule install and settings fill hold the `session.start` dispatch for at most 5 seconds and finish afterwards on their own, because a typed slash command waits on that dispatch and one engine call that never answers kept "Running SessionStart hooks…" on screen for hours.

Given a settings file read that never answers
When a session starts
Then the session start returns 5 seconds in
