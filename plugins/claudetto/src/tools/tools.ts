// Two readings per tool, because a stock description is not one fixed number. `docs` is the
// `clawdipedia` route `prompts/tools` for Claude Code `2.1.312`. `capture` is this repository's own
// `just capture` reading of 2026-10-28, taken in an empty non-git folder. The two agree on 17 of
// the 20 tools and differ on `Agent`, `Bash`, and `ScheduleWakeup`, each of which has a
// session-dependent part, so the check holds the smaller of the two and `describe` compares against
// the description the harness computed for that very session.

import { TOOL_TEXTS } from "./texts.ts";

/** The harness sends the tool's whole definition in every request. */
export const UPFRONT = "upfront";

/** The harness lists the tool by name only, and `ToolSearch` loads its schema on demand. */
export const DEFERRED = "deferred";

/** How the harness loads a tool: its whole definition in every request, or its name only. */
export type Placement = typeof UPFRONT | typeof DEFERRED;

/** The size of a tool's stock description from the two sources, in characters. */
export interface StockReading {
	readonly name: string;
	/** Where the harness puts the tool by default, read from the capture. */
	readonly placement: Placement;
	/** The description characters of the docs page, or none when the page omits the tool. */
	readonly docs?: number;
	/** The description characters of our own capture. */
	readonly capture: number;
}

/** Every tool the capture saw, with the characters of its stock description. */
export const STOCK: readonly StockReading[] = [
	{ name: "Agent", placement: UPFRONT, docs: 3227, capture: 2906 },
	{ name: "Bash", placement: UPFRONT, docs: 1934, capture: 1267 },
	{
		name: "DeferredToolPlaceholder",
		placement: UPFRONT,
		docs: 83,
		capture: 83,
	},
	{ name: "Edit", placement: UPFRONT, docs: 360, capture: 360 },
	{ name: "ListAgents", placement: UPFRONT, docs: 777, capture: 777 },
	{ name: "Read", placement: UPFRONT, docs: 790, capture: 790 },
	{ name: "ReportFindings", placement: UPFRONT, docs: 574, capture: 574 },
	{ name: "ScheduleWakeup", placement: UPFRONT, docs: 3396, capture: 3148 },
	{ name: "Skill", placement: UPFRONT, docs: 1417, capture: 1417 },
	{ name: "ToolSearch", placement: UPFRONT, docs: 953, capture: 953 },
	{ name: "Workflow", placement: UPFRONT, docs: 3480, capture: 3480 },
	{ name: "Write", placement: UPFRONT, docs: 240, capture: 240 },
	{ name: "DesignSync", placement: DEFERRED, capture: 4005 },
	{ name: "EnterWorktree", placement: DEFERRED, docs: 3220, capture: 3220 },
	{ name: "ExitWorktree", placement: DEFERRED, docs: 1923, capture: 1923 },
	{ name: "Monitor", placement: DEFERRED, docs: 6354, capture: 6354 },
	{ name: "NotebookEdit", placement: DEFERRED, docs: 619, capture: 619 },
	{ name: "SendMessage", placement: DEFERRED, docs: 4259, capture: 4259 },
	{ name: "TaskStop", placement: DEFERRED, docs: 364, capture: 364 },
	{ name: "WebFetch", placement: DEFERRED, docs: 469, capture: 469 },
	{ name: "WebSearch", placement: DEFERRED, docs: 334, capture: 334 },
];

const readingOf = (name: string): StockReading | undefined =>
	STOCK.find((entry) => entry.name === name);

/**
 * The stock description characters a text of ours has to beat: the smaller of the two readings, so
 * that a text that passes the check is shorter in either session.
 */
export const stockOf = (name: string): number | undefined => {
	const entry = readingOf(name);
	if (entry === undefined) {
		return undefined;
	}
	return entry.docs === undefined
		? entry.capture
		: Math.min(entry.docs, entry.capture);
};

/** Where the harness puts `name` by default, or none when the capture never saw the tool. */
export const placementOf = (name: string): Placement | undefined =>
	readingOf(name)?.placement;

/** The tools claudetto writes a description for. */
export const describedTools = (): readonly string[] => Object.keys(TOOL_TEXTS);

/**
 * Our description for `tool`, but only while it is shorter than `description`, which is what the
 * harness computed for this session. Otherwise none, and the harness's own text stays.
 */
export const shorterText = (
	tool: string,
	description: string,
): string | undefined => {
	const ours = TOOL_TEXTS[tool];
	return ours !== undefined && ours.length < description.length
		? ours
		: undefined;
};

/**
 * The characters of our tool texts that every request carries. A text for a tool the harness defers
 * is not in it: that request holds the tool's name alone until `ToolSearch` loads the schema, so
 * counting such a text would overstate the always-loaded total.
 */
export const alwaysLoadedChars = (
	texts: Readonly<Record<string, string>> = TOOL_TEXTS,
	placement: (name: string) => Placement | undefined = placementOf,
): number => {
	let total = 0;
	for (const [name, text] of Object.entries(texts)) {
		if (placement(name) === UPFRONT) {
			total += text.length;
		}
	}
	return total;
};

/**
 * The texts that are not shorter than the stock reading they have to beat. Such a text is dead
 * weight: `describe` would keep the harness's own description, and the repository would hold a string
 * no session reads. An empty list is a set of texts that may ship.
 */
export const deadTexts = (
	texts: Readonly<Record<string, string>> = TOOL_TEXTS,
): readonly string[] =>
	Object.keys(texts).filter((name) => {
		const stock = stockOf(name);
		const ours = texts[name];
		return stock === undefined || ours === undefined || ours.length >= stock;
	});
