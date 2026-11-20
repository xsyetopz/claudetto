/** Tracks how long a closed offer has sat unread, for the autosend that follows a read note. */

import type { View } from "../session/rows";
import { idleMsOf } from "../session/rows";
import { OFFER_LABELS } from "../shared/constants";
import type { Ctx } from "../shared/context";
import { aboutKeyOf, closedOfferRows } from "./copy";

/** The part of a drawn band the idle rules read. */
export interface Band {
	readonly surface: string;
	readonly props: {
		readonly hasSurvey: boolean;
		readonly isCollapsed: boolean;
		readonly isWorking: boolean;
		readonly bodyColumns: number;
		readonly maxRows: number;
		readonly scroll: { readonly offset: number };
	};
}

export interface Shown {
	readonly e: Band;
	readonly view: View | null;
	readonly tag: string;
	readonly about: string | undefined;
	readonly checkCount: number;
}

/** While the model works the clock stops: each idle entry keeps what it had gathered. */
export function freezeWorkingIdle(e: Band, ctx: Ctx): void {
	if (e.surface !== "terminal" || !e.props.isWorking) {
		return;
	}
	const now = Date.now();
	for (const [id, entry] of ctx.idle) {
		ctx.idle.set(id, { ...entry, idle: { ms: idleMsOf(entry.idle, now) } });
	}
}

const isClosedOffer = ({ e, view, tag, about, checkCount }: Shown): boolean =>
	e.surface === "terminal" &&
	!e.props.hasSurvey &&
	!e.props.isCollapsed &&
	checkCount === 0 &&
	view?.kind === "offer" &&
	view.isOffArmed !== true &&
	e.props.scroll.offset === 0 &&
	about !== aboutKeyOf(view) &&
	closedOfferRows({
		columns: e.props.bodyColumns,
		tag,
		line: view.line,
		labels: Object.values(OFFER_LABELS)
	}) <= e.props.maxRows;

/** Starts or carries on the idle count of a closed offer, and drops it when the offer is no longer closed. */
export function trackIdle(
	shown: Shown,
	ctx: Ctx,
	sid: string,
	isAborted: boolean
): void {
	const { view, e } = shown;
	if (!isClosedOffer(shown)) {
		ctx.idle.delete(sid);
		return;
	}
	if (view?.kind !== "offer" || view.shownAt === undefined || isAborted) {
		return;
	}
	const prev = ctx.idle.get(sid);
	const now = Date.now();
	const base =
		prev?.shownAt === view.shownAt && prev.line === view.line
			? prev.idle
			: { ms: 0 };
	ctx.idle.set(sid, {
		shownAt: view.shownAt,
		line: view.line,
		idle: e.props.isWorking
			? { ms: idleMsOf(base, now) }
			: { since: "since" in base ? base.since : now }
	});
}
