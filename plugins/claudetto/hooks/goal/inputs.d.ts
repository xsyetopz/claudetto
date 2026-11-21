declare module "claude-code" {
	/**
	 * The inputs of the goal tools claudetto registers, so a call to one
	 * type-checks. `get_goal` and `pause_goal` take none; an empty shape would
	 * clash with the call's `tool` key, so each declares an optional field.
	 */
	interface McpToolInputs {
		mcp__claudetto__get_goal: { unused?: never };
		mcp__claudetto__set_goal: { condition: string };
		mcp__claudetto__pause_goal: { unused?: never };
		mcp__claudetto__clear_goal: {
			condition: string;
			checks: { command: string; outcome: "passed" | "failed" }[];
		};
	}
}
