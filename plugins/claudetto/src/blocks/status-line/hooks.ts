import type { HookFor } from "claude-code";
import type { Json } from "../../tiers/merge.ts";

export const STATUSLINE = "statusline";

export const SETUP_AGENT_DENY = "Agent(statusline-setup)";

export const DESCRIPTION = "Write claudetto's status line, with no model call";

export const deniesSetupAgent = (settings: Json): boolean => {
	const permissions = settings["permissions"];
	const deny =
		typeof permissions === "object" &&
		permissions !== null &&
		"deny" in permissions
			? permissions.deny
			: undefined;
	return Array.isArray(deny) && deny.includes(SETUP_AGENT_DENY);
};

export const deniedText = (file: string): string =>
	`The built-in /${STATUSLINE} starts the statusline-setup agent, and ${file} denies it with \`${SETUP_AGENT_DENY}\` in \`permissions.deny\`. Remove that rule to describe your own line, or run /${STATUSLINE} with no text for claudetto's.`;

export const unreadableText = (file: string): string =>
	`${file} could not be read as a JSON object, so nothing was written. Fix the file and run /${STATUSLINE} again.`;

export const onStatuslineDescribe: HookFor<"command.describe"> = (
	_$,
	e,
	next,
) => next({ ...e, description: DESCRIPTION });
