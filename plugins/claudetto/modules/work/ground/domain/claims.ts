// The source check of `ground`: the claims of a new text that no source backs (a user message, a tool result, or a file of the project).
// The kinds are numbers and `file:line` references. The check reads no English word, because a word rule is brittle (the user, 2026-10-27).
// A line with `(proposed)` or `[NEEDS CLARIFICATION: ...]`, and a fenced code block, pass.
// The checks run in a program with no model call, because a check that guesses blocks correct text.

import { lineCount } from "../../../../kernel/text.ts";

/** One message of the session, as the check reads it. `answers` are the answers of its `AskUserQuestion` calls, and each counts as a user message. */
export interface Msg {
	role: "user" | "assistant";
	text: string;
	results: readonly string[];
	answers?: readonly string[];
}

/** The content of each file that `neededFiles` names, or `null` when the file is absent. */
export type Files = Readonly<Record<string, string | null>>;

const REF =
	/(?<![\w/.-])((?:[\w.-]+\/)*[\w.-]+\.(?:tsx?|jsx?|mjs|py|md|json|rs|go|sh|toml|ya?ml|java|c|h|cpp)):(\d+)(?:-(\d+))?/g;
const NUMBER = /(?<![\w.,:/#$-])(\d{1,3}(?:,\d{3})+|\d{3,})(?![\w:/-]|[.,]\d)/g;
/** A number that is part of the name of a standard, such as `ISO 8601` or `RFC 3339`. It names a document and is no claim. */
const STANDARD =
	/\b(?:ISO|IEC|RFC|BCP|STD|PEP|IEEE|ANSI|ECMA|DIN)[ -]?\d[\d.:]*/g;
const SIZE = /(\d+(?:\.\d+)?)\s*(KiB|MiB|GiB|TiB)\b/g;
const CELL = /^\s*([+\-−]?)(\d{1,3}(?:,\d{3})+|\d+)\b/;
const YEAR = /^(?:19|20)\d\d$/;
const MARK = /\(proposed\)|\[NEEDS CLARIFICATION/i;
/** The files of the project that `findUnsourced` reads from the root: the rules. */
export const PROJECT_FILES: readonly string[] = ["CLAUDE.md", "AGENTS.md"];

/** The folder of the rule files that the adapter adds to `Files` by their project path. */
export const RULES_DIR = ".claude/rules";

/** True for a file that holds rules of the user: `CLAUDE.md` imports `AGENTS.md`, and the rest is in `.claude/rules/`. */
const isRuleFile = (name: string): boolean =>
	name === "CLAUDE.md" ||
	name === "AGENTS.md" ||
	name.startsWith(`${RULES_DIR}/`);

/** The files that `text` references with `file:line`. A reference is not always relative to the root. */
export const refFiles = (text: string): string[] => [
	...new Set([...text.matchAll(REF)].flatMap((m) => m[1] ?? [])),
];

const proseLines = (text: string): string[] =>
	text
		.replace(/```[\s\S]*?```/g, "")
		.split("\n")
		.filter((line) => !MARK.test(line));

const sum = (numbers: readonly number[]): number => {
	let total = 0;
	for (const n of numbers) {
		total += n;
	}
	return total;
};

/** The numbers that a table computes: a cell that is the sum of the cells above it (three rows or more), or the absolute difference of two other cells of its row. */
const columnTotals = (lines: readonly string[]): Set<number> => {
	const totals = new Set<number>();
	let rows: (number | null)[][] = [];
	for (const line of lines) {
		if (!line.trimStart().startsWith("|")) {
			rows = [];
			continue;
		}
		const cells = line
			.trim()
			.slice(1)
			.split("|")
			.map((c) => {
				const m = CELL.exec(c);
				if (!m) {
					return null;
				}
				const v = Number((m[2] ?? "").replace(/,/g, ""));
				return m[1] === "-" || m[1] === "\u2212" ? -v : v;
			});
		for (const [i, v] of cells.entries()) {
			if (v === null) {
				continue;
			}
			const above = rows.map((r) => r[i] ?? null).filter((x) => x !== null);
			const others = cells.filter((x, j): x is number => j !== i && x !== null);
			if (
				(above.length >= 3 && sum(above) === v) ||
				others.some((a) =>
					others.some((b) => a !== b && Math.abs(a - b) === Math.abs(v)),
				)
			) {
				totals.add(Math.abs(v));
			}
		}
		rows.push(cells);
	}
	return totals;
};

/** What the check of one text reads: the sources, and the facts of the text itself. */
interface Ctx {
	corpus: string;
	files: Files;
	totals: Set<number>;
}

/** True when `n` is in the sources as a number of its own. */
const has = (x: Ctx, n: string): boolean =>
	new RegExp(`(?<!\\d)${n}(?!\\d)`).test(x.corpus);

/** True when the text computes `n`: a binary size on `line`. */
const derived = (n: number, line: string): boolean =>
	[...line.matchAll(SIZE)].some(
		([, k = "", unit = ""]) =>
			Number(k) * 1024 ** ("KMGT".indexOf(unit.charAt(0)) + 1) === n,
	);

const numberClaims = (x: Ctx, line: string): string[] => {
	const out: string[] = [];
	for (const [, num = ""] of line.replace(STANDARD, "").matchAll(NUMBER)) {
		const n = num.replace(/,/g, "");
		if (YEAR.test(n)) {
			continue;
		}
		if (!has(x, n) && !x.totals.has(Number(n)) && !derived(Number(n), line)) {
			out.push(`\`${num}\` is in no user message and no tool result.`);
		}
	}
	return out;
};

/** The claims of the `file:line` references of `line` that go past the end of the file. */
const refClaims = (x: Ctx, line: string): string[] => {
	const out: string[] = [];
	for (const [ref = "", file = "", from = "", to = from] of line.matchAll(
		REF,
	)) {
		const body = x.files[file];
		if (body != null && Number(to) > lineCount(body)) {
			out.push(`\`${ref}\`: the file has ${lineCount(body)} lines.`);
		}
	}
	return out;
};

/** The claims of `text` with no source in `msgs`, in `files`, or in `own`, the old text of the target file. A `null` file did not resolve, and the check skips it, because a guess would deny a correct reference. */
export const findUnsourced = (
	text: string,
	msgs: readonly Msg[],
	files: Files,
	own = "",
): string[] => {
	const user = msgs
		.flatMap((m) => [
			...(m.role === "user" ? [m.text] : []),
			...(m.answers ?? []),
		])
		.join("\n");
	const rules = Object.entries(files)
		.filter(([n]) => isRuleFile(n))
		.map(([, t]) => t ?? "")
		.join("\n");
	const corpus = [user, ...msgs.flatMap((m) => m.results), rules, own]
		.join("\n")
		.replace(/(?<=\d)[,_](?=\d{3})/g, "");
	const prose = proseLines(text);
	// A number that the text computes: a table total or difference, or a binary size.
	const x: Ctx = { corpus, files, totals: columnTotals(prose) };
	return [
		...new Set(
			prose.flatMap((line) => [
				...numberClaims(x, line),
				...refClaims(x, line),
			]),
		),
	];
};
