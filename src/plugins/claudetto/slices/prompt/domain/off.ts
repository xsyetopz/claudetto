// The parts of Claude Code that the verdicts (`tools/builtins/verdicts/`) turn `off` with a hook.
// `tests/claudetto/prompt/off.test.ts` pins each list to the `off` rows of the tables.

/** The attachment kinds that `prompt.attachment` leaves out of the request. */
export const OFF_ATTACHMENTS = [
  "artifact_opening_prefetch",
  "goal_status",
  "session_cron_carry",
  "task_reminder",
  "tool_hosts_notice",
  "workflow_keyword_request",
] as const;

/** The slash commands that `command.describe` hides from the typeahead and `/help`. */
export const OFF_COMMANDS = [
  "artifacts",
  "autofix-pr",
  "brief",
  "bug",
  "claim-credit",
  "cloud-plugins",
  "daemon",
  "design-consent",
  "design-login",
  "design-revoke",
  "desktop",
  "extra-usage",
  "fast",
  "feedback",
  "heapdump",
  "ide",
  "import",
  "install",
  "install-github-app",
  "install-slack-app",
  "limit-reset",
  "loops",
  "mobile",
  "passes",
  "pause-memory",
  "powerup",
  "pro-trial-expired",
  "radio",
  "rate-limit-options",
  "remote-control",
  "remote-env",
  "session",
  "setup-bedrock",
  "setup-vertex",
  "statusline",
  "stickers",
  "team-onboarding",
  "teleport",
  "ultraplan",
  "ultrareview",
  "upgrade",
  "usage-credits",
  "voice",
  "web-setup",
  "wellbeing",
  "workflow-launch-exec",
  "workflows",
] as const;

/** The agent types that `agent.offer` takes from the model. */
export const OFF_AGENTS = ["comment-thread-analyst"] as const;
