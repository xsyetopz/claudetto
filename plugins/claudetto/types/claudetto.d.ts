// The contract of this plugin: the named values it keeps in the session (`$.state`). It is a `.d.ts` with no import, named by `types` in `plugin.json`.

declare module "claude-code" {
	/** Written by hand, because the generated MCP types list only the tools a session had connected, and `decide` connects only with a key. */
	interface McpToolInputs {
		mcp__claudetto__decide: {
			questions: {
				question: string;
				options: { label: string; description: string }[];
			}[];
		};
	}
	interface PluginState {
		claudetto: {
			/** The auto mode denials of the session by the key of the call: how many, and the reason of the newest. */
			denials: Readonly<
				Record<string, { readonly count: number; readonly reason: string }>
			>;
			/** The times, in milliseconds, of the subagent starts inside the period. */
			starts: readonly number[];
			/** The times of the tool calls inside the period, counted only while the context is heavy. */
			calls: readonly number[];
			/** The budget band the `prompt.submit` hook last sent a line for, so a turn inside the same band sends none. */
			band: string;
			/** The failures of a call by its key: how many in a row with the same error, the newest error, and when. */
			failures: Readonly<
				Record<
					string,
					{
						readonly count: number;
						readonly error: string;
						readonly last: number;
					}
				>
			>;
			/** The person's prompts typed while a turn ran, each with the id of the agent's newest call at Enter. */
			prompts: readonly { readonly text: string; readonly after?: string }[];
			/** How many Stop blocks came in a row with no file written between them. */
			stall: number;
			/** The models already named as off the tier row, so each is named once. */
			offRow: readonly string[];
			/** The `id` and `status` of the background tasks last listed at Stop, so an unchanged list is not added again. */
			tasks: string;
		};
	}
}
