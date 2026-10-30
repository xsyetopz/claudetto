import { file as bunFile } from "bun";
import { TOOL_TEXTS } from "../plugins/claudetto/src/tools/texts.ts";
import { bare, tableRows } from "./md-table.ts";

/** The page whose table of always-loaded pieces `parsePieces` reads, relative to the repository root. */
export const PIECE_PAGE = "docs/prompt/footprint.md";
/** The heading above the table on `PIECE_PAGE`, which `tableRows` uses to find it. */
export const PIECE_HEADING = "### The Always-Loaded Pieces";

/** The `Where` value of a piece that is one tool description claudetto offers. */
export const TOOL_TEXT = "tool text";

/** The prompt files whose sections are pieces, each named by its `Where` value. */
export const PROMPT_FILES: readonly string[] = [
	"agents/main.md",
	"output-styles/Concise.md",
];

/** One row of the always-loaded table: what the piece is, where it lives, its size in characters, and the behavior and check the page records for it. */
export interface Piece {
	/** The section tag, such as `<role>`, or the tool name. */
	readonly piece: string;
	/** A path of `PROMPT_FILES`, or `TOOL_TEXT`. */
	readonly where: string;
	readonly chars: number;
	readonly behavior: string;
	readonly check: string;
}

const THOUSANDS = /,/g;
const TAG = /^<([a-z_]+)>$/;
const NONE = "none";

const rowOf = (cells: readonly string[]): Piece => ({
	piece: bare(cells[0] ?? ""),
	where: bare(cells[1] ?? ""),
	chars: Number((cells[2] ?? "").replace(THOUSANDS, "")),
	behavior: cells[3] ?? "",
	check: cells[4] ?? "",
});

/** Parses the table under `heading` on `page`, skipping any row with fewer than five cells; a thousands comma in the size cell is dropped before the number is read. */
export const parsePieces = (
	page: string,
	heading = PIECE_HEADING,
): readonly Piece[] =>
	tableRows(page, heading)
		.filter((cells) => cells.length >= 5)
		.map(rowOf);

/** Reads `PIECE_PAGE` by default and parses it with `parsePieces`; a missing page makes the read reject. */
export const readPieces = async (
	page = PIECE_PAGE,
): Promise<readonly Piece[]> => parsePieces(await bunFile(page).text());

/** The size of each `<tag>` block of a prompt file, keyed by `<tag>`. */
export const sectionSizes = async (
	path: string,
	root = "plugins/claudetto",
): Promise<ReadonlyMap<string, number>> => {
	const text = await bunFile(`${root}/${path}`).text();
	const sizes = new Map<string, number>();
	const blocks = /<([a-z_]+)>\n([\s\S]*?)\n<\/\1>/g;
	for (const block of text.matchAll(blocks)) {
		sizes.set(`<${block[1]}>`, block[0].length);
	}
	return sizes;
};

const measured = async (root: string): Promise<ReadonlyMap<string, number>> => {
	const all = new Map<string, number>();
	const perFile = await Promise.all(
		PROMPT_FILES.map(
			async (path) => [path, await sectionSizes(path, root)] as const,
		),
	);
	for (const [path, sizes] of perFile) {
		for (const [tag, size] of sizes) {
			all.set(`${path} ${tag}`, size);
		}
	}
	for (const [tool, text] of Object.entries(TOOL_TEXTS)) {
		all.set(`${TOOL_TEXT} ${tool}`, text.length);
	}
	return all;
};

const keyOf = (row: Piece): string => `${row.where} ${row.piece}`;

const rowFault = (
	row: Piece,
	sizes: ReadonlyMap<string, number>,
): string | undefined => {
	if (row.behavior === "" || row.check === "") {
		return `${row.piece} has an empty cell, so the table says nothing about it`;
	}
	if (row.behavior === NONE && row.check === NONE) {
		return `${row.piece} names no behavior and no check, so it is kept on no ground`;
	}
	if (!Number.isInteger(row.chars) || row.chars <= 0) {
		return `${row.piece} has no character figure`;
	}
	if (row.where !== TOOL_TEXT && !PROMPT_FILES.includes(row.where)) {
		return `${row.piece} is in the column \`Where\` as "${row.where}", which is neither \`${TOOL_TEXT}\` nor a prompt file`;
	}
	if (row.where !== TOOL_TEXT && !TAG.test(row.piece)) {
		return `${row.piece} is a row of ${row.where} and is not a section tag`;
	}
	const size = sizes.get(keyOf(row));
	if (size === undefined) {
		return `${row.piece} has a row and does not ship in ${row.where}`;
	}
	return size === row.chars
		? undefined
		: `${row.piece} is ${size} characters and the table says ${row.chars}`;
};

/**
 * The faults of the piece table. A piece that ships without a row is a fault too, because a piece
 * with no row is one nothing has to justify.
 */
export const pieceFaults = async (
	pieces: readonly Piece[],
	root = "plugins/claudetto",
): Promise<readonly string[]> => {
	const sizes = await measured(root);
	const faults = pieces
		.map((row) => rowFault(row, sizes))
		.filter((line): line is string => line !== undefined);
	const seen = new Set(pieces.map(keyOf));
	for (const key of sizes.keys()) {
		if (!seen.has(key)) {
			faults.push(`${key} ships and has no row, so nothing justifies it`);
		}
	}
	return faults;
};
