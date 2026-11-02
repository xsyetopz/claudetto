// Both tables are read by people deciding what to trim next, and both drifted from the files twice
// without a check, so each figure is held against the length it names.

import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { TOOL_TEXTS } from "../../plugins/claudetto/src/blocks/tool-describe/texts.ts";
import {
	shippedPlacementOf,
	stockOf,
	UPFRONT,
} from "../../plugins/claudetto/src/blocks/tool-describe/tools.ts";

const FOOTPRINT = "docs/prompt/footprint.md";
const SURFACES = "docs/surfaces.md";
const PROMPT_FILES: Readonly<Record<string, string>> = {
	"agents/main.md": "plugins/claudetto/agents/main.md",
	"output-styles/Concise.md": "plugins/claudetto/output-styles/Concise.md",
};

const FRONTMATTER = /^---\n[\s\S]*?\n---\n/;

const number = (cell: string): number => Number(cell.replaceAll(",", ""));

const unquote = (cell: string): string => cell.replace(/^`<?|>?`$/g, "");

/** The rows of the first table after `heading` whose header row starts with `firstHeader`. */
const tableAfter = (
	doc: string,
	heading: string,
	firstHeader: string,
): string[][] => {
	const from = doc.indexOf(heading);
	if (from === -1) {
		throw new Error(`no ${heading}`);
	}
	const lines = doc.slice(from).split("\n");
	const start = lines.findIndex((l) => l.startsWith(`| ${firstHeader} |`));
	const rows: string[][] = [];
	for (const line of lines.slice(start + 2)) {
		if (!line.startsWith("|")) {
			break;
		}
		rows.push(
			line
				.slice(1, -1)
				.split(" | ")
				.map((c) => c.trim()),
		);
	}
	return rows;
};

const sectionLengths = async (path: string): Promise<Map<string, number>> => {
	const body = (await readFile(path, "utf8")).replace(FRONTMATTER, "").trim();
	return new Map(
		[...body.matchAll(/<(\w+)>[\s\S]*?<\/\1>/g)].map((m) => [
			m[1] ?? "",
			m[0].length,
		]),
	);
};

const footprintRows = async () =>
	tableAfter(
		await readFile(FOOTPRINT, "utf8"),
		"### The Always-Loaded Pieces",
		"Piece",
	);

const allSectionLengths = async () =>
	new Map(
		await Promise.all(
			Object.entries(PROMPT_FILES).map(
				async ([where, file]) => [where, await sectionLengths(file)] as const,
			),
		),
	);

describe(`the always-loaded table of ${FOOTPRINT}`, () => {
	test("gives each section its length in the prompt file", async () => {
		const wrong: string[] = [];
		const lengths = await allSectionLengths();
		for (const [piece, where, chars] of await footprintRows()) {
			const sections = lengths.get(where ?? "");
			if (sections === undefined) {
				continue;
			}
			const actual = sections.get(unquote(piece ?? ""));
			if (actual !== number(chars ?? "")) {
				wrong.push(`${piece} in ${where}: ${chars} against ${actual}`);
			}
		}

		expect(wrong).toEqual([]);
	});

	test("gives each tool text its length", async () => {
		const wrong: string[] = [];
		for (const [piece, where, chars] of await footprintRows()) {
			if (!where?.startsWith("tool text")) {
				continue;
			}
			const actual = TOOL_TEXTS[unquote(piece ?? "")]?.length;
			if (actual !== number(chars ?? "")) {
				wrong.push(`${piece}: ${chars} against ${actual}`);
			}
		}

		expect(wrong).toEqual([]);
	});

	test("has a row for each section and each tool text that ships", async () => {
		const rows = new Set(
			(await footprintRows()).map(([piece]) => unquote(piece ?? "")),
		);
		const shipped = [...Object.keys(TOOL_TEXTS)];
		const lengths = await allSectionLengths();
		for (const sections of lengths.values()) {
			shipped.push(...sections.keys());
		}

		expect(shipped.filter((name) => !rows.has(name))).toEqual([]);
	});
});

const surfacesRows = async () =>
	tableAfter(
		await readFile(SURFACES, "utf8"),
		"| Tool | Stock, smaller",
		"Tool",
	);

describe(`the tool-text table of ${SURFACES}`, () => {
	test("gives each upfront tool its stock, its text, and the saving", async () => {
		const wrong: string[] = [];
		for (const [tool, stock, ours, saved] of await surfacesRows()) {
			if (tool === "total") {
				continue;
			}
			const name = unquote(tool ?? "");
			const want = [stockOf(name), TOOL_TEXTS[name]?.length];
			const stockChars = number(stock ?? "");
			const ourChars = number(ours ?? "");
			if (
				want[0] !== stockChars ||
				want[1] !== ourChars ||
				number(saved ?? "") !== stockChars - ourChars
			) {
				wrong.push(`${tool}: ${stock}, ${ours}, ${saved}`);
			}
		}

		expect(wrong).toEqual([]);
	});

	test("lists the upfront tools with a text, and totals them", async () => {
		const rows = await surfacesRows();
		const upfront = Object.keys(TOOL_TEXTS).filter(
			(name) => shippedPlacementOf(name) === UPFRONT,
		);
		const listed = rows
			.filter(([tool]) => tool !== "total")
			.map(([tool]) => unquote(tool ?? ""));
		const total = rows.find(([tool]) => tool === "total") ?? [];
		const sum = (column: number) => {
			let s = 0;
			for (const row of rows.filter(([tool]) => tool !== "total")) {
				s += number(row[column] ?? "");
			}
			return s;
		};
		const byName = (a: string, b: string) => a.localeCompare(b);

		expect(listed.sort(byName)).toEqual(upfront.sort(byName));
		expect(total.slice(1).map(number)).toEqual([sum(1), sum(2), sum(3)]);
	});
});
