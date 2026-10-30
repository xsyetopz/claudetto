// `docs` and `capture` differ on `Agent`, `Bash`, and `ScheduleWakeup`, so the check holds the smaller.

import { TOOL_TEXTS } from "./texts.ts";

export const UPFRONT = "upfront";

export const DEFERRED = "deferred";

export type Placement = typeof UPFRONT | typeof DEFERRED;

export interface StockReading {
	readonly name: string;
	readonly placement: Placement;
	readonly docs?: number;
	readonly capture: number;
}

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

/** The smaller of the two readings, so a text that passes is shorter in either session. */
export const stockOf = (name: string): number | undefined => {
	const entry = readingOf(name);
	if (entry === undefined) {
		return undefined;
	}
	return entry.docs === undefined
		? entry.capture
		: Math.min(entry.docs, entry.capture);
};

export const placementOf = (name: string): Placement | undefined =>
	readingOf(name)?.placement;

export const describedTools = (): readonly string[] => Object.keys(TOOL_TEXTS);

/** Only while shorter than `description`, the harness's text for this session; else none. */
export const shorterText = (
	tool: string,
	description: string,
): string | undefined => {
	const ours = TOOL_TEXTS[tool];
	return ours !== undefined && ours.length < description.length
		? ours
		: undefined;
};

/** Excludes deferred tools: their request holds the name alone until `ToolSearch` loads the schema. */
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

/** Dead weight: `describe` keeps the harness's own description for a text that is not shorter. */
export const deadTexts = (
	texts: Readonly<Record<string, string>> = TOOL_TEXTS,
): readonly string[] =>
	Object.keys(texts).filter((name) => {
		const stock = stockOf(name);
		const ours = texts[name];
		return stock === undefined || ours === undefined || ours.length >= stock;
	});
