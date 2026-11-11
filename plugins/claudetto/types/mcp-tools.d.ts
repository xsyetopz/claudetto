// The inputs of the tools claudetto registers, so `tool.call` matchers and `$.tool.call` accept their names.

declare module "claude-code" {
	interface McpToolInputs {
		mcp__claudetto__monitor: {
			description: string;
			command?: string;
			ws?: { url: string; protocols?: readonly string[] };
			timeout_ms?: number;
		};
		mcp__claudetto__decide: {
			questions: readonly {
				question: string;
				options?: readonly { label: string; description: string }[];
			}[];
		};
		mcp__claudetto__handoff: {
			goal: string;
			standing: string;
			state: string;
			decisions: string;
			next_prompt: string;
		};
	}
}
