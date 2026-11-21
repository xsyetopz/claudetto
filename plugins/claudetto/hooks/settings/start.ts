import type { EngineInterface, On, PluginOptions } from "claude-code";

import { repairSettings } from "../builtins/builtins";
import { builtinGitForced, GIT_CONFLICT, ownGitOn } from "../git/instructions";
import { startPatch } from "../patch/tool";
import { fault } from "../shared/fault";
import { stringsOf } from "../shared/field";
import { FILL_VERSION, fillNotice, fillSettings } from "./defaults";
import { userSettingsPath } from "./settings";

/** Store key holding the defaults set last filled, so a user's later edit is never undone. */
const MARK = "setup.filled";

/** The text of the user settings file, or undefined when it does not exist. */
async function readSettings(
	$: EngineInterface,
	path: string
): Promise<string | undefined> {
	return (await $.fs.exists(path)) ? $.fs.read(path) : undefined;
}

/** Tells the person what the repair and the fill changed. */
function logChanges(
	$: EngineInterface,
	path: string,
	drifted: readonly string[],
	added: readonly string[],
	isInteractive: boolean
): void {
	if (drifted.length > 0) {
		const reload = isInteractive
			? "Run /reload-plugins to unload them now."
			: "They stay loaded until the next start.";
		$.ui.log(
			`claudetto turned off ${drifted.length} builtin plugin(s) in user settings: ${drifted.join(", ")}. ${reload}`
		);
	}
	if (added.length > 0) {
		$.ui.log(fillNotice(path, added));
	}
}

/**
 * Repairs builtin drift (REQ-SETUP-011) and fills unset defaults (ADR-0190) in
 * one read and one write of user settings. Core allows one unmatched
 * `session.start` registration per plugin, so both share this hook.
 */
export function registerStart(on: On, options: PluginOptions = {}): void {
	const walls = stringsOf(options["protectedPaths"]);
	on("session.start", async ($, e, next) => {
		const result = await next(e);
		await startPatch($);
		const path = await userSettingsPath($);
		const repair = repairSettings(await readSettings($, path));
		if (repair === undefined) {
			$.ui.log(`claudetto left ${path} alone: it does not hold a JSON object.`);
			return result;
		}
		const filled = (await $.store.get(MARK)) === FILL_VERSION;
		const fill = filled ? undefined : fillSettings(repair.text, walls);
		const added = fill?.added ?? [];
		if (repair.drifted.length > 0 || added.length > 0) {
			await $.fs.write(path, fill?.text ?? repair.text);
		}
		if (!filled) {
			await $.store.set(MARK, FILL_VERSION);
		}
		logChanges($, path, repair.drifted, added, e.isInteractive);
		// Only an explicit turn-on counts: an unset switch is the fill's to set, and a value the fill wrote just now is not read back until the next session.
		if (ownGitOn(options) && (await builtinGitForced($))) {
			$.ui.log(GIT_CONFLICT);
		}
		return result;
		// A failed settings write must not block the session.
	}).catch(($, e, next) => {
		fault($, "settings fill", next.error);
		return next(e);
	});
}
