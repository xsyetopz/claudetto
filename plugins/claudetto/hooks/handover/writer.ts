import type { EngineInterface, ModelUsage } from "claude-code";
import { compose, extract, FORK_PROMPT } from "./text";
import { fault } from "../fault";

/** A written handover and, when a fork wrote it, what the fork cost. */
export type Handover = { text: string; usage?: ModelUsage };

/** The store key of the handover a `/clear` left for the next first request. */
export const PENDING = "handover.pending";

/** Reads one env knob as set (non-empty) or not. */
export async function isSet(value: Promise<string | undefined>): Promise<boolean> {
	return Boolean((await value)?.trim());
}

/** True when `CLAUDETTO_DISABLE_HANDOVER` turns every handover path off. */
export async function isOff($: EngineInterface): Promise<boolean> {
	return isSet($.env.get("CLAUDETTO_DISABLE_HANDOVER"));
}

/** True when `CLAUDETTO_DISABLE_AUTO_HANDOVER` (or the full switch) turns the automatic paths off. */
export async function isAutoOff($: EngineInterface): Promise<boolean> {
	return (await isOff($)) || (await isSet($.env.get("CLAUDETTO_DISABLE_AUTO_HANDOVER")));
}

async function git($: EngineInterface, argv: string[]): Promise<string> {
	try {
		const r = await $.process.run(["git", ...argv]);
		return r.exitCode === 0 ? r.stdout.trim() : "";
	} catch (err) {
		fault($, "git", err);
		return "";
	}
}

/**
 * Writes the handover with one low-effort fork over the cached prefix; on no
 * fork, an error or empty text it falls back to a free transcript extract.
 */
export async function writeHandover($: EngineInterface): Promise<Handover> {
	let body = "";
	let usage: ModelUsage | undefined;
	try {
		const r = await $.model.fork({ prompt: FORK_PROMPT, effort: "low" });
		if (r.isAnswered && r.text.trim() !== "") {
			body = r.text;
			usage = r.usage;
		}
	} catch (err) {
		// An API error takes the fallback like nothing-to-fork does.
		fault($, "handover fork", err);
	}
	if (body === "") body = extract(await $.session.messages());
	const head = await git($, ["rev-parse", "--short", "HEAD"]);
	const status = await git($, ["status", "--short"]);
	return { text: compose(body, head, status), usage };
}
