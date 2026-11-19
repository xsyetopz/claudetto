import type { On, PluginOptions } from "claude-code";
import { fault } from "../shared/fault";

import { repairSettings } from "../builtins/builtins";
import { GIT_CONFLICT, builtinGitForced, ownGitOn } from "../git/instructions";
import { FILL_VERSION, fillNotice, fillSettings } from "./defaults";
import { userSettingsPath } from "./settings";

/** Store key holding the defaults set last filled, so a user's later edit is never undone. */
const MARK = "setup.filled";

/**
 * Repairs builtin drift (REQ-SETUP-011) and fills unset defaults (ADR-0190) in
 * one read and one write of user settings. Core allows one unmatched
 * `session.start` registration per plugin, so both share this hook.
 */
export function registerStart(on: On, options: PluginOptions = {}): void {
	const walls = options["protectedPaths"];
	on("session.start", async ($, e, next) => {
		const result = await next(e);
		const path = await userSettingsPath($);
		const text = (await $.fs.exists(path)) ? await $.fs.read(path) : undefined;
		const repair = repairSettings(text);
		if (repair === undefined) {
			$.ui.log(`claudetto left ${path} alone: it does not hold a JSON object.`);
			return result;
		}
		const filled = (await $.store.get(MARK)) === FILL_VERSION;
		const fill = filled ? undefined : fillSettings(repair.text, Array.isArray(walls) ? (walls as string[]) : undefined);
		const added = fill?.added ?? [];
		if (repair.drifted.length > 0 || added.length > 0) await $.fs.write(path, fill?.text ?? repair.text);
		if (!filled) await $.store.set(MARK, FILL_VERSION);
		if (repair.drifted.length > 0) {
			$.ui.log(
				`claudetto turned off ${repair.drifted.length} builtin plugin(s) in user settings: ${repair.drifted.join(", ")}. ` +
					(e.isInteractive ? "Run /reload-plugins to unload them now." : "They stay loaded until the next start."),
			);
		}
		if (added.length > 0) $.ui.log(fillNotice(path, added));
		// Only an explicit turn-on counts: an unset switch is the fill's to set, and a value the fill wrote just now is not read back until the next session.
		if (ownGitOn(options) && (await builtinGitForced($))) $.ui.log(GIT_CONFLICT);
		return result;
	}).catch(($, e, next) => (fault($, "settings fill", next.error), next(e))); // A failed settings write must not block the session.
}
