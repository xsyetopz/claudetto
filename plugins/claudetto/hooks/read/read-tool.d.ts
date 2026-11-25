// Declares the read tool's input so `tool.run`, `tool.check` and `tool.call` type its fields,
// whichever MCP servers a machine has connected (the generated types list those).

/** The input of `read`. */
export interface ReadInput {
	file_path: string;
	offset?: number;
	limit?: number;
	pages?: string;
	also?: string[];
}

declare module "claude-code" {
	interface McpToolInputs {
		mcp__claudetto__read: ReadInput;
	}
}
