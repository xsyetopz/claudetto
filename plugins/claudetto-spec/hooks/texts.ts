/** The tool's short name; the model calls it `mcp__claudetto-spec__spec_check`. */
export const TOOL_NAME = "spec_check";

/** The full tool name a `tool.run` hook matches. */
export const TOOL_FULL_NAME = "mcp__claudetto-spec__spec_check";

/** What the model reads about the tool. */
export const TOOL_DESCRIPTION =
	"Checks `specs/*.md`: malformed or inflated requirements, IDs no test cites, no spec defines, IDs changed since `HEAD`, staged tests deleted, skipped or losing asserts, and ID tests asserting nothing.";

/** What the model reads about the tool's input. */
export const PATH_DESCRIPTION =
	"One spec file to report on, such as `specs/auth.md`.";

/** Returned when `path` names no spec file. */
export const UNKNOWN_PATH = "no such spec file: ";

/** Returned when git cannot list the files. */
export const GIT_FAILED = "`git ls-files` failed: ";

/** The directory whose presence turns the Stop gate on. */
export const SPECS_DIR = "specs";

/**
 * When a written requirement may change. The agent changes one the requested behaviour
 * needs changed, and the person sees every change at the end of the turn, so a requirement
 * reworded to fit buggy code does not pass unseen.
 */
export const AMEND_RULE =
	"change a requirement when the requested behaviour needs it changed, together with its tests and the code, and name each changed ID with its old wording in the final reply; never change one only to make failing code or a failing test pass";

/** Opens the reason a Stop is blocked; one line per finding follows. */
export const STOP_BLOCK_HEAD =
	"`spec_check` findings; for each, fix it or tell the user why it stands:";

/** Opens the line the person sees at a Stop after the session reworded or removed a requirement. */
export const SPEC_CHANGE_HEAD = "Requirements changed in this session:";

/** The id of the prompt section a repo with `specs/` gets. */
export const AMEND_SECTION_ID = "claudetto-spec:amend";

/**
 * The amend rule in the system prompt of a repo with `specs/`. The spec skill states it
 * too, but a request that never loads the skill edits spec, test and code to fit, and the
 * Stop gate's revert then costs more turns than the rule up front.
 */
export const AMEND_SECTION = `This repository keeps requirements in \`specs/\`: ${AMEND_RULE}. When two requirements, or a requirement and a staged test, contradict each other, edit no spec, test or code; report the conflict and name the requirement IDs. The specs as the session found them, with the user's uncommitted edits, are the requirements: code and tests follow each one, also an edit the request does not name.`;
