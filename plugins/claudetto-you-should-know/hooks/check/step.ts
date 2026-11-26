/** The turn steps: the third and every sixth one may ask the model for a note to show, and so may the end of a turn whose last steps no check saw. */

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
import { startRecheck, untouchedOffer } from "./recheck";
import { runCheck } from "./run";

export interface StepAt {
	readonly turnId: string;
	readonly index: number;
}

/** True on the steps that may start a check: the third, then the sixth, twelfth and so on. */
export const isCheckStep = (index: number): boolean =>
	index === FIRST_CHECK || (index > 0 && index % CHECK_EVERY === 0);

/**
 * True when a turn that ended at step `last` holds steps no check saw: a check at step n reads the
 * results up to step n, so a turn that ran past its last check step has unread work. A short turn
 * whose risky command came at step 4 or 5 would otherwise end unchecked (ADR-0203).
 */
const isEndCheck = (last: number | undefined): last is number =>
	last !== undefined && last > FIRST_CHECK && !isCheckStep(last);

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

/** Starts a check at `at` unless a note is up, one was offered this turn, the band is unwatched, a backoff look is due or a check runs. */
async function startCheck(
	$: EngineInterface,
	at: { readonly id: string; readonly turnId: string; readonly index: number },
	row: ReturnType<typeof rowOf>,
	view: ReturnType<typeof viewAt>,
	surfaces: readonly string[],
	ctx: Ctx
): Promise<void> {
	const { id } = at;
	const skip =
		row?.offeredTurn === at.turnId ||
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
		runCheck($, at, ctx)
			.catch(swallow($, "check"))
			.finally(() => {
				ctx.checking.delete(id);
			})
	);
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
	if (
		isCheckStep(e.index) &&
		row?.offeredTurn === e.turnId &&
		view?.kind === "offer"
	) {
		startRecheck($, { id, turnId: e.turnId, index: e.index }, ctx);
		return;
	}
	if (isCheckStep(e.index)) {
		await startCheck(
			$,
			{ id, turnId: e.turnId, index: e.index },
			row,
			view,
			surfaces,
			ctx
		);
	}
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

/**
 * At the end of the main agent's turn, an offer shown this turn is rechecked once more; with no
 * offer, a turn that ran past its last check step gets one check of its own.
 */
async function watchEnd(
	$: EngineInterface,
	e: { readonly turnId: string },
	last: number | undefined,
	ctx: Ctx
): Promise<void> {
	try {
		const id = await $.session.id();
		if ((await untouchedOffer($, id, e.turnId)) !== undefined) {
			// a recheck from a step may still be running: let it end, then judge the whole turn
			await ctx.checking.get(id);
			startRecheck($, { id, turnId: e.turnId, index: 0 }, ctx);
			return;
		}
		if (!isEndCheck(last)) {
			return;
		}
		// a check from a step may still be running, and the note it shows takes the turn
		await ctx.checking.get(id);
		const surfaces = await $.session.surfaces();
		if (surfaces.length === 0 || !drawsBand(surfaces, ctx.rendered)) {
			return;
		}
		const { row, view } = await viewForStep($, id, ctx);
		await startCheck(
			$,
			{ id, turnId: e.turnId, index: last },
			row,
			view,
			surfaces,
			ctx
		);
	} catch (error) {
		swallow($, "turn.complete")(error);
	}
}

export function registerStep(on: On, ctx: Ctx): void {
	// the last step of each running main-agent turn, read when the turn ends
	const lastStep = new Map<string, number>();
	on("turn.complete", ($, e, next) => {
		if (e.agentId === undefined) {
			const last = lastStep.get(e.turnId);
			lastStep.delete(e.turnId);
			void watchEnd($, e, last, ctx);
		}
		return next(e);
	});
	on("turn.step", async function* ($, e, next) {
		if (e.agentId !== undefined) {
			return yield* next(e);
		}
		lastStep.set(e.turnId, Math.max(e.index, lastStep.get(e.turnId) ?? 0));
		void watchStep($, e, ctx);
		return yield* next(e);
	});
}
