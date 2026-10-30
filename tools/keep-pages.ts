// Every surface a tier row keeps, denies, or describes has a decision page under `docs/keep/`, so
// that a surface the plugin touches is a decision someone wrote down and not a default the tree
// inherited. A page holds what the item does, what claudetto needs it for with its file and line,
// its measured request cost, and the recommendation the user answered.
//
//   bun tools/keep-pages.ts

import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { TIERS, type TierRow } from "../plugins/claudetto/src/tiers/tiers.ts";

/** The folder of `docs/keep/` that holds the pages of each kind of surface. */
export const KIND_FOLDERS = {
	tool: "tools",
	skill: "skills",
	command: "commands",
	plugin: "plugins",
} as const;

/** The kinds of surface that have a decision page, taken from the keys of `KIND_FOLDERS`. */
export type Kind = keyof typeof KIND_FOLDERS;

/** Every `Kind`, in the order `pagesIn` reads their folders. */
export const KINDS = [
	"tool",
	"skill",
	"command",
	"plugin",
] as const satisfies readonly Kind[];

/** The extension a page carries. */
const PAGE = ".txt";

/** A surface that a tier row names, with its kind. */
export interface Item {
	readonly kind: Kind;
	readonly name: string;
}

/** An item with no decision page, with the folder under `docs/keep` where the page belongs. */
export interface Fault {
	readonly item: Item;
	readonly folder: string;
}

/**
 * The surfaces the rows name. `describeSet` is the one field that names any, because a row sets no
 * deny list: the three auto mode lists hold the engine's own defaults and nothing of ours.
 */
export const itemsOf = (rows: readonly TierRow[]): Item[] => {
	const items = new Map<string, Item>();
	for (const row of rows) {
		for (const name of row.describeSet ?? []) {
			items.set(`tool/${name}`, { kind: "tool", name });
		}
	}
	return [...items.values()];
};

const namesIn = async (dir: string): Promise<string[]> => {
	try {
		const found = await readdir(dir);
		return found
			.filter((name) => name.endsWith(PAGE))
			.map((name) => name.slice(0, -PAGE.length));
	} catch {
		return [];
	}
};

/** The page names of each kind. A folder that is not there reads as no pages, so every item faults. */
export const pagesIn = async (
	root: string,
): Promise<ReadonlyMap<Kind, readonly string[]>> => {
	const found = await Promise.all(
		KINDS.map((kind) =>
			namesIn(join(root, "docs", "keep", KIND_FOLDERS[kind])),
		),
	);
	return new Map(KINDS.map((kind, at) => [kind, found[at] ?? []]));
};

/** The items with no page of their kind. */
export const pageFaults = (
	items: readonly Item[],
	pages: ReadonlyMap<Kind, readonly string[]>,
): Fault[] =>
	items
		.filter((item) => !(pages.get(item.kind) ?? []).includes(item.name))
		.map((item) => ({ item, folder: KIND_FOLDERS[item.kind] }));

/** One line per fault, naming the page that is missing and the item that needs it. */
export const faultLines = (faults: readonly Fault[]): string[] =>
	faults.map(
		(fault) =>
			`docs/keep/${fault.folder}/${fault.item.name}${PAGE}: no decision page for the ${fault.item.kind} \`${fault.item.name}\`, which a tier row names`,
	);

const main = async (): Promise<void> => {
	const root = join(import.meta.dir, "..");
	const faults = pageFaults(itemsOf(TIERS), await pagesIn(root));
	for (const line of faultLines(faults)) {
		console.error(line);
	}
	if (faults.length > 0) {
		process.exitCode = 1;
	}
};

if (import.meta.main) {
	await main();
}
