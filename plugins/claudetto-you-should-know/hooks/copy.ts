/** The "What is this" copy: spans, the note's rendering, and how much of it fits. */

import {
	CARD_WIDTH,
	OFFER_LABELS,
	OFFER_MARGIN_ROWS,
	OFF_COMMAND,
	STAR_CELLS,
} from "./constants";
import { type Look, type Table } from "./table";
import { choicesRows, wrapRows } from "./text";

export type Span = { readonly text: string; readonly look?: "bold" | "code" };
export type Copy = readonly (readonly Span[])[];

export type Choice = {
	readonly hotkey: string;
	readonly label: string;
	readonly onPress: (() => void) | undefined;
	readonly isDim?: boolean;
	readonly role?: string;
};

export type Budget =
	| "scrolls"
	| { readonly maxRows: number; readonly bodyColumns: number };

export type About = {
	readonly isOpen: boolean;
	readonly surface: string;
	readonly onPress: () => void;
	readonly copy: Copy;
	readonly budget: Budget;
};

const SPAN_LOOKS: Readonly<Record<"bold" | "code", Look & { bold?: boolean }>> = {
	bold: { bold: true },
	code: { color: "permission" },
};

export const LEARN: readonly Span[] = [
	{ text: "Learn more", look: "bold" },
	{ text: " to get a deeper explanation and chat about it." },
];
export const PLUGIN_OFF: readonly Span[] = [
	{ text: "Disable on this machine with " },
	{ text: OFF_COMMAND, look: "code" },
	{ text: "." },
];
export const WATCHING: readonly Span[] = [
	{ text: "A side agent is watching your back while Claude works." },
];
export const WHEN: readonly Span[] = [
	{
		text: "When something comes up that you should know but might miss, this plugin flags it for you.",
	},
];
export const APP_COPY: Copy = [WATCHING, WHEN, LEARN];
export const TERMINAL_COPY: Copy = [WATCHING, WHEN, LEARN, PLUGIN_OFF];

export const plainText = (copy: Copy): string =>
	copy.map((para) => para.map((span) => span.text).join("")).join(" ");
export const ABOUT_THIS = plainText(TERMINAL_COPY);

export const ABOUT_CLOSED: About = {
	isOpen: false,
	surface: "terminal",
	onPress: () => {},
	copy: TERMINAL_COPY,
	budget: "scrolls",
};

export function noteSpans(table: Table, copy: Copy, base: Look): unknown[] {
	const { Text } = table;
	return copy
		.flatMap((para, index) => (index === 0 ? para : [{ text: " " }, ...para]))
		.map(({ text, look }: Span) =>
			h(Text as never, { ...(look === undefined ? base : SPAN_LOOKS[look]) }, text),
		) as unknown[];
}

export function aboutCard(table: Table, copy: Copy): unknown {
	const { Box, Text } = table;
	return h(
		Box as never,
		{
			position: "absolute",
			bottom: 1,
			left: 0,
			display: "none",
			hover: { display: "flex" },
			flexDirection: "column",
			borderStyle: "round",
			borderDimColor: true,
			paddingX: 1,
			width: CARD_WIDTH,
		},
		h(Text as never, { wrap: "wrap" }, noteSpans(table, copy, {})),
	);
}

export const aboutChoice = (about: {
	readonly isOpen: boolean;
	readonly onPress: () => void;
}): Choice => ({
	hotkey: "3",
	label: about.isOpen ? "Return to topic" : OFFER_LABELS.about,
	onPress: about.onPress,
	isDim: true,
});

type Sizing = {
	readonly columns: number;
	readonly labels: readonly string[];
};

export const headedRows = (text: string, sizing: Sizing): number =>
	OFFER_MARGIN_ROWS +
	wrapRows(text, sizing.columns - STAR_CELLS) +
	choicesRows({ ...sizing, columns: sizing.columns - 2 });

export const taggedLeadText = (tag: string): string => `${tag} · `;

export const closedOfferRows = (args: {
	readonly tag: string;
	readonly line: string;
	readonly columns: number;
	readonly labels: readonly string[];
}): number => headedRows(taggedLeadText(args.tag) + args.line, args);

export const offerRows = (args: {
	readonly note: string;
	readonly columns: number;
	readonly labels: readonly string[];
}): number => headedRows(args.note, args);

export function fittedCopy(args: {
	readonly copy: Copy;
	readonly maxRows: number;
	readonly bodyColumns: number;
	readonly labels: readonly string[];
}): Copy {
	const fits = (count: number): boolean =>
		offerRows({
			columns: args.bodyColumns,
			labels: args.labels,
			note: plainText(args.copy.slice(0, count)),
		}) <= args.maxRows;
	return args.copy.slice(
		0,
		args.copy.map((_, index) => args.copy.length - index).find(fits) ?? 0,
	);
}

/** The note and the "What is this" choice that fit the budget, each empty when none does. */
export function aboutFit(
	about: About,
	row: {
		readonly tag: string;
		readonly line: string;
		readonly before: readonly Choice[];
		readonly after: readonly Choice[];
	},
): { readonly note: Copy; readonly choices: readonly Choice[] } {
	const closed = aboutChoice(about);
	const open = aboutChoice({ ...about, isOpen: true });
	const { budget } = about;
	const scrolls = budget === "scrolls";
	const copy = scrolls
		? about.copy
		: fittedCopy({
				...budget,
				copy: about.copy,
				labels: [...row.before, open, ...row.after].map((c) => c.label),
			});
	const closedRow = aboutChoice({ ...about, isOpen: false });
	const closedFits =
		scrolls ||
		closedOfferRows({
			columns: budget.bodyColumns,
			tag: row.tag,
			line: row.line,
			labels: [...row.before, closedRow, ...row.after].map((c) => c.label),
		}) <= budget.maxRows;
	const fits = copy.length > 0 && closedFits;
	return {
		note: about.isOpen && fits ? copy : [],
		choices: fits ? [closed] : [],
	};
}

export const aboutFrame = (
	isApp: boolean,
	view: { readonly maxRows: number; readonly bodyColumns: number },
	isOptIn: boolean,
): { readonly copy: Copy; readonly budget: Budget } => {
	const full = isApp ? APP_COPY : TERMINAL_COPY;
	return {
		copy: isOptIn ? [] : full,
		budget: isApp
			? "scrolls"
			: { maxRows: view.maxRows, bodyColumns: view.bodyColumns },
	};
};

export const aboutKeyOf = (view: {
	readonly line: string;
	readonly shownAt?: number | undefined;
}): string => `${view.shownAt ?? "unstamped"} ${view.line}`;
