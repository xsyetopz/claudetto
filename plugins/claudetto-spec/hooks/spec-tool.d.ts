// Declares spec_check's input so `tool.run` and `tool.call` type its name and `path`,
// whichever MCP servers a machine has connected (the generated types list those).

/** The input of `spec_check`. */
export interface SpecCheckInput {
	path?: string;
}

declare module "claude-code" {
	interface McpToolInputs {
		"mcp__claudetto-spec__spec_check": SpecCheckInput;
	}
}
