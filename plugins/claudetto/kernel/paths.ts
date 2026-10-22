// The paths of the files that claudetto reads or writes, in one place.
// The file has no import, so the module graph of a hooks module can use it.
// `.claude/` holds the files that Claude Code reads.
// `.claudetto/` holds the files that claudetto writes, with a layout based on `.claude/`.

export const CLAUDE_DIR = ".claude";

const CLAUDETTO_DIR = ".claudetto";

/** The state file of Claude Code. It sits in `CLAUDE_CONFIG_DIR`, or in the home folder. */
export const CLAUDE_STATE_FILE = ".claude.json";

export const SETTINGS_FILE = "settings.json";

const LOCAL_SETTINGS_FILE = "settings.local.json";

export const PROJECT_SETTINGS = `${CLAUDE_DIR}/${SETTINGS_FILE}`;

export const PROJECT_LOCAL_SETTINGS = `${CLAUDE_DIR}/${LOCAL_SETTINGS_FILE}`;

/** The folder of the handoff files,from the project root, when no openspec change is active. One checkout owns them. */
export const HANDOFF_DIR = `${CLAUDETTO_DIR}/handoffs`;

/** The folder of the openspec changes, from the project root. The folder `archive` in it holds the finished changes. */
export const CHANGES_DIR = "openspec/changes";

/** The name of the handoff file inside an openspec change folder. */
export const CHANGE_HANDOFF_FILE = "handoff.md";

/** The state file of the goal engine, from the project root. The file holds `null` when no goal is set. */
export const GOAL_FILE = `${CLAUDETTO_DIR}/goal.json`;
