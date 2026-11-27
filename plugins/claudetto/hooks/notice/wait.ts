import type { EngineInterface, On } from "claude-code";

import { fault } from "../shared/fault";
import { notifyNative } from "./native";

/** The notification types where Claude Code waits on the person: a permission dialog, an MCP question. */
const WAITS = new Set([
	"permission_prompt",
	"idle_prompt",
	"elicitation_dialog",
	"elicitation_url_dialog"
]);

/** The channels that draw the text on their own, so a native banner would be a second notice. */
const TEXT_CHANNELS = new Set([
	"iterm2",
	"iterm2_with_bell",
	"kitty",
	"ghostty"
]);

/**
 * Whether the person's terminal shows a notification's text without help.
 * Core sends its own wait notices after the `Notification` hooks run and
 * reports no outcome to them, and `$.ui.notify` would send a second one, so
 * the outcome is read off the same inputs `auto` resolves from: the
 * `preferredNotifChannel` setting, then the terminal's environment.
 */
async function isShownByTerminal($: EngineInterface): Promise<boolean> {
	const channel = await $.settings.read({ key: "preferredNotifChannel" });
	if (typeof channel === "string" && channel !== "auto") {
		return TEXT_CHANNELS.has(channel);
	}
	if ((await $.env.get("TMUX")) !== undefined) {
		return false;
	}
	const program = await $.env.get("TERM_PROGRAM");
	return (
		program === "iTerm.app" ||
		program === "ghostty" ||
		(await $.env.get("TERM")) === "xterm-kitty"
	);
}

/**
 * Raises a native notice when Claude Code waits on the person (a permission
 * dialog, the idle prompt, an MCP question) and the terminal would show no
 * text: a bell-only or absent channel. Nothing where the terminal showed the
 * text itself, and nothing for `notifications_disabled`.
 */
export function registerWaitNotice(on: On): void {
	on("classic.Notification", async ($, e, next) => {
		const result = await next(e);
		if (!WAITS.has(e.notification_type)) {
			return result;
		}
		if (
			(await $.settings.read({ key: "preferredNotifChannel" })) ===
			"notifications_disabled"
		) {
			return result;
		}
		if (!(await isShownByTerminal($))) {
			await notifyNative($, e.title ?? "claudetto", e.message);
		}
		return result;
	}).catch(($, e, next) => {
		fault($, "wait notice", next.error);
		return next(e);
	});
}
