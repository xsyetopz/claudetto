// The contract of this plugin: the named values it keeps in the session (`$.state`). It is a `.d.ts` with no import, named by `types` in `plugin.json`.

declare module "claude-code" {
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
			/** The `tasks.md` loop blocks in a row and the progress mark they saw. */
			loop: { readonly count: number; readonly seen: string };
		};
	}
}
