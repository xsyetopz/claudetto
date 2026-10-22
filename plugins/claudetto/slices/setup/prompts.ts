export const CLAUDE_MD_REMOVED = (v: { file: string }): string =>
  `Remove the claudetto block of 0.1.0 from ${v.file}.`;

export const CLEANED = (v: { key: string }): string =>
  `${v.key}: removed the entries of 0.1.0.`;

export const CONTEXT7_FOUND = (v: { file: string; chars: number }): string =>
  `${v.file}: ${v.chars} characters in each session. The skill \`claudetto-docs:find-docs\` uses the same \`ctx7\` CLI with ${DOCS_SKILL_CHARS} characters, so keep one of the two.`;

/** The size of the description of `claudetto-docs:find-docs`, which loads in each session. */
export const DOCS_SKILL_CHARS = 155;

export const DROPPED_AUTO_MODE = `\`autoMode\`: removed, because the snippet turns auto mode off, so its rules do nothing.`;

export const DROPPED_ENTRY = (v: { key: string; entry: string }): string =>
  `\`${v.key}\`: removed the entry \`${v.entry}\` of 0.2.0.`;

export const DROPPED_HOOK = (v: { command: string }): string =>
  `\`hooks.UserPromptSubmit\`: removed the hook \`${v.command}\`, because it adds code that the prompt did not ask for.`;

export const DROPPED_KEY = (v: { key: string }): string =>
  `\`${v.key}\`: removed the value of 0.2.0, because 0.3.0 does not set it.`;

export const DRY_RUN = `Dry run. Run again with --apply to write these changes.`;

export const KEPT_KEY = (v: { key: string }): string =>
  `Kept your ${v.key}, because it runs another tool.`;

export const LEGACY_KEYS = {
  ask: [
    "Bash(git push *--force*)",
    "Bash(git push -f*)",
    "Bash(git push * -f)",
    "Bash(git push * -f *)",
    "Bash(git reset --hard*)",
    "Bash(git clean -f*)",
    "Bash(git clean -d*)",
    "Bash(git branch -D *)",
    "Bash(git checkout -- *)",
    "Bash(git restore *)",
  ],
};

export const NO_PLAN_CAP = (v: { tier: string }): string =>
  `The plan tier ${v.tier} has no subagent cap in claudetto, so setup writes no CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS.`;

export const PROJECT_NO_PLAN_CAP = `Project settings get no CLAUDE_CODE_MAX_CONCURRENT_SUBAGENTS, because the cap comes from the plan of each login. Run setup with the user or local scope for it.`;

export const PROJECT_NO_STATUS_LINE = `Project settings get no status line, because its command runs claudetto from the plugin cache of each user, and a person who shares the project can have no claudetto. Run setup with the user or local scope for it.`;

export const REMOVED_RULE = (v: { rule: string }): string =>
  `\`permissions.ask\`: removed the rule \`${v.rule}\` of 0.1.0.`;

export const SCOPE_MISSING = `The option --scope needs a value. Use user, project, or local.`;

export const SETTINGS_FAILED = (v: { file: string; message: string }): string =>
  `${v.file}: ${v.message} Nothing changed.`;

export const SETTINGS_MATCH = `Settings match the snippet.`;

/** The status line command picks the newest installed folder of the plugin, so an update of the plugin needs no second setup. */
const STATUSLINE_COMMAND = `bun --no-env-file "$(ls -d "\${CLAUDE_CONFIG_DIR:-$HOME/.claude}"/plugins/cache/claudetto/claudetto/*/ | sort -V | tail -1)bin/claudetto-statusline"`;

export const SNIPPET = {
  $schema:
    "https://raw.githubusercontent.com/xsyetopz/claude-code-docs/main/schemas/claude-code-settings.json",
  env: {
    CLAUDE_CODE_DISABLE_FAST_MODE: "1",
    CLAUDE_CODE_PROMPT_CACHE_TTL: "1h",
    CLAUDE_AUTOCOMPACT_PCT_OVERRIDE: "80.3571",
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
    deny: [
      "Read(**/.env)",
      "Read(**/.env.local)",
      "Read(**/.env.production)",
      "Read(**/.env.*.local)",
      "Read(**/.env.development)",
      "Read(**/.env.dev)",
      "Read(**/.env.staging)",
      "Read(**/.env.stage)",
      "Read(**/.env.test)",
      "Read(**/.env.prod)",
      "Read(**/.env.qa)",
      "Read(**/.env.preview)",
      "Read(~/.ssh/**)",
      "Read(~/.aws/credentials)",
      "Read(~/.gnupg/**)",
      "Read(~/.netrc)",
      "Read(~/.docker/config.json)",
      "Bash(rm -rf /)",
      "Bash(rm -rf /*)",
      "Bash(rm -rf ~)",
      "Bash(rm -rf ~/*)",
      "Bash(mkfs *)",
      "Bash(mkfs.*)",
      "Bash(dd * of=/dev/*)",
      "Bash(rm -rf ~/)",
      "Bash(rm -rf $HOME)",
      'Bash(rm -rf "$HOME")',
      "Bash(sudo *)",
      "Bash(doas *)",
      "Bash(su *)",
      "Bash(newfs*)",
      "Bash(diskutil erase*)",
      "Bash(diskutil zero*)",
      "Bash(diskutil secureErase*)",
      "Bash(diskutil partition*)",
      "Bash(diskutil reformat*)",
      "Bash(csrutil disable*)",
      "Bash(csrutil clear*)",
      "Bash(csrutil authenticated-root *)",
      "Bash(spctl --master-disable*)",
      "Bash(spctl --global-disable*)",
      "Bash(nvram *=*)",
      "Bash(nvram -d *)",
      "Bash(nvram -c*)",
      "Bash(security delete-*)",
      "Edit(//System/**)",
      "Edit(//Library/**)",
      "Edit(//usr/bin/**)",
      "Edit(//usr/sbin/**)",
      "Edit(//usr/lib/**)",
      "Edit(//usr/libexec/**)",
      "Edit(//usr/share/**)",
      "Agent(general-purpose)",
      "Agent(Explore)",
      "Agent(Plan)",
      "Agent(claude)",
      "Agent(claude-code-guide)",
      "Agent(statusline-setup)",
      "Agent(fork)",
      "mcp__computer-use",
      "ScheduleWakeup",
      "ReportFindings",
      "EnterPlanMode",
      "ExitPlanMode",
      "Workflow",
      "Artifact",
      "DesignSync",
      "RemoteTrigger",
      "TaskCreate",
      "TaskGet",
      "TaskList",
      "TaskUpdate",
    ],
    defaultMode: "default",
    disableAutoMode: "disable",
  },
  disableClaudeAiConnectors: true,
  skillOverrides: {
    "plugin-authoring": "name-only",
  },
  disableBundledSkills: true,
  worktree: {
    baseRef: "head",
  },
  disableRemoteControl: true,
  enableArtifact: false,
  enableWorkflows: false,
  statusLine: {
    type: "command",
    command: STATUSLINE_COMMAND,
    padding: 0,
    refreshInterval: 1,
    hideVimModeIndicator: true,
  },
  subagentStatusLine: {
    type: "command",
    command: `${STATUSLINE_COMMAND} --subagent`,
  },
  enabledPlugins: {
    "cc-plugin-agents-md@builtin": false,
    "cc-plugin-claude-test@builtin": false,
    "cc-plugin-diff@builtin": false,
    "cc-plugin-easel@builtin": false,
    "cc-plugin-mermaid@builtin": false,
    "cc-plugin-mods-guide@builtin": false,
    "cc-plugin-plugin-authoring@builtin": false,
    "cc-plugin-responsive-mode@builtin": false,
    "cc-plugin-telemetry@builtin": false,
    "cc-plugin-tips@builtin": false,
  },
  outputStyle: "claudetto:Concise",
  feedbackDrafts: "off",
  spinnerTipsEnabled: false,
  modelSettings: {
    "claude-haiku-5-5": {
      autoCompactWindow: 144444,
    },
  },
  autoCompactWindow: 300000,
  promptSuggestionEnabled: false,
  awaySummaryEnabled: false,
  modelProposedGoals: "disabled",
  autoMemoryEnabled: false,
  autoDreamEnabled: false,
  useAutoModeDuringPlan: false,
};

export const UNKNOWN_SCOPE = (v: { scope: string }): string =>
  `Unknown scope "${v.scope}". Use user, project, or local.`;

export const USAGE = `Usage: claudetto-setup [--scope user|project|local] [--apply]`;

export const WROTE = (v: { file: string }): string =>
  `Wrote ${v.file}. Restart Claude Code for the env and model settings to take effect.`;
