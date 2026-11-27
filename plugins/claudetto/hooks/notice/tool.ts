import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { notifyNative } from "./native";

const NOTIFY_NAME = "mcp__claudetto__notify";

/** The tool the model calls to reach a user who may be away from the screen. */
export const NOTIFY_TOOL = {
	name: "notify",
	description:
		"Sends the user a desktop notification. Use it before a step that needs their hands (a button press, a device, a phone) and when a long run they wait on ends.",
	inputSchema: {
		type: "object",
		properties: {
			text: { type: "string", description: "One line for the user." }
		},
		required: ["text"]
	}
} as const;

/**
 * Registers `notify`; `startParts` runs it, because core allows one unmatched
 * `session.start` hook per plugin.
 *
 * @param $ The plugin's engine interface.
 */
export async function startNotify($: EngineInterface): Promise<void> {
	await $.tool.register(NOTIFY_TOOL);
}

/**
 * Serves `notify` through `$.ui.notify`, plus a native banner where that
 * shows no text: a bell, or no terminal channel at all (KERNEL-035). It runs
 * with no prompt: a notice changes nothing, and an ask would hold the very
 * call meant to reach the user.
 *
 * @param on The engine's hook registrar.
 */
export function registerNotifyTool(on: On): void {
	on("tool.check", { tool: NOTIFY_NAME }, async (_$, e, next) => {
		const verdict = await next(e);
		return verdict.decision === "deny" || verdict.rule !== undefined
			? verdict
			: { decision: "allow" };
	}).catch(($, e, next) => {
		fault($, "notify check", next.error);
		return next(e);
	});
	on("tool.run", { tool: NOTIFY_NAME }, async ($, e) => {
		const text = e.text.trim();
		if (text === "") {
			return { result: "Give `text`: one line for the user." };
		}
		const sent = await $.ui.notify(text, { title: "Claude Code" });
		if (!sent.isSent && sent.reason === "disabled") {
			return {
				result: "Not sent: the user turned notifications off. Ask in the reply."
			};
		}
		if (!sent.isSent || sent.channel === "terminal_bell") {
			await notifyNative($, "Claude Code", text);
		}
		return { result: "Sent." };
	}).catch(($, _e, next) => {
		fault($, "notify", next.error);
		return { deny: "`notify` failed; see the debug log" };
	});
}
