export const AGENT_DENIES: readonly string[] = [
	"Agent(general-purpose)",
	"Agent(Explore)",
	"Agent(Plan)",
	"Agent(claude)",
	"Agent(claude-code-guide)",
	"Agent(statusline-setup)",
];

export const INTEGRATION_DENIES: readonly string[] = ["DesignSync"];

/** Deferred tools no claudetto agent, skill, or hook calls; each leaves only its name in the deferred list. */
export const DEFERRED_DENIES: readonly string[] = ["NotebookEdit", "TaskStop"];
