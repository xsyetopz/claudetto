// The synthetic sessions of the handoff probe: a seeded `SessionMessage[]` with one planted item for each kind and depth, and filler turns between them.
// Each token is an exact code word, a path, a task id, or an option label, so a grader matches it exactly and reads no English.

import type { SessionMessage, ToolUseSummary } from "claude-code";
import { seededRandom } from "../stats/math.ts";

export const KINDS = [
	"recall",
	"artifact",
	"continuation",
	"decision",
	"constraint",
] as const;
export const DEPTHS = ["early", "middle", "late"] as const;
export type Kind = (typeof KINDS)[number];
export type Depth = (typeof DEPTHS)[number];

/** A planted item. `tokens` must all be in the body of `section` of the handoff for the item to survive. */
export interface Item {
	readonly kind: Kind;
	readonly depth: Depth;
	readonly size: number;
	readonly seed: number;
	readonly section: string;
	readonly tokens: readonly string[];
	/** For a continuation item: the handoff is built from the first `upTo` messages and the `tasks` text of that point, because the next task belongs to the end of the session. */
	readonly upTo?: number;
	readonly tasks?: string;
}

export interface Session {
	readonly messages: SessionMessage[];
	readonly tasks: string;
	readonly items: Item[];
}

/** The section where an item of each kind must be (the `SECTIONS` of `handover.ts`). */
export const SECTION_OF: Record<Kind, string> = {
	recall: "## Constraints and Pins",
	artifact: "## Files",
	continuation: "## Next Step",
	decision: "## Decisions",
	constraint: "## Constraints and Pins",
};

/** One filler user turn in this many states a value in backticks, and one in this many states a rule. */
const FILLER_VALUE_EVERY = 10;
const FILLER_RULE_EVERY = 12;
/** One filler assistant turn in this many reads a file, one in this many edits a file, and one in this many asks a question. */
const FILLER_READ_EVERY = 2;
const FILLER_EDIT_EVERY = 8;
const FILLER_ASK_EVERY = 50;

// Plain requests: none holds a rule word, a backtick, or a sentence that starts with a rule word.
const CHATTER: [string, ...string[]] = [
	"Looks good, go on with the next part.",
	"Run the build again and show me the result.",
	"What does this function return?",
	"Rename the helper and update its callers.",
	"Add a test for the empty case.",
	"Show me the diff of that change.",
];

type Rng = () => number;

const tokenOf = (rng: Rng, prefix: string, n: number): string =>
	`${prefix}${n.toString(36)}-${Math.floor(rng() * 0xff_ff_ff)
		.toString(16)
		.padStart(6, "0")}`;

const user = (text: string): SessionMessage => ({
	role: "user",
	text,
	toolUses: [],
});

const assistant = (
	text: string,
	toolUses: ToolUseSummary[] = [],
): SessionMessage => ({ role: "assistant", text, toolUses });

let useId = 0;
const useOf = (
	tool: string,
	input: Record<string, unknown>,
	text?: string,
): ToolUseSummary => ({
	tool_use_id: `u${++useId}`,
	tool,
	input,
	...(text === undefined ? {} : { text }),
});

const askOf = (
	question: string,
	labels: readonly string[],
	chosen: string,
): ToolUseSummary =>
	useOf(
		"AskUserQuestion",
		{ questions: [{ question, options: labels.map((label) => ({ label })) }] },
		`User has answered your questions: "${question}"="${chosen}". You can now continue.`,
	);

const pick = <T>(rng: Rng, items: readonly [T, ...T[]]): T =>
	items[Math.floor(rng() * items.length)] ?? items[0];

/** Where a planted turn of each depth starts: the five kinds take the five turns from there. */
const baseOf = (depth: Depth, size: number): number =>
	({ early: 1, middle: Math.floor(size / 2) - 2, late: size - 6 })[depth];

interface Turn {
	user: SessionMessage;
	assistant: SessionMessage;
}

const fillerTurn = (rng: Rng, n: number): Turn => {
	const said = [pick(rng, CHATTER)];
	if (n % FILLER_VALUE_EVERY === 0) {
		said.push(`The scratch value is \`${tokenOf(rng, "f", n)}\`.`);
	}
	if (n % FILLER_RULE_EVERY === 0) {
		said.push(`Do not edit src/old-${tokenOf(rng, "f", n)}.ts.`);
	}
	const uses =
		n % FILLER_READ_EVERY === 0
			? [useOf("Read", { file_path: `src/${tokenOf(rng, "f", n)}.ts` }, "ok")]
			: [];
	if (n % FILLER_EDIT_EVERY === 0) {
		uses.push(
			useOf("Edit", { file_path: `src/${tokenOf(rng, "f", n)}.ts` }, "ok"),
		);
	}
	if (n % FILLER_ASK_EVERY === 0) {
		const labels = [tokenOf(rng, "f", n), tokenOf(rng, "f", n + 1)];
		uses.push(askOf(`Filler ${n}?`, labels, labels[0] ?? ""));
	}
	return { user: user(said.join(" ")), assistant: assistant("Done.", uses) };
};

interface Plant {
	readonly item: Item;
	readonly apply: (turn: Turn) => void;
}

const plantOf = (
	rng: Rng,
	kind: Kind,
	depth: Depth,
	where: { size: number; seed: number },
	n: number,
): Plant => {
	const make = (tokens: string[]): Item => ({
		kind,
		depth,
		...where,
		section: SECTION_OF[kind],
		tokens,
	});
	if (kind === "recall") {
		const value = tokenOf(rng, "r", n);
		return {
			item: make([`\`${value}\``]),
			apply: (turn) => {
				turn.user = user(`The staging value is \`${value}\`.`);
			},
		};
	}
	if (kind === "constraint") {
		const word = tokenOf(rng, "c", n);
		return {
			item: make([word]),
			apply: (turn) => {
				turn.user = user(`Never use ${word} in this repo.`);
			},
		};
	}
	if (kind === "artifact") {
		const path = `src/${tokenOf(rng, "a", n)}.ts`;
		const tool = where.seed % 2 === 0 ? "Edit" : "Read";
		return {
			item: make([`\`${path}\``]),
			apply: (turn) => {
				turn.assistant = assistant("Done.", [
					useOf(tool, { file_path: path }, "ok"),
				]);
			},
		};
	}
	if (kind === "decision") {
		const labels: [string, string, string] = [
			tokenOf(rng, "d", n),
			tokenOf(rng, "d", n + 1),
			tokenOf(rng, "d", n + 2),
		];
		const chosen = pick(rng, labels);
		return {
			item: make(labels.map((label) => `\`${label}\``)),
			apply: (turn) => {
				turn.assistant = assistant("", [
					askOf(`Which option ${n}?`, labels, chosen),
				]);
			},
		};
	}
	return { item: make([]), apply: () => undefined };
};

/** Plants the finished task and the open next task in `turn`, with the `tasks.md` text of that point. */
const continuationOf = (rng: Rng, turn: Turn) => {
	const group = 10 + Math.floor(rng() * 80);
	turn.user = user(`Task ${group}.1 is done.`);
	turn.assistant = assistant("Done.", [
		useOf(
			"Edit",
			{ file_path: "openspec/changes/probe-change/tasks.md" },
			"ok",
		),
	]);
	const tasks = [
		"- [x] 1.1 Earlier work",
		`- [x] ${group}.1 Planted work`,
		`- [ ] ${group}.2 Planted next task`,
		`- [ ] ${group}.3 Later task`,
		"",
	].join("\n");
	return { next: `${group}.2`, tasks };
};

/** A session of `size` turns from `seed`, with the 15 items planted, and the `tasks.md` text that the open change holds at its end. */
export const sessionOf = (seed: number, size: number): Session => {
	useId = 0;
	const rng = seededRandom(seed * 7919 + size);
	const turns = Array.from({ length: size }, (_, n) => fillerTurn(rng, n));
	const items: Item[] = [];
	for (const depth of DEPTHS) {
		for (const [k, kind] of KINDS.entries()) {
			const at = baseOf(depth, size) + k;
			const turn = turns[at];
			if (turn === undefined) {
				continue;
			}
			if (kind === "continuation") {
				const planted = continuationOf(rng, turn);
				items.push({
					kind,
					depth,
					size,
					seed,
					section: SECTION_OF[kind],
					tokens: [`\`${planted.next}\``],
					upTo: 2 * (at + 1),
					tasks: planted.tasks,
				});
				continue;
			}
			const plant = plantOf(rng, kind, depth, { size, seed }, size * 10 + k);
			plant.apply(turn);
			items.push(plant.item);
		}
	}
	return {
		messages: turns.flatMap((t) => [t.user, t.assistant]),
		tasks: items.findLast((i) => i.tasks !== undefined)?.tasks ?? "",
		items,
	};
};
