/** The per-session rows kept in the store, and the pure rules over them. */

import type { Check } from "../check/log";
import { NOTE_READ_MS, SESSIONS_MAX, SHOWN_KEEP_MS } from "../shared/constants";

export type View =
	| {
			kind: "offer";
			line: string;
			explanation?: string | undefined;
			shownAt?: number;
			promptsSurvived?: number;
			isOffArmed?: boolean;
	  }
	| { kind: "explaining"; line: string; iteration?: number }
	| {
			kind: "explained";
			line: string;
			text: string;
			iteration?: number;
			shownAt?: number;
			promptsSurvived?: number;
	  }
	| { kind: "asked"; line: string; iteration?: number; shownAt?: number }
	| { kind: "failed"; reason: string }
	| { kind: "off"; line: string; shownAt?: number };

export type OpenView = Extract<View, { kind: "offer" | "explained" }>;

export interface Row {
	id: string;
	view?: View | undefined;
	tag?: string | undefined;
	offeredTurn?: string | undefined;
	askedTurn?: string | undefined;
	checked?: number | undefined;
	checks?: Check[] | undefined;
}

export type Idle = { readonly ms: number } | { readonly since: number };
export interface Watched {
	shownAt: number | undefined;
	line: string;
	idle: Idle;
}

const VIEW_KINDS: ReadonlySet<unknown> = new Set([
	"offer",
	"explaining",
	"explained",
	"asked",
	"failed",
	"off"
]);

/** Checks the kind alone: the store holds only what this plugin wrote, so a known kind is a view. */
export const isView = (value: unknown): value is View =>
	typeof value === "object" &&
	value !== null &&
	VIEW_KINDS.has(Reflect.get(value, "kind"));

export const viewOf = (value: unknown): View | null =>
	isView(value) ? value : null;

export const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value !== null &&
	typeof Reflect.get(value, "id") === "string" &&
	(Reflect.get(value, "view") === undefined ||
		isView(Reflect.get(value, "view")));

export const rowsOf = (value: unknown): Row[] =>
	Array.isArray(value) ? value.filter((item) => isRow(item)) : [];

export const rowOf = (value: unknown, id: string): Row | undefined =>
	rowsOf(value).find((r) => r.id === id);

export const droppedOf = (before: unknown, after: readonly Row[]): Row[] =>
	rowsOf(before).filter((r) => !after.some((c) => c.id === r.id));

export const isOpenView = (view: View | null | undefined): view is OpenView =>
	view?.kind === "offer" || view?.kind === "explained";

export const openRowsOf = (
	rows: readonly Row[]
): { view: OpenView; tag: Row["tag"] }[] =>
	rows.flatMap((r) =>
		isOpenView(r.view) ? [{ view: r.view, tag: r.tag }] : []
	);

const withoutView = (r: Row, id: string): Row => {
	if (r.id !== id) {
		return r;
	}
	return { ...r, view: undefined };
};

export const withViewCleared = (rows: unknown, id: string): Row[] =>
	rowsOf(rows).map((r) => withoutView(r, id));

/** The new row first; past SESSIONS_MAX the oldest rows go, rows with a recently shown open note last. */
export function withRow(
	rows: unknown,
	row: Row,
	now: number = Date.now()
): Row[] {
	const others = rowsOf(rows).filter((r) => r.id !== row.id);
	const over = 1 + others.length - SESSIONS_MAX;
	if (over <= 0) {
		return [row, ...others];
	}
	const recent = (r: Row): boolean =>
		isOpenView(r.view) &&
		r.view.shownAt !== undefined &&
		now - r.view.shownAt < SHOWN_KEEP_MS;
	const oldestFirst = others.toReversed();
	const drop = new Set(
		[
			...oldestFirst.filter((r) => !recent(r)),
			...oldestFirst.filter((r) => recent(r))
		].slice(0, over)
	);
	return [row, ...others.filter((r) => !drop.has(r))];
}

export const isSameShowing = (
	a: View | null | undefined,
	b: OpenView
): a is OpenView =>
	isOpenView(a) && a.kind === b.kind && a.shownAt === b.shownAt;

export const storedCount = (value: unknown): number =>
	typeof value === "number" && Number.isSafeInteger(value) && value >= 0
		? value
		: 0;

export function iterationOf(view: View): number | undefined {
	if (view.kind === "explained") {
		return storedCount(view.iteration);
	}
	if (view.kind === "asked") {
		return view.iteration === undefined
			? undefined
			: storedCount(view.iteration);
	}
	return undefined;
}

export const keptPastPrompt = (view: OpenView, survived: number): OpenView =>
	view.kind === "offer"
		? { ...view, promptsSurvived: survived, isOffArmed: false }
		: { ...view, promptsSurvived: survived };

export const drawsBand = (
	surfaces: readonly string[],
	rendered: ReadonlySet<string>
): boolean => surfaces.some((s) => s === "terminal" || rendered.has(s));

export const isBandWatched = (
	surfaces: readonly string[],
	rendered: ReadonlySet<string>,
	isBridge: boolean
): boolean =>
	drawsBand(
		isBridge ? surfaces.filter((s) => s !== "terminal") : surfaces,
		rendered
	);

export const idleMsOf = (idle: Idle, now: number): number =>
	"since" in idle ? now - idle.since : idle.ms;

export const isNoteRead = (
	entry: Watched | undefined,
	view: OpenView,
	now: number
): boolean =>
	view.kind === "offer" &&
	view.isOffArmed !== true &&
	entry !== undefined &&
	entry.shownAt === view.shownAt &&
	entry.line === view.line &&
	idleMsOf(entry.idle, now) >= NOTE_READ_MS;

export const isOfferDue = (
	askedTurn: string | undefined,
	turnId: string,
	ended: boolean
): boolean => askedTurn === turnId && !ended;

export const isUnattendedInFlight = (
	view: View | null | undefined,
	id: string,
	explaining: ReadonlySet<string>
): boolean => view?.kind === "explaining" && !explaining.has(id);

export function forgetDetached(
	set: Set<string>,
	surfaces: readonly string[]
): void {
	for (const s of set) {
		if (!surfaces.includes(s)) {
			set.delete(s);
		}
	}
}

export const promptedAtTurnStart = <T>(
	map: ReadonlyMap<string, T>,
	id: string,
	index: number
): T | undefined => (index === 0 ? map.get(id) : undefined);
