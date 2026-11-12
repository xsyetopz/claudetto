// The inputs of the tools claudetto registers, so `tool.call` matchers and `$.tool.call` accept their names.

declare module "claude-code" {
	interface McpToolInputs {
		mcp__claudetto__decide: {
			questions: readonly {
				question: string;
				options?: readonly { label: string; description: string }[];
			}[];
		};
	}
}
