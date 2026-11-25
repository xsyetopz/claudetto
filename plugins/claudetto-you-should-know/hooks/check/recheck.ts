/** One recheck: ask the fork whether a shown note still holds, and withdraw it when later steps made it untrue. */

import type { EngineInterface } from "claude-code";

import { rate, read } from "../judge/judge";
import {
	NOTE_NO_LONGER_HOLDS,
	parseVerdict,
	recheckPrompt
} from "../request/recheck-prompt";
import { isSameShowing, type OpenView, rowOf, withRow } from "../session/rows";
import type { Ctx } from "../shared/context";
import { fault, swallow } from "../shared/fault";
import type { Outcome } from "./log";
import { recordCheck } from "./run";

export interface RecheckAt {
	readonly id: string;
	readonly turnId: string;
	readonly index: number;
}

/** The offer a turn left untouched at `turnId`, or `undefined` when none is up. */
export async function untouchedOffer(
	$: EngineInterface,
	id: string,
	turnId: string
): Promise<Extract<OpenView, { kind: "offer" }> | undefined> {
	const row = rowOf(await $.store.get("sessions"), id);
	const view = row?.view;
	return row?.offeredTurn === turnId && view?.kind === "offer"
		? view
		: undefined;
}

/** Clears the view when it is still the showing `offer` was read from; true when it cleared. */
async function withdraw(
	$: EngineInterface,
	id: string,
	offer: OpenView
): Promise<boolean> {
	const rows = await $.store.get("sessions");
	const row = rowOf(rows, id);
	if (row === undefined || !isSameShowing(row.view, offer)) {
		return false;
	}
	await $.store.set("sessions", withRow(rows, { ...row, view: undefined }));
	$.ui.invalidate("ui.render");
	return true;
}

/**
 * Asks whether `offer` still holds; any fault or unclear answer keeps it (fail
 * open). With `TYPESAFE_API_KEY` set, Jev rates the note against the reply text
 * since it was shown (Haiku only when Jev fails); a yes drops it. Without the
 * key the fork reads the whole session, as before.
 */
async function verdictOn(
	$: EngineInterface,
	id: string,
	offer: Extract<OpenView, { kind: "offer" }>,
	ctx: Ctx
): Promise<"keep" | "drop"> {
	try {
		const after = ctx.since.get(id) ?? "";
		const ratings = await rate($, "recheck", {
			statements: [NOTE_NO_LONGER_HOLDS],
			state: {
				note: `${offer.line}${offer.explanation === undefined ? "" : `\n${offer.explanation}`}`,
				after
			}
		});
		if (ratings !== undefined) {
			return read(ratings[NOTE_NO_LONGER_HOLDS.id] ?? 0.5) === "yes"
				? "drop"
				: "keep";
		}
		const reply = await $.model.fork({
			prompt: recheckPrompt(offer.line, offer.explanation)
		});
		if (!reply.isAnswered) {
			return "keep";
		}
		const verdict = parseVerdict(reply.text);
		if (verdict === undefined) {
			fault($, "recheck", `unparseable verdict: ${reply.text.slice(0, 40)}`);
		}
		return verdict ?? "keep";
	} catch (error) {
		fault($, "recheck", error);
		return "keep";
	}
}

/** Rechecks the untouched offer of `turnId`; never throws. */
export async function runRecheck(
	$: EngineInterface,
	at: RecheckAt,
	ctx: Ctx
): Promise<void> {
	const offer = await untouchedOffer($, at.id, at.turnId);
	if (offer === undefined) {
		return;
	}
	const started = Date.now();
	if ((await verdictOn($, at.id, offer, ctx)) !== "drop") {
		return;
	}
	if (await withdraw($, at.id, offer)) {
		const outcome: Outcome = "withdrawn";
		await recordCheck($, at, outcome, Date.now() - started);
	}
}

/** Starts a recheck detached, one in flight per session; a fault is logged, never thrown. */
export function startRecheck(
	$: EngineInterface,
	at: RecheckAt,
	ctx: Ctx
): void {
	if (ctx.checking.has(at.id)) {
		return;
	}
	ctx.checking.set(
		at.id,
		runRecheck($, at, ctx)
			.catch(swallow($, "recheck"))
			.finally(() => {
				ctx.checking.delete(at.id);
			})
	);
}
