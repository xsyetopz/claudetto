import type { EngineInterface, On, PluginOptions } from "claude-code";

import {
	AUTONOMY_MARK,
	type AutonomySync,
	isFull,
	syncAutonomy
} from "../autonomy/autonomy";
import { repairSettings } from "../builtins/builtins";
import { builtinGitForced, GIT_CONFLICT, ownGitOn } from "../git/instructions";
import { startPatch } from "../patch/tool";
import { fault } from "../shared/fault";
import { stringsOf } from "../shared/field";
import { startWeb } from "../web/register";
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

/** The repaired settings after the autonomy sync and the fill, with what each changed. */
interface Settled {
	readonly text: string;
	readonly added: readonly string[];
	readonly autonomy: AutonomySync;
	readonly filled: boolean;
	readonly owned: boolean;
}

/** Runs the autonomy sync (REQ-SETUP-070), then the fill when this fill version has not run. */
async function settle(
	$: EngineInterface,
	text: string,
	options: PluginOptions,
	walls: readonly string[]
): Promise<Settled> {
	const owned = (await $.store.get(AUTONOMY_MARK)) === true;
	const autonomy = syncAutonomy(text, isFull(options), owned);
	const filled = (await $.store.get(MARK)) === FILL_VERSION;
	const fill = filled ? undefined : fillSettings(autonomy.text, walls);
	return {
		text: fill?.text ?? autonomy.text,
		added: fill?.added ?? [],
		autonomy,
		filled,
		owned
	};
}

/** Stores the fill version and the autonomy ownership once the write landed, and tells the person what autonomy changed. */
async function record($: EngineInterface, settled: Settled): Promise<void> {
	if (!settled.filled) {
		await $.store.set(MARK, FILL_VERSION);
	}
	if (settled.autonomy.owned !== settled.owned) {
		await $.store.set(AUTONOMY_MARK, settled.autonomy.owned);
	}
	if (settled.autonomy.notice !== undefined) {
		$.ui.log(settled.autonomy.notice);
	}
}

/**
 * Repairs builtin drift (REQ-SETUP-011), matches the autonomy option to the
 * built-in `permissions.denyInsteadOfPrompting` (REQ-SETUP-070), and fills
 * unset defaults (ADR-0190) in one read and one write of user settings. Core
 * allows one unmatched `session.start` registration per plugin, so all three
 * share this hook, and so does the web tools' registration (REQ-TOOLS-020).
 */
export function registerStart(on: On, options: PluginOptions = {}): void {
	const walls = stringsOf(options["protectedPaths"]);
	on("session.start", async ($, e, next) => {
		const result = await next(e);
		try {
			await startPatch($);
		} catch (error) {
			// The patch tool failing to register must not stop the settings repair or the session.
			fault($, "patch tool registration", error);
		}
		try {
			await startWeb($, e);
		} catch (error) {
			// The web tools failing to register must not stop the settings repair or the session.
			fault($, "web tool registration", error);
		}
		const path = await userSettingsPath($);
		const repair = repairSettings(await readSettings($, path));
		if (repair === undefined) {
			$.ui.log(`claudetto left ${path} alone: it does not hold a JSON object.`);
			return result;
		}
		const settled = await settle($, repair.text, options, walls);
		const changed =
			repair.drifted.length > 0 ||
			settled.added.length > 0 ||
			settled.autonomy.notice !== undefined;
		if (changed) {
			await $.fs.write(path, settled.text);
		}
		logChanges($, path, repair.drifted, settled.added, e.isInteractive);
		await record($, settled);
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
