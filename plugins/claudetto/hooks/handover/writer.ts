import type { EngineInterface, ModelUsage } from "claude-code";

import { fault } from "../shared/fault";
import { compose, extract, FORK_PROMPT, verbatim } from "./text";

/** A written handover and, when a fork wrote it, what the fork cost. */
export interface Handover {
	text: string;
	usage?: ModelUsage;
}

/** The store key of the handover a `/clear` left for the next first request. */
export const PENDING = "handover.pending";

/** Reads one env knob as set (non-empty) or not. */
export async function isSet(
	value: Promise<string | undefined>
): Promise<boolean> {
	const text = await value;
	return Boolean(text?.trim());
}

/** True when `CLAUDETTO_DISABLE_HANDOVER` turns every handover path off. */
export function isOff($: EngineInterface): Promise<boolean> {
	return isSet($.env.get("CLAUDETTO_DISABLE_HANDOVER"));
}

/**
 * Reads one settings knob of the handover, the mirror of a compaction key
 * (`autoHandoverEnabled` for `autoCompactEnabled`); undefined when unset.
 */
export async function knob(
	$: EngineInterface,
	key:
		"autoHandoverEnabled" | "autoHandoverWindow" | "precomputeHandoverEnabled"
): Promise<unknown> {
	try {
		return await $.settings.read({ key });
	} catch (error) {
		fault($, "handover setting", error);
		return undefined;
	}
}

/**
 * True when `CLAUDETTO_DISABLE_AUTO_HANDOVER`, `autoHandoverEnabled: false` or
 * the full switch turns the automatic paths off.
 */
export async function isAutoOff($: EngineInterface): Promise<boolean> {
	return (
		(await isOff($)) ||
		(await isSet($.env.get("CLAUDETTO_DISABLE_AUTO_HANDOVER"))) ||
		(await knob($, "autoHandoverEnabled")) === false
	);
}

async function git($: EngineInterface, argv: string[]): Promise<string> {
	try {
		const r = await $.process.run(["git", ...argv]);
		return r.exitCode === 0 ? r.stdout.trim() : "";
	} catch (error) {
		fault($, "git", error);
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
	const rows = await $.session.messages();
	// ENGINE(v2.1.330): fork after request 1 misses ~4.2k tokens: messages[1] resent as string (#64)
	// With one request the conversation is one prompt and one reply, so it is handed over as written.
	const whole = verbatim(rows);
	if (whole === undefined) {
		// The clear and the compaction wait on the fork, so the person sees why.
		$.ui.status("Writing handover…");
		try {
			const r = await $.model.fork({ prompt: FORK_PROMPT, effort: "low" });
			if (r.isAnswered && r.text.trim() !== "") {
				body = r.text;
				usage = r.usage;
			}
		} catch (error) {
			// An API error takes the fallback like nothing-to-fork does.
			fault($, "handover fork", error);
		} finally {
			$.ui.status(void 0);
		}
	} else {
		body = whole;
	}
	if (body === "") {
		body = extract(rows);
	}
	const head = await git($, ["rev-parse", "--short", "HEAD"]);
	const status = await git($, ["status", "--short"]);
	return {
		text: compose(body, head, status),
		...(usage === undefined ? {} : { usage })
	};
}
