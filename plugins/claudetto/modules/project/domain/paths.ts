// The paths of the files that claudetto reads (`.claude/`) or writes (`.claudetto/`). No import.

export const CLAUDE_DIR = ".claude";

const CLAUDETTO_DIR = ".claudetto";

/** The state file of Claude Code, in `CLAUDE_CONFIG_DIR` or in the home folder. */
export const CLAUDE_STATE_FILE = ".claude.json";

export const SETTINGS_FILE = "settings.json";

export const PROJECT_SETTINGS = `${CLAUDE_DIR}/${SETTINGS_FILE}`;

export const PROJECT_LOCAL_SETTINGS = `${CLAUDE_DIR}/settings.local.json`;

/** From the project root. One checkout owns the handoff files. */
export const HANDOFF_DIR = `${CLAUDETTO_DIR}/handoffs`;

/** From the project root. The folder `archive` holds the finished changes. */
export const CHANGES_DIR = "openspec/changes";

/** From the project root. The file holds `null` when no goal is set. */
export const GOAL_FILE = `${CLAUDETTO_DIR}/goal.json`;
