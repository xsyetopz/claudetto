// Declares the inputs of `web_fetch` and `web_search` so `tool.run` types their names and fields,
// whichever MCP servers a machine has connected (the generated types list those).

/** The input of `web_fetch`. */
export interface WebFetchInput {
	url: string;
	max_chars?: number;
	offset?: number;
}

/** The input of `web_search`. */
export interface WebSearchInput {
	query: string;
	max_results?: number;
}

declare module "claude-code" {
	interface McpToolInputs {
		mcp__claudetto__web_fetch: WebFetchInput;
		mcp__claudetto__web_search: WebSearchInput;
	}
}
