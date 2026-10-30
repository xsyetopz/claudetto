// The check itself, in the order the original runs it: the first step of a turn settles the prompts
// typed past an open view, a check step is held back or marked, and the one request goes out apart
// from the hook, so a step never waits on the model
// (`docs/keep/plugins/you-should-know-design.txt:73-79` and `:127-128`).

import { afterIgnored, type Counters, holdFor } from "./cadence.ts";
import { BORROWED } from "./constants.ts";
import { digestOf } from "./digest.ts";
import { isRepeat, remember } from "./lines.ts";
import { ended, inFlight, typedPast, work } from "./memory.ts";
import type { Settings } from "./options.ts";
import {
	loadCount,
	loadRow,
	type Ports,
	saveCounters,
	saveRow,
} from "./ports.ts";
import { bodyOf, requestOf } from "./prompt.ts";
import { parseReply } from "./reply.ts";
import { KEYS, listOf, type Row } from "./rows.ts";

/** Where a step is: the session, and the turn the step belongs to. */
export interface At {
	readonly id: string;
	readonly turnId: string;
}

const closed = (row: Row): Row => ({ ...row, view: null });

/**
 * The first step of a turn. A dismissed question is cancelled, and an offer that two prompts were
 * typed past is cleared and counted as ignored; an explanation always stays
 * (`docs/keep/plugins/you-should-know-design.txt:127`).
 */
export const settleTyped = async (p: Ports, id: string): Promise<void> => {
	const row = await loadRow(p, id);
	const kind = row.view?.kind;
	if (kind === undefined) {
		typedPast.delete(id);
		return;
	}
	if (kind === "explained") {
		return;
	}
	const passed = typedPast.get(id) ?? 0;
	if (kind === "offer" && passed < BORROWED.CLEAR_AFTER_PROMPTS) {
		return;
	}
	typedPast.delete(id);
	await saveRow(p, closed(row));
	if (kind === "offer") {
		await saveCounters(p, afterIgnored(await loadCount(p, KEYS.TYPED_PAST)));
	}
	p.refresh();
};

/** The reply of a check, shown when it is a new line and the check is still due. */
const showReply = async (p: Ports, at: At, text: string): Promise<void> => {
	const row = await loadRow(p, at.id);
	if (ended.has(at.id) || row.askedTurn !== at.turnId || row.view !== null) {
		return;
	}
	const reply = parseReply(text);
	if (reply.kind !== "offer") {
		return;
	}
	const seen = listOf(await p.read(KEYS.SEEN));
	const known = listOf(await p.read(KEYS.KNOWN));
	if (isRepeat(reply.line, [seen, known])) {
		return;
	}
	await p.write(KEYS.SEEN, remember(seen, reply.line));
	await saveRow(p, {
		...row,
		view: {
			kind: "offer",
			line: reply.line,
			explanation: reply.explanation,
			shownAt: p.now(),
		},
		tag: reply.tag,
		offeredTurn: at.turnId,
	});
	typedPast.delete(at.id);
	p.refresh();
};

/** The one request of a check, and what its answer does. */
const runCheck = async (
	p: Ports,
	settings: Settings,
	at: At,
): Promise<void> => {
	try {
		const seen = listOf(await p.read(KEYS.SEEN));
		const known = listOf(await p.read(KEYS.KNOWN));
		const body = bodyOf(seen, known, digestOf(work.entries));
		const text = await p.ask(requestOf(settings, body));
		if (text !== undefined) {
			await showReply(p, at, text);
		}
	} finally {
		inFlight.delete(at.id);
	}
};

/** The back-off pays for the check it skips: one less to skip, the other counter as it was. */
const spendSkip = async (p: Ports, skips: number): Promise<void> => {
	const counters: Counters = {
		typedPastInARow: await loadCount(p, KEYS.TYPED_PAST),
		looksToSkip: skips - 1,
	};
	await saveCounters(p, counters);
};

/**
 * A check step. It is held back for one of the reasons of `holdFor`, or it marks the turn as asked
 * and schedules the request. An error of the request is swallowed: no one awaits it, the original
 * swallows the failure of its own side request the same way (design line 151, `.catch(() => {})`),
 * and the cost of a lost check is one offer not made.
 */
export const considerCheck = async (
	p: Ports,
	settings: Settings,
	at: At,
): Promise<void> => {
	const row = await loadRow(p, at.id);
	const skips = await loadCount(p, KEYS.LOOKS_TO_SKIP);
	const hold = holdFor({
		turnId: at.turnId,
		surfaces: await p.surfaces(),
		row,
		inFlight: inFlight.has(at.id),
		looksToSkip: skips,
	});
	if (hold === "backing-off") {
		await spendSkip(p, skips);
		return;
	}
	if (hold !== undefined) {
		return;
	}
	await saveRow(p, { ...row, askedTurn: at.turnId });
	inFlight.add(at.id);
	p.later(0, () => {
		runCheck(p, settings, at).catch(() => undefined);
	});
};
