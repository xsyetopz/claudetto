/** The tool's short name; the model calls it `mcp__claudetto__read`. */
export const TOOL_NAME = "read";

/** The full tool name a `tool.run` or `tool.check` hook matches. */
export const TOOL_FULL_NAME = "mcp__claudetto__read";

/** What the model reads about the tool (REQ-TOOLS-003). */
export const TOOL_DESCRIPTION =
	"Read a file by absolute path: numbered lines (default 2000; offset, limit), images, .ipynb cells, PDF text (pages like 1-5, max 20). also: more paths, one call.";

/** The most lines one call returns when `limit` is left out. */
export const DEFAULT_LIMIT = 2000;

/** The most PDF pages one call returns. */
export const MAX_PAGES = 20;

/** The longest line shown whole; a longer one is cut with a mark. */
export const MAX_LINE = 2000;
