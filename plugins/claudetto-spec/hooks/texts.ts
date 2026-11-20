/** The tool's short name; the model calls it `mcp__claudetto-spec__spec_check`. */
export const TOOL_NAME = "spec_check";

/** The full tool name a `tool.run` hook matches. */
export const TOOL_FULL_NAME = "mcp__claudetto-spec__spec_check";

/** What the model reads about the tool. */
export const TOOL_DESCRIPTION =
	"Checks specs/*.md: parsed requirements, malformed headings, inflated requirements, IDs no test cites, IDs tests cite that no spec defines, and test files edited since they were staged.";

/** What the model reads about the tool's input. */
export const PATH_DESCRIPTION =
	"One spec file to report on, such as specs/auth.md.";

/** Returned when `path` names no spec file. */
export const UNKNOWN_PATH = "no such spec file: ";

/** Returned when git cannot list the files. */
export const GIT_FAILED = "git ls-files failed: ";
