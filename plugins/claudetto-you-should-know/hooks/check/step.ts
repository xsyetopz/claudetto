/** The turn steps: the third and every sixth one may ask the model for a note to show. */

import type { EngineInterface, On } from "claude-code";

import {
	drawsBand,
	isBandWatched,
	isOpenView,
	isSameShowing,
	isUnattendedInFlight,
	keptPastPrompt,
	promptedAtTurnStart,
	rowOf,
	storedCount,
	withRow
} from "../session/rows";
import {
	CHECK_EVERY,
	CLEAR_AFTER_PROMPTS,
	FIRST_CHECK,
	LOOKS_TO_SKIP_MAX
} from "../shared/constants";
import type { Ctx } from "../shared/context";
import { swallow } from "../shared/fault";
import { looksToSkipAfter } from "./backoff";
import { runCheck } from "./run";

export interface StepAt {
	readonly turnId: string;
	readonly index: number;
}

/** True on the steps that may start a check: the third, then the sixth, twelfth and so on. */
export const isCheckStep = (index: number): boolean =>
	index === FIRST_CHECK || (index > 0 && index % CHECK_EVERY === 0);

async function setView(
	$: EngineInterface,
	id: string,
	view: undefined
): Promise<void> {
	const rows = await $.store.get("sessions");
	await $.store.set(
		"sessions",
		withRow(rows, { ...(rowOf(rows, id) ?? { id }), view })
	);
}

/** A person's prompts since a note was shown decide whether it stays or counts as ignored. */
async function onTurnStart(
	$: EngineInterface,
	id: string,
	ctx: Ctx,
	view: ReturnType<typeof viewAt>
): Promise<void> {
	const prompted = promptedAtTurnStart(ctx.promptsSince, id, 0);
	if (view?.kind === "asked") {
		ctx.askedTimers.get(id)?.cancel();
		ctx.askedTimers.delete(id);
		await setView($, id, undefined);
		$.ui.invalidate("ui.render");
	}
	if (!isOpenView(view) || prompted === undefined) {
		return;
	}
	const survived = storedCount(view.promptsSurvived) + prompted.count;
	const rows = await $.store.get("sessions");
	const cur = rowOf(rows, id)?.view;
	if (!isSameShowing(cur, view)) {
		return;
	}
	const keep = cur.kind === "explained" || survived < CLEAR_AFTER_PROMPTS;
	await $.store.set(
		"sessions",
		withRow(rows, {
			...(rowOf(rows, id) ?? { id }),
			view: keep ? keptPastPrompt(cur, survived) : undefined
		})
	);
	if (keep) {
		if (cur.kind === "offer" && cur.isOffArmed === true) {
			$.ui.invalidate("ui.render");
		}
		return;
	}
	$.ui.invalidate("ui.render");
	const streak = storedCount(await $.store.get("typedPastInARow")) + 1;
	await $.store.set("typedPastInARow", streak);
	await $.store.set("looksToSkip", looksToSkipAfter(streak));
}

const viewAt = (view: ReturnType<typeof rowOf>) => view?.view ?? null;

/** The row and view at a step, with an unattended in-flight view cleared once a second read confirms it. */
async function viewForStep(
	$: EngineInterface,
	id: string,
	ctx: Ctx
): Promise<{ row: ReturnType<typeof rowOf>; view: ReturnType<typeof viewAt> }> {
	const row = rowOf(await $.store.get("sessions"), id);
	const view = viewAt(row);
	if (!isUnattendedInFlight(view, id, ctx.explaining)) {
		return { row, view };
	}
	const fresh = rowOf(await $.store.get("sessions"), id);
	if (!isUnattendedInFlight(fresh?.view, id, ctx.explaining)) {
		return { row, view: fresh?.view ?? null };
	}
	await setView($, id, undefined);
	$.ui.invalidate("ui.render");
	return { row: rowOf(await $.store.get("sessions"), id), view: null };
}

async function onStep(
	$: EngineInterface,
	e: StepAt,
	id: string,
	surfaces: readonly string[],
	ctx: Ctx
): Promise<void> {
	ctx.ended.delete(id);
	const isStart = e.index === 0;
	const { row, view } = await viewForStep($, id, ctx);
	if (isStart) {
		await onTurnStart($, id, ctx, view);
		ctx.promptsSince.delete(id);
		return;
	}
	const skip =
		!isCheckStep(e.index) ||
		row?.offeredTurn === e.turnId ||
		view !== null ||
		!isBandWatched(surfaces, ctx.rendered, ctx.bridge.has(id));
	if (skip || ctx.checking.has(id)) {
		return;
	}
	const looks = Math.min(
		LOOKS_TO_SKIP_MAX,
		storedCount(await $.store.get("looksToSkip"))
	);
	if (looks > 0) {
		await $.store.set("looksToSkip", looks - 1);
		return;
	}
	ctx.checking.set(
		id,
		runCheck($, { id, turnId: e.turnId, index: e.index }, ctx)
			.catch(swallow($, "check"))
			.finally(() => {
				ctx.checking.delete(id);
			})
	);
}

/** Starts the step's check where the band is drawn; a fault is logged, never thrown. */
async function watchStep(
	$: EngineInterface,
	e: StepAt,
	ctx: Ctx
): Promise<void> {
	try {
		const surfaces = await $.session.surfaces();
		if (surfaces.length === 0 || !drawsBand(surfaces, ctx.rendered)) {
			return;
		}
		await onStep($, e, await $.session.id(), surfaces, ctx);
	} catch (error) {
		swallow($, "turn.step")(error);
	}
}

export function registerStep(on: On, ctx: Ctx): void {
	on("turn.step", async function* ($, e, next) {
		if (e.agentId !== undefined) {
			return yield* next(e);
		}
		void watchStep($, e, ctx);
		return yield* next(e);
	});
}
