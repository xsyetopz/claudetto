import type { Json } from "../../tiers/merge.ts";

/** The agent type that `0.2.0` shipped, which the plugin no longer lists. */
const RETIRED_AGENT = "claudetto:main";

/** A session whose `agent` names a missing agent starts on the stock body, and the root prompt now comes from the plugin's hook, so the key only points at nothing. */
export const withoutRetiredAgent = (held: Json): Json =>
	held["agent"] === RETIRED_AGENT
		? Object.fromEntries(
				Object.entries(held).filter(([key]) => key !== "agent"),
			)
		: held;

export const retiredLine = (file: string): string =>
	`Removed \`agent\` from ${file}: it named \`${RETIRED_AGENT}\`, which the plugin no longer ships. The root prompt comes from the plugin now.`;
