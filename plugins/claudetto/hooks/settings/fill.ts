import type { EngineInterface } from "claude-code";

import { fault } from "../shared/fault";
import {
	dropConflictText,
	FILL_VERSION,
	fillNotice,
	fillSettings
} from "./defaults";
import { type OwnedKey, readOwned } from "./owned";

/** Store key holding the defaults set last filled, so a user's later edit is never undone. */
const MARK = "setup.filled";

/** Store key holding the keys the last fill wrote, so a release that stops naming one can take it back. */
const OWNED = "setup.owned";

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
		return "Reloaded the plugins, so they are unloaded now.";
	} catch (error) {
		fault($, "builtin reload", error);
		return later;
	}
}

/** Tells the person what the repair and the fill changed. */
export async function logChanges(
	$: EngineInterface,
	path: string,
	drifted: readonly string[],
	added: readonly string[],
	isInteractive: boolean
): Promise<void> {
	if (drifted.length > 0) {
		const reload = await unloadNow($, isInteractive);
		$.ui.log(
			`Turned off ${drifted.length} builtin plugin(s) in user settings: ${drifted.map((name) => `\`${name}\``).join(", ")}. ${reload}`
		);
	}
	if (added.length > 0) {
		$.ui.log(fillNotice(path, added));
	}
}

/** The repaired settings after the fill, with what it changed. */
export interface Settled {
	readonly text: string;
	readonly added: readonly string[];
	readonly owned: readonly OwnedKey[] | undefined;
}

/** Fills when this fill version has not run or `force` is set; otherwise only the conflicting permission rules go. */
export async function settle(
	$: EngineInterface,
	text: string,
	walls: readonly string[] | undefined,
	force = false
): Promise<Settled> {
	if (!force && (await $.store.get(MARK)) === FILL_VERSION) {
		const dropped = dropConflictText(text);
		return {
			text: dropped?.text ?? text,
			added: dropped?.added ?? [],
			owned: undefined
		};
	}
	const previous = readOwned(await $.store.get(OWNED));
	const fill = fillSettings(text, walls, previous);
	return {
		text: fill?.text ?? text,
		added: fill?.added ?? [],
		owned: fill?.owned
	};
}

/** After the write, stores the fill version and the keys the fill wrote. */
export async function record(
	$: EngineInterface,
	settled: Settled
): Promise<void> {
	if (settled.owned !== undefined) {
		await $.store.set(OWNED, settled.owned);
		await $.store.set(MARK, FILL_VERSION);
	}
}
