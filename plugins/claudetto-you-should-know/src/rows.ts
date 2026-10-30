import { BORROWED } from "./constants.ts";

export const KEYS = {
	SESSIONS: "sessions",
	SEEN: "seen",
	KNOWN: "known",
	TYPED_PAST: "typedPastInARow",
	LOOKS_TO_SKIP: "looksToSkip",
} as const;

export type ViewKind = "offer" | "asked" | "explained";

export interface View {
	readonly kind: ViewKind;
	readonly line: string;
	readonly explanation: string;
	readonly shownAt: number;
}

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

export const sessionsOf = (value: unknown): readonly Row[] =>
	Array.isArray(value) ? value.filter(isRow) : [];

export const listOf = (value: unknown): readonly string[] =>
	Array.isArray(value)
		? value.filter((item): item is string => typeof item === "string")
		: [];

export const countOf = (value: unknown): number =>
	typeof value === "number" && Number.isFinite(value) && value > 0
		? Math.floor(value)
		: 0;

export const blankRow = (id: string): Row => ({
	id,
	view: null,
	tag: BORROWED.DEFAULT_TAG,
	offeredTurn: "",
	askedTurn: "",
});

export const rowOf = (rows: readonly Row[], id: string): Row =>
	rows.find((row) => row.id === id) ?? blankRow(id);

/** Lower is evicted first: a closed row, then an open one past its keep time, then a fresh open one. */
const rankOf = (row: Row, now: number): number => {
	if (row.view === null) {
		return 0;
	}
	return now - row.view.shownAt > BORROWED.SHOWN_KEEP_MS ? 1 : 2;
};

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
