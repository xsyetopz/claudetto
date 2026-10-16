// The transform of the `ListAgents` tool, keyed by its tool id.
// The tool is deferred behind ToolSearch, so its schema loads when the model asks for it by name.
// Its built-in description stays as the engine sends it.

export const LIST_AGENTS = { id: "ListAgents", defer: true } as const;
