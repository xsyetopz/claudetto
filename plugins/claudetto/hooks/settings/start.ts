import type { EngineInterface, On, PluginOptions } from "claude-code";

import { repairSettings } from "../builtins/builtins";
import { builtinGitForced, GIT_CONFLICT, ownGitOn } from "../git/instructions";
import { startPatch } from "../patch/tool";
import { fault } from "../shared/fault";
import { fieldOf, stringsOf } from "../shared/field";
import { startWeb } from "../web/register";
import { FILL_VERSION, fillNotice, fillSettings } from "./defaults";
import { type OwnedKey, readOwned } from "./owned";
import { userSettingsPath } from "./settings";

/** Store key holding the defaults set last filled, so a user's later edit is never undone. */
const MARK = "setup.filled";

/** Store key holding the keys the last fill wrote, so a release that stops naming one can take it back. */
const OWNED = "setup.owned";

/** The text of the user settings file, or undefined when it does not exist. */
async function readSettings(
	$: EngineInterface,
	path: string
): Promise<string | undefined> {
	return (await $.fs.exists(path)) ? $.fs.read(path) : undefined;
}

/**
 * Unloads the builtins the repair just turned off by running /reload-plugins, which a hook can run
 * in an interactive session (claude 2.1.329: "Reloaded: 1 plugin …"); a print session refuses it
 * ("isn't available over a remote connection"), so there they stay loaded until the next start.
 */
async function unloadNow(
	$: EngineInterface,
	isInteractive: boolean
): Promise<string> {
	const later = "They stay loaded until the next start.";
	if (!isInteractive) {
		return later;
	}
	try {
		await $.command.run({ command: "reload-plugins" });
		return "claudetto reloaded the plugins, so they are unloaded now.";
	} catch (error) {
		fault($, "builtin reload", error);
		return later;
	}
}

/** Tells the person what the repair and the fill changed. */
async function logChanges(
	$: EngineInterface,
	path: string,
	drifted: readonly string[],
	added: readonly string[],
	isInteractive: boolean
): Promise<void> {
	if (drifted.length > 0) {
		const reload = await unloadNow($, isInteractive);
		$.ui.log(
			`claudetto turned off ${drifted.length} builtin plugin(s) in user settings: ${drifted.join(", ")}. ${reload}`
		);
	}
	if (added.length > 0) {
		$.ui.log(fillNotice(path, added));
	}
}

/** The repaired settings after the fill, with what it changed. */
interface Settled {
	readonly text: string;
	readonly added: readonly string[];
	readonly owned: readonly OwnedKey[] | undefined;
}

/** Fills when this fill version has not run; the repaired text passes through otherwise. */
async function settle(
	$: EngineInterface,
	text: string,
	walls: readonly string[] | undefined
): Promise<Settled> {
	if ((await $.store.get(MARK)) === FILL_VERSION) {
		return { text, added: [], owned: undefined };
	}
	const previous = readOwned(await $.store.get(OWNED));
	const fill = fillSettings(text, walls, previous);
	return {
		text: fill?.text ?? text,
		added: fill?.added ?? [],
		owned: fill?.owned
	};
}

/** Longest wait for the engine to load the written file, in ms. */
const LOAD_WAIT_MS = 3000;

/** Gap between two reads of the engine's settings while waiting, in ms. */
const POLL_MS = 50;

/** Reads `outputStyle` until it equals `want` or `left` ms have passed. */
async function poll(
	$: EngineInterface,
	want: unknown,
	left: number
): Promise<void> {
	if (left <= 0 || (await $.settings.read({ key: "outputStyle" })) === want) {
		return;
	}
	await $.clock.sleep(POLL_MS);
	await poll($, want, left - POLL_MS);
}

/**
 * Waits until the engine's merged settings hold the `outputStyle` the fill just wrote, so the first
 * request is built with the filled settings. Without the wait the engine loads the file after that
 * request, and the second one carries the changed sandbox and style text as a delta: about 5k more
 * cache-write tokens per first session (claude 2.1.329, eval run 2026-11-24T03-08, trivial-typo).
 */
async function awaitLoad($: EngineInterface, text: string): Promise<void> {
	const want = fieldOf(JSON.parse(text), "outputStyle");
	if (want === undefined) {
		return;
	}
	try {
		await poll($, want, LOAD_WAIT_MS);
	} catch {
		// The wait only saves cache tokens: the file is written and recorded, and the engine loads it after the first request either way.
	}
}

/** After the write, stores the fill version and the keys the fill wrote. */
async function record($: EngineInterface, settled: Settled): Promise<void> {
	if (settled.owned !== undefined) {
		await $.store.set(OWNED, settled.owned);
		await $.store.set(MARK, FILL_VERSION);
	}
}

/**
 * Repairs builtin drift (REQ-SETUP-011) and applies claudetto's own
 * construction to user settings once per fill version, in one read and one
 * write. Core allows one unmatched `session.start` registration per plugin, so
 * both share this hook, and so does the web tools' registration
 * (REQ-TOOLS-020).
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
		const settled = await settle($, repair.text, walls);
		const changed = repair.drifted.length > 0 || settled.added.length > 0;
		if (changed) {
			await $.fs.write(path, settled.text);
		}
		await logChanges($, path, repair.drifted, settled.added, e.isInteractive);
		await record($, settled);
		if (changed) {
			await awaitLoad($, settled.text);
		}
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
