// The grader of the handoff probe: an item survives when each planted token is in the body of its section of the handoff. It reads no English.

import { handoffText } from "../../plugins/claudetto/modules/session/handoff/handover.ts";
import { EVAL_STATS_CONFIDENCE } from "../../tools/limits.ts";
import { wilson, zForConfidence } from "../stats/math.ts";
import type { Item, Session } from "./session.ts";

export interface Scored {
	readonly item: Item;
	readonly kept: boolean;
}

export interface Rate {
	readonly n: number;
	readonly kept: number;
	readonly share: number;
	readonly low: number;
	readonly high: number;
}

/** The handoff that code builds for `session`, as the adapter fills the input (`name`, `tasks`, and the passed checks). */
export const handoffOf = (
	session: Session,
	upTo = session.messages.length,
	tasks = session.tasks,
): string =>
	handoffText({
		messages: session.messages.slice(0, upTo),
		name: "probe-change",
		tasks,
		checks: [],
		root: "",
	});

/** The body of `heading` in `text` up to the next `## ` heading, or `""` when the heading is missing. */
export const sectionOf = (text: string, heading: string): string => {
	const start = text.indexOf(`\n${heading}\n`);
	if (start < 0) {
		return "";
	}
	const body = text.slice(start + heading.length + 2);
	const end = body.indexOf("\n## ");
	return (end < 0 ? body : body.slice(0, end)).trim();
};

export const scoreItems = (session: Session, handoff: string): Scored[] =>
	session.items.map((item) => {
		const text =
			item.upTo === undefined
				? handoff
				: handoffOf(session, item.upTo, item.tasks);
		const body = sectionOf(text, item.section);
		return { item, kept: item.tokens.every((t) => body.includes(t)) };
	});

/** The survival rate of `scored` as one row, with its Wilson interval at `EVAL_STATS_CONFIDENCE`. */
export const rates = (scored: readonly { kept: boolean }[]): Rate[] => {
	const n = scored.length;
	const kept = scored.filter((s) => s.kept).length;
	const ci =
		n === 0
			? { low: 0, high: 1 }
			: wilson(kept, n, zForConfidence(EVAL_STATS_CONFIDENCE));
	return [{ n, kept, share: n === 0 ? 0 : kept / n, ...ci }];
};
