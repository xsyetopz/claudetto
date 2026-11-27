declare module "claude-code" {
	/** The input of the `notify` tool claudetto registers, so a call to it type-checks. */
	interface McpToolInputs {
		mcp__claudetto__notify: { text: string };
	}
}
