import { describe, expect, test } from "bun:test";
import {
	type Piece,
	parsePieces,
	pieceFaults,
	readPieces,
	sectionSizes,
} from "../always-loaded.ts";

const page = (rows: string): string =>
	`### The Always-Loaded Pieces\n\nSome prose.\n\n| Piece | Where | Characters | Behavior changed | Check |\n| --- | --- | --- | --- | --- |\n${rows}\n\nMore prose.\n`;

const row = (over: Partial<Piece> = {}): Piece => ({
	piece: "<role>",
	where: "agents/main.md",
	chars: 196,
	behavior: "does a thing",
	check: "a test",
	...over,
});

const line = (piece: Piece): string =>
	`| \`${piece.piece}\` | \`${piece.where}\` | ${piece.chars} | ${piece.behavior} | ${piece.check} |`;

describe("every always-loaded piece has a row that matches it", () => {
	test("the shipped table has no fault", async () => {
		expect(await pieceFaults(await readPieces())).toEqual([]);
	});

	test("the table covers each section of both prompt files and each tool text", async () => {
		const pieces = await readPieces();

		const main = pieces.filter((p) => p.where === "agents/main.md");
		const sizes = await sectionSizes("agents/main.md");

		const byName = (a: string, b: string): number => a.localeCompare(b);

		expect(main.map((p) => p.piece).sort(byName)).toEqual(
			[...sizes.keys()].sort(byName),
		);
	});
});

describe("the check names each fault of a row", () => {
	test("a figure that disagrees with the file", async () => {
		const pieces = parsePieces(page(line(row({ chars: 1 }))));

		const faults = await pieceFaults(pieces);

		expect(faults).toContain("<role> is 196 characters and the table says 1");
	});

	test("a row whose behavior and check are both none", async () => {
		const pieces = parsePieces(
			page(line(row({ behavior: "none", check: "none" }))),
		);

		const faults = await pieceFaults(pieces);

		expect(faults).toContain(
			"<role> names no behavior and no check, so it is kept on no ground",
		);
	});

	test("a row for a section that does not ship", async () => {
		const pieces = parsePieces(page(line(row({ piece: "<nosuch>" }))));

		const faults = await pieceFaults(pieces);

		expect(faults).toContain(
			"<nosuch> has a row and does not ship in agents/main.md",
		);
	});

	test("a row whose piece is not a section tag of its file", async () => {
		const pieces = parsePieces(page(line(row({ piece: "role" }))));

		const faults = await pieceFaults(pieces);

		expect(faults).toContain(
			"role is a row of agents/main.md and is not a section tag",
		);
	});

	test("a piece that ships with no row at all", async () => {
		const faults = await pieceFaults([]);

		expect(faults).toContain(
			"agents/main.md <role> ships and has no row, so nothing justifies it",
		);
		expect(faults).toContain(
			"tool text Read ships and has no row, so nothing justifies it",
		);
	});

	test("an empty cell", async () => {
		const pieces = parsePieces(page(line(row({ check: "" }))));

		const faults = await pieceFaults(pieces);

		expect(faults).toContain(
			"<role> has an empty cell, so the table says nothing about it",
		);
	});
});
