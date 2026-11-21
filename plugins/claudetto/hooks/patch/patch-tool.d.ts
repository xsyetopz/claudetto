// Declares the patch tool's input so `tool.run`, `tool.check` and `tool.call` type its `patch`,
// whichever MCP servers a machine has connected (the generated types list those).

/** The input of `patch`. */
export interface PatchInput {
	patch: string;
}

declare module "claude-code" {
	interface McpToolInputs {
		mcp__claudetto__patch: PatchInput;
	}
}
