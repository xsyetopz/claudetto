import type { EngineInterface, PluginOptions } from "claude-code";

import { repairSettings } from "../builtins/builtins";
import { builtinGitForced, GIT_CONFLICT, ownGitOn } from "../git/instructions";
import { fieldOf, stringsOf } from "../shared/field";
import { logChanges, record, settle } from "./fill";
import { userSettingsPath } from "./settings";
import { namesOwnStatusLine, wireStatusLine } from "./status-line";

/** The text of the user settings file, or undefined when it does not exist. */
async function readSettings(
	$: EngineInterface,
	path: string
): Promise<string | undefined> {
	return (await $.fs.exists(path)) ? $.fs.read(path) : undefined;
}

/** Longest wait for the engine to load the written file, in ms. */
const LOAD_WAIT_MS = 3000;

/** Gap between two reads of the engine's settings while waiting, in ms. */
const POLL_MS = 50;

/** The store key set once claudetto's status line command was in the user's settings. */
const WIRED = "statusLineWired";

/**
 * The settings text with claudetto's status line wired in. Run on every start,
 * not once per fill version, because a plugin upgrade moves the root the
 * command names; once claudetto's line was in the file, its absence means the
 * user removed it (`/statusline delete`), so it is put back only on `force`.
 */
async function wired(
	$: EngineInterface,
	text: string,
	force: boolean
): Promise<string> {
	const wasWired = !force && (await $.store.get(WIRED)) === true;
	const next = wireStatusLine(text, $.plugin.root, wasWired);
	if (!wasWired && namesOwnStatusLine(next)) {
		await $.store.set(WIRED, true);
	}
	return next;
}

/** Reads `outputStyle` until it equals `want` or `gate.isOpen` turns false. */
async function poll(
	$: EngineInterface,
	want: unknown,
	gate: { isOpen: boolean }
): Promise<void> {
	if (
		!gate.isOpen ||
		(await $.settings.read({ key: "outputStyle" })) === want
	) {
		return;
	}
	await $.clock.sleep(POLL_MS);
	await poll($, want, gate);
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
		// The bound is wall-clock time: a read that waits on the engine's settings reload takes
		// far longer than POLL_MS, so counting polls let session start run for seconds and, under a
		// busy loop, for as long as the reads stayed slow ("Running SessionStart hooks" never cleared).
		const gate = { isOpen: true };
		try {
			await Promise.race([poll($, want, gate), $.clock.sleep(LOAD_WAIT_MS)]);
		} finally {
			gate.isOpen = false;
		}
	} catch {
		// The wait only saves cache tokens: the file is written and recorded, and the engine loads it after the first request either way.
	}
}

/** How a fill runs: whether a person is at the session, and whether to apply all of it again. */
export interface Run {
	readonly isInteractive: boolean;
	readonly force: boolean;
}

/**
 * Repairs builtin drift (SETUP-011) and applies claudetto's own
 * construction to user settings once per fill version, or now on `force`, in one read and one
 * write. Returns the settings path and whether the file changed.
 */
export async function fillSettings(
	$: EngineInterface,
	run: Run,
	options: PluginOptions
): Promise<{ readonly path: string; readonly changed: boolean }> {
	const path = await userSettingsPath($);
	const repair = repairSettings(await readSettings($, path));
	if (repair === undefined) {
		$.ui.log(`Left \`${path}\` alone: it does not hold a JSON object.`);
		return { path, changed: false };
	}
	const settled = await settle(
		$,
		repair.text,
		stringsOf(options["protectedPaths"]),
		run.force
	);
	const text = await wired($, settled.text, run.force);
	const isWired = text !== settled.text;
	const changed =
		repair.drifted.length > 0 || settled.added.length > 0 || isWired;
	if (changed) {
		await $.fs.write(path, text);
	}
	if (isWired) {
		$.ui.log(`Set \`statusLine\` in \`${path}\` to the plugin script.`);
	}
	await logChanges($, path, repair.drifted, settled.added, run.isInteractive);
	await record($, settled);
	if (changed) {
		await awaitLoad($, text);
	}
	// Only an explicit turn-on counts: an unset switch is the fill's to set, and a value the fill wrote just now is not read back until the next session.
	if (ownGitOn(options) && (await builtinGitForced($))) {
		$.ui.log(GIT_CONFLICT);
	}
	return { path, changed };
}
