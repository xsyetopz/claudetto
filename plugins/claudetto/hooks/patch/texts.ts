/** The tool's short name; the model calls it `mcp__claudetto__patch`. */
export const TOOL_NAME = "patch";

/** The full tool name a `tool.run` or `tool.check` hook matches. */
export const TOOL_FULL_NAME = "mcp__claudetto__patch";

/** What the model reads about the tool; at most 200 characters (REQ-TOOLS-003). */
export const TOOL_DESCRIPTION =
	"Create, update, move or delete files, many per call. *** Begin Patch, then *** Add/Update/Delete File: path with @@ anchor, ' ' context, -old, +new lines (no line numbers), then *** End Patch.";

/** What the model reads about the `patch` input. */
export const PATCH_DESCRIPTION =
	"The patch text: *** Begin Patch, file sections (*** Add File: p with + lines; *** Delete File: p; *** Update File: p, optional *** Move to: q, hunks of @@ anchor, context, -removed, +added lines), *** End Patch.";

/** The tools every loop loses; `patch` and Bash replace them (REQ-TOOLS-001). */
export const HIDDEN_TOOLS: readonly string[] = [
	"Write",
	"Edit",
	"NotebookEdit",
	"SendMessage"
];
