// The input of the tool this plugin registers, so `$.tool.call` accepts its name.

declare module "claude-code" {
	interface McpToolInputs {
		"mcp__claudetto-openspec__openspec": {
			action?: "status" | "validate" | "archive";
			change?: string;
			yes?: boolean;
			force?: boolean;
		};
	}
}
