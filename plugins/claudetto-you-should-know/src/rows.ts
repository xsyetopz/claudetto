// What the plugin keeps in its store: one row per session, and the lists and counters beside them.
// Everything here is a plain value, so a test passes rows in and reads rows out.

import { BORROWED } from "./constants.ts";

/** The five store keys, and no others (`docs/keep/plugins/you-should-know-design.txt:118`). */
export const KEYS = {
	SESSIONS: "sessions",
	SEEN: "seen",
	KNOWN: "known",
	TYPED_PAST: "typedPastInARow",
	LOOKS_TO_SKIP: "looksToSkip",
} as const;

/** The state of an open view: an `offer` is the first line, `asked` is a dismissed offer waiting for a rating until it expires, `explained` is after `learn` showed the cards. */
export type ViewKind = "offer" | "asked" | "explained";

/** The line an open view shows, with the explanation that came in the same reply. */
export interface View {
	readonly kind: ViewKind;
	readonly line: string;
	readonly explanation: string;
	readonly shownAt: number;
}

/** One session: the view it shows (null when closed) and the turns that checked and offered. */
export interface Row {
	readonly id: string;
	readonly view: View | null;
	readonly tag: string;
	readonly offeredTurn: string;
	readonly askedTurn: string;
}

const VIEW_KINDS: readonly string[] = ["offer", "asked", "explained"];

const isView = (value: unknown): value is View =>
	typeof value === "object" &&
	value !== null &&
	"kind" in value &&
	typeof value.kind === "string" &&
	VIEW_KINDS.includes(value.kind) &&
	"line" in value &&
	typeof value.line === "string" &&
	"explanation" in value &&
	typeof value.explanation === "string" &&
	"shownAt" in value &&
	typeof value.shownAt === "number";

const isRow = (value: unknown): value is Row =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	typeof value.id === "string" &&
	"view" in value &&
	(value.view === null || isView(value.view)) &&
	"tag" in value &&
	typeof value.tag === "string" &&
	"offeredTurn" in value &&
	typeof value.offeredTurn === "string" &&
	"askedTurn" in value &&
	typeof value.askedTurn === "string";

/** The rows a stored value holds; anything that is not a row is dropped. */
export const sessionsOf = (value: unknown): readonly Row[] =>
	Array.isArray(value) ? value.filter(isRow) : [];

/** The lines a stored value holds, as strings only. */
export const listOf = (value: unknown): readonly string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

/** A stored counter, or 0 when it holds anything else. */
export const countOf = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;

/** The row of a session that has not offered anything yet. */
export const blankRow = (id: string): Row => ({
	id,
	view: null,
	tag: BORROWED.DEFAULT_TAG,
	offeredTurn: "",
	askedTurn: "",
});

/** The row of session `id` from `rows`, or a blank row when it has none. */
export const rowOf = (rows: readonly Row[], id: string): Row =>
	rows.find((row) => row.id === id) ?? blankRow(id);

/** Lower is evicted first: a closed row, then an open one past its keep time, then a fresh open one. */
const rankOf = (row: Row, now: number): number => {
	if (row.view === null) {
		return 0;
	}
	return now - row.view.shownAt > BORROWED.SHOWN_KEEP_MS ? 1 : 2;
};

/** The list with `row` first, capped at the most sessions kept, the cheapest to lose dropped first. */
export const withRow = (
	rows: readonly Row[],
	row: Row,
	now: number,
): readonly Row[] => {
	const others = rows
		.filter((other) => other.id !== row.id)
		.toSorted((a, b) => rankOf(b, now) - rankOf(a, now));
	return [row, ...others].slice(0, BORROWED.SESSIONS_MAX);
};
