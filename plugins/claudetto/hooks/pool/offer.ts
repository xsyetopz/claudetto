import type { On } from "claude-code";

import { fault } from "../shared/fault";

/**
 * The tools every loop loses. `patch` and Bash replace the file tools, SendMessage
 * is off, and ListAgents only lists the agents SendMessage can reach, so with
 * SendMessage off it adds its description to every request for no use
 * (REQ-TOOLS-001, REQ-TOOLS-002).
 */
export const HIDDEN_TOOLS: readonly string[] = [
	"Write",
	"Edit",
	"NotebookEdit",
	"SendMessage",
	"ListAgents"
];

/**
 * Hides {@link HIDDEN_TOOLS} from every loop, the main one and each subagent's,
 * because `tool.offer` fires per loop.
 *
 * @param on The engine's hook registrar.
 */
export function registerToolOffer(on: On): void {
	on(
		"tool.offer",
		{ tool: new RegExp(`^(?:${HIDDEN_TOOLS.join("|")})$`, "u") },
		() => ({
			isOffered: false
		})
	).catch(($, e, next) => {
		fault($, "tool offer", next.error);
		return next(e);
	});
}
