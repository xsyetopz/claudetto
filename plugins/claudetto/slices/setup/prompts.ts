import {
  AUTOCOMPACT_PCT,
  CONTEXT_WINDOW,
  HAIKU_AUTOCOMPACT_WINDOW,
  MCP_DESCRIPTION_MAX_CHARS,
} from "../../kernel/budget.ts";

/** The size of the description of `claudetto-docs:find-docs`, which loads in each session. */
export const DOCS_SKILL_CHARS = 143;

const ALIAS = `alias claude-demo='IS_DEMO=1 claude'`;

/** One message for each line as `key=text`, with `{name}` for a value. */
const TEXT = `
backup=Kept the old settings in {file}.
context7={file}: {chars} characters in each session. The skill \`claudetto-docs:find-docs\` gets the same Context7 docs with ${DOCS_SKILL_CHARS} characters, so keep one of the two.
demoAlias=${ALIAS}
demoHeader=# claudetto: Claude Code in demo mode, which hides the email and the organization.
demoNoRc=Setup knows no startup file for the shell {shell}. Add this line to it yourself: ${ALIAS}
demoWrote={file} has the alias claude-demo. Open a new shell to use it.
denyMcpScope=--deny-mcp and --off-plugin write only the project settings, so use them with --scope project.
droppedEntry=\`{key}\`: removed the entry \`{entry}\` of 0.3.0-alpha.1.
dryRun=Dry run. Run again with --apply to write these changes.
mdEnd=<!-- /claudetto setup -->
mdMatch={file} is up to date.
mdOrigin=This file comes from claudetto setup. Edit each line below the block freely.
mdOver={file} would have {lines} lines, and the limit is {max}. Setup wrote nothing. Ask the user which lines move to ~/.claude/rules/, then run setup again.
mdStart=<!-- claudetto setup: /claudetto:setup rewrites only this block -->
mdTitle=# CLAUDE.md
mdWrote=Wrote {file}. Restart Claude Code to load it.
keptKey=Kept your {key}, because it runs another tool.
notesWrote={file} is the file for your notes in this project, and .gitignore lists it.
noPlanCap=The plan tier {tier} has no subagent cap in claudetto, so setup writes no CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.
projectNoCap=Project settings get no CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS, because the cap comes from the plan of each login. Run setup with the user or local scope for it.
projectNoStatus=Project settings get no status line, because its command runs claudetto from the plugin cache of each user, and a person who shares the project can have no claudetto. Run setup with the user or local scope for it.
openspecDev={file} lists @fission-ai/openspec as a dependency of the project. Setup leaves it, because a test or a script of the project can run OpenSpec. Remove it yourself when none does.
openspecFile={file} is a skill or command of OpenSpec. Setup deletes it, because minispec replaces OpenSpec.
openspecGlobal=OpenSpec {version} is a global package of {manager}. Setup removes it with \`{command}\`.
openspecPath={file} is \`openspec\` on the PATH. Setup removes the package that owns it.
openspecFailed=\`{command}\` failed. Run it yourself.
openspecStill=\`openspec\` is still on the PATH at {file}. Remove it yourself.
ruleEdits=The removal command also deletes any edit that you made to the file.
settingsFailed={file}: {message} Nothing changed.
settingsMatch=Settings match the snippet.
unknownScope=Unknown scope "{scope}". Use user, project, or local.
usage=Usage: claudetto-setup [--scope user|project|local] [--mode merge|replace] [--keep KEY]... [--off-tool NAME]... [--off-skill NAME]... [--off-plugin ID]... [--deny-mcp NAME]... [--exclude-md GLOB]... [--apply | --inventory | --demo-alias | (--remove-openspec | --global-md [--global-rule LINE]... | --local-notes) [--apply]]
wrote=Wrote {file}. Restart Claude Code for the env and model settings to take effect.
`;

const MESSAGES = new Map(
  TEXT.trim()
    .split("\n")
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]),
);

/** The message `key`, with each `{name}` replaced by its value in `v`. */
export const t = (key: string, v: Record<string, string | number> = {}) =>
  (MESSAGES.get(key) ?? key).replace(/\{(\w+)\}/g, (_, k) => String(v[k]));

export const LOCAL_NOTES_TEMPLATE = `# CLAUDE.local.md
<!-- Notes for this project that only you read. Git ignores this file. -->
`;

const list = (text: string, by: string | RegExp = /\s+/) =>
  text
    .split(by)
    .map((s) => s.trim())
    .filter(Boolean);

/** The status line command picks the newest installed folder of the plugin, so an update of the plugin needs no second setup. */
const STATUSLINE_COMMAND = `bun --no-env-file "$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claudetto/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline"`;

export const SNIPPET = {
  $schema:
    "https://raw.githubusercontent.com/xsyetopz/claude-code-docs/main/schemas/claude-code-settings.json",
  syncClaudeAiSkills: false,
  syncClaudeAiPlugins: false,
  env: {
    ENABLE_CLAUDEAI_MCP_SERVERS: "false",
    CLAUDE_CODE_MAX_MCP_DESCRIPTION_LENGTH: String(MCP_DESCRIPTION_MAX_CHARS),
    CLAUDE_CODE_DISABLE_FAST_MODE: "1",
    CLAUDE_CODE_PROMPT_CACHE_TTL: "1h",
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: String(AUTOCOMPACT_PCT),
    CLAUDE_CODE_DISABLE_GIT_INSTRUCTIONS: "1",
    CLAUDE_CODE_TOTAL_TOKENS_REMINDER: "off",
    CLAUDE_CODE_BASH_OUTPUT_AUDIENCE_NOTE: "0",
    CLAUDE_CODE_DISABLE_ADVISOR_TOOL: "1",
    CLAUDE_CODE_AUTO_CONNECT_IDE: "false",
    CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY: "1",
    CLAUDE_CODE_DISABLE_TERMINAL_TITLE: "1",
    CLAUDE_CODE_IDE_SKIP_AUTO_INSTALL: "1",
    CLAUDE_CODE_SILENT_TURN_REMINDER: "0",
    DISABLE_ERROR_REPORTING: "1",
    CLAUDE_CODE_DISABLE_CFC_PROMPT: "1",
    CLAUDE_CODE_DISABLE_CRON: "1",
    CLAUDE_CODE_DISABLE_EXPLORE_PLAN_AGENTS: "1",
    CLAUDE_CODE_FORK_SUBAGENT: "0",
    CLAUDE_CODE_MEMORY_SUBAGENT_APPEND: "1",
    CLAUDE_CODE_PLAN_V2_AGENT_COUNT: "1",
    CLAUDE_CODE_PLAN_V2_EXPLORE_AGENT_COUNT: "1",
    CLAUDE_CODE_TODO_REMINDER_MODE: "off",
    DISABLE_EXTRA_USAGE_COMMAND: "1",
    DISABLE_FEEDBACK_COMMAND: "1",
    DISABLE_INSTALL_GITHUB_APP_COMMAND: "1",
  },
  permissions: {
    deny: list(
      `Read(**/.env) | Read(**/.env.local) | Read(**/.env.production) | Read(**/.env.*.local) | Read(**/.env.development) | Read(**/.env.dev)
      | Read(**/.env.staging) | Read(**/.env.stage) | Read(**/.env.test) | Read(**/.env.prod) | Read(**/.env.qa) | Read(**/.env.preview)
      | Read(~/.ssh/**) | Read(~/.aws/credentials) | Read(~/.gnupg/**) | Read(~/.netrc) | Read(~/.docker/config.json)
      | Bash(rm -rf /) | Bash(rm -rf ~) | Bash(mkfs *) | Bash(mkfs.*) | Bash(dd * of=/dev/*) | Bash(rm -rf ~/) | Bash(rm -rf $HOME) | Bash(rm -rf "$HOME")
      | Bash(sudo *) | Bash(doas *) | Bash(su *) | Bash(newfs*) | Bash(diskutil erase*) | Bash(diskutil zero*) | Bash(diskutil secureErase*)
      | Bash(diskutil partition*) | Bash(diskutil reformat*) | Bash(csrutil disable*) | Bash(csrutil clear*) | Bash(csrutil authenticated-root *)
      | Bash(spctl --master-disable*) | Bash(spctl --global-disable*) | Bash(nvram *=*) | Bash(nvram -d *) | Bash(nvram -c*) | Bash(security delete-*)
      | Edit(//System/**) | Edit(//Library/**) | Edit(//usr/bin/**) | Edit(//usr/sbin/**) | Edit(//usr/lib/**) | Edit(//usr/libexec/**) | Edit(//usr/share/**)
      | Agent(general-purpose) | Agent(Explore) | Agent(Plan) | Agent(claude) | Agent(claude-code-guide) | Agent(statusline-setup) | Agent(fork)
      | mcp__computer-use | ScheduleWakeup | ReportFindings | EnterPlanMode | ExitPlanMode | Workflow | Artifact | DesignSync | RemoteTrigger
      | TaskCreate | TaskGet | TaskList | TaskUpdate`,
      "|",
    ),
    defaultMode: "default",
    disableAutoMode: "disable",
  },
  disableClaudeAiConnectors: true,
  skillOverrides: { "plugin-authoring": "name-only" },
  disableBundledSkills: true,
  worktree: { baseRef: "head" },
  disableAgentView: true,
  disableRemoteControl: true,
  enableArtifact: false,
  enableWorkflows: false,
  statusLine: {
    type: "command",
    command: STATUSLINE_COMMAND,
    padding: 0,
    refreshInterval: 5,
    hideVimModeIndicator: true,
  },
  subagentStatusLine: {
    type: "command",
    command: `${STATUSLINE_COMMAND} --subagent`,
  },
  enabledPlugins: Object.fromEntries(
    list(
      "agents-md claude-test diff easel mermaid mods-guide plugin-authoring responsive-mode telemetry tips you-should-know",
    ).map((name) => [`cc-plugin-${name}@builtin`, false]),
  ),
  outputStyle: "claudetto:Concise",
  feedbackDrafts: "off",
  spinnerTipsEnabled: false,
  modelSettings: {
    "claude-opus-5-5": { maxEffortLevel: "high" },
    "claude-sonnet-5-5": { maxEffortLevel: "medium" },
    "claude-haiku-5-5": { autoCompactWindow: HAIKU_AUTOCOMPACT_WINDOW },
  },
  autoCompactWindow: CONTEXT_WINDOW,
  promptSuggestionEnabled: false,
  awaySummaryEnabled: false,
  modelProposedGoals: "disabled",
  autoMemoryEnabled: false,
  autoDreamEnabled: false,
  idleCompaction: false,
  useAutoModeDuringPlan: false,
};

/** The deny rules of 0.3.0-alpha.1 that setup removes: with `*`, they also match a delete in the temp folder (spec `setup`, "Old Deny Rules Go"). */
export const DROPPED_DENY = ["Bash(rm -rf /*)", "Bash(rm -rf ~/*)"];
