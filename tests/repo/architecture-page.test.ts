// Each path that the page `Architecture.md` names exists (spec `plugin-architecture`, "Architecture Page").

import { expect, test } from "bun:test";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { file } from "bun";
import { REPO } from "../support/repo.ts";

const PLUGIN = path.join(REPO, "plugins/claudetto");
const PAGE = await file(
	path.join(REPO, "src/wiki/claudetto/Architecture.md"),
).text();

const NOT_A_PATH = /^https?:|^\$/;

/** Whether the path `p` exists. */
const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

/** The paths in the code spans of `page` that exist under none of `roots`. A span with a `<placeholder>` is not a path. */
const missingPaths = async (
	page: string,
	roots: string[],
): Promise<string[]> => {
	const spans = [...page.matchAll(/`([^`\s<>]+\/[^`\s<>]*)`/g)]
		.map((m) => m[1] ?? "")
		.filter((p) => !NOT_A_PATH.test(p));
	const found = await Promise.all(
		spans.map(async (p) =>
			(await Promise.all(roots.map((r) => exists(path.join(r, p))))).some(
				Boolean,
			),
		),
	);
	return spans.filter((_, i) => !found[i]);
};

const modules = (
	await readdir(path.join(PLUGIN, "modules"), { withFileTypes: true })
)
	.filter((e) => e.isDirectory())
	.map((e) => e.name);

test("each path that the page names exists", async () => {
	// A module part, such as `domain/`, is a path under a module folder.
	const roots = [REPO, PLUGIN, path.join(PLUGIN, "kernel")].concat(
		modules.map((m) => path.join(PLUGIN, "modules", m)),
	);
	expect(await missingPaths(PAGE, roots)).toEqual([]);
});

test("the check names a path that does not exist", async () => {
	expect(
		await missingPaths("`modules/styles/` and `kernel/`", [PLUGIN]),
	).toEqual(["modules/styles/"]);
});
