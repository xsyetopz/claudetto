/** Reads and writes of the plugin's persistent store and per-session state. */

import type { EngineInterface } from "claude-code";

import { withKnown } from "../request/parse";
import { SEEN_MAX } from "./constants";
import { fault } from "./fault";

export const stringLines = (value: unknown): string[] =>
	Array.isArray(value)
		? value.filter((v): v is string => typeof v === "string")
		: [];

/** Remembers `line` as known so it is never offered again. */
export async function markKnown(
	$: EngineInterface,
	line: string
): Promise<void> {
	const known = stringLines(await $.store.get("known"));
	const next = withKnown(known, line, SEEN_MAX);
	if (next !== undefined) {
		await $.store.set("known", next);
	}
}

/** The key of the note whose "what is this" card is open in this session. */
export async function aboutShown(
	$: EngineInterface,
	id: string
): Promise<string | undefined> {
	try {
		const open = await $.state.get({
			plugin: "claudetto-you-should-know",
			key: "aboutOpen",
			id
		});
		return open.value;
	} catch (error) {
		fault($, "about read", error);
		return undefined;
	}
}

/** Opens the card for `key`, or closes it when it is open already. */
export async function toggleAbout(
	$: EngineInterface,
	args: { readonly sid: string; readonly key: string }
): Promise<void> {
	try {
		const ref = {
			plugin: "claudetto-you-should-know",
			key: "aboutOpen",
			id: args.sid
		} as const;
		const read = await $.state.get(ref);
		await $.state.set(ref, read.value === args.key ? "" : args.key, {
			ifVersion: read.version
		});
	} catch (error) {
		fault($, "about toggle", error);
		// a lost race or a refused write leaves the card as it was
	}
}
