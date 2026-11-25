/** One model check: ask the fork for a note, judge the answer, store the offer. */

import type { EngineInterface } from "claude-code";

import { lineKey, parseProposedLine } from "../request/parse";
import { proposePrompt } from "../request/prompt";
import { isOfferDue, type Row, rowOf, withRow } from "../session/rows";
import { SEEN_MAX } from "../shared/constants";
import type { Ctx } from "../shared/context";
import { fault } from "../shared/fault";
import { stringLines } from "../shared/store";
import { switchOf } from "./backoff";
import {
	type Check,
	checksOf,
	checksWith,
	type Outcome,
	UNANSWERED_OUTCOMES
} from "./log";

export interface CheckAt {
	readonly id: string;
	readonly turnId: string;
	readonly index: number;
}

async function writeRow(
	$: EngineInterface,
	id: string,
	patch: Partial<Row>
): Promise<void> {
	const rows = await $.store.get("sessions");
	await $.store.set(
		"sessions",
		withRow(rows, { ...(rowOf(rows, id) ?? { id }), ...patch })
	);
}

async function accept(
	$: EngineInterface,
	at: CheckAt,
	ctx: Ctx,
	text: string,
	seen: readonly string[],
	known: readonly string[]
): Promise<Outcome> {
	const proposed = parseProposedLine(text);
	if (proposed.kind !== "line") {
		return proposed.kind === "none" ? "none" : "parse_failed";
	}
	const key = lineKey(proposed.line);
	if ([...seen, ...known].some((l) => lineKey(l) === key)) {
		return "deduped";
	}
	const askedTurn = rowOf(await $.store.get("sessions"), at.id)?.askedTurn;
	if (!isOfferDue(askedTurn, at.turnId, ctx.ended.has(at.id))) {
		return "stale";
	}
	await $.store.set("seen", [...seen, proposed.line].slice(-SEEN_MAX));
	await writeRow($, at.id, {
		offeredTurn: at.turnId,
		tag: proposed.tag,
		view: {
			kind: "offer",
			line: proposed.line,
			explanation: proposed.explanation,
			shownAt: Date.now()
		}
	});
	ctx.promptsSince.delete(at.id);
	// the recheck judges only what happened after this note was shown
	ctx.since.delete(at.id);
	$.ui.invalidate("ui.render");
	return "shown";
}

/** Adds one entry to the debug check log when CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG is on; best effort. */
export async function recordCheck(
	$: EngineInterface,
	at: { readonly id: string; readonly index: number },
	outcome: Outcome,
	latencyMs: number
): Promise<void> {
	try {
		if (!(await switchOf($.env.get("CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG")))) {
			return;
		}
		const row = rowOf(await $.store.get("sessions"), at.id);
		const number = (row?.checked ?? 0) + 1;
		const check: Check = {
			number,
			step: at.index,
			outcome,
			latencyMs,
			at: Date.now()
		};
		await writeRow($, at.id, {
			checked: number,
			checks: checksWith(checksOf(row?.checks), check)
		});
		$.ui.invalidate("ui.render");
	} catch (error) {
		// the debug line is best effort
		fault($, "check debug row", error);
	}
}

/** Runs one check for the step `at`; never throws. */
export async function runCheck(
	$: EngineInterface,
	at: CheckAt,
	ctx: Ctx
): Promise<void> {
	await writeRow($, at.id, { askedTurn: at.turnId });
	const seen = stringLines(await $.store.get("seen"));
	const known = stringLines(await $.store.get("known"));
	const started = Date.now();
	let outcome: Outcome;
	try {
		const reply = await $.model.fork({ prompt: proposePrompt(seen, known) });
		outcome = reply.isAnswered
			? await accept($, at, ctx, reply.text, seen, known)
			: (UNANSWERED_OUTCOMES[reply.reason] ?? "error");
	} catch (error) {
		fault($, "check", error);
		outcome = "error";
	}
	await recordCheck($, at, outcome, Date.now() - started);
}
