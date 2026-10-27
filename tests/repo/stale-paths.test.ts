// Each repository path in a code span of `src/wiki/` exists.
// The pages of `evidence/` are out of scope, because they record the files of a past run.

import { expect, test } from "bun:test";
import { access } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { REPO, walk } from "../support/repo.ts";

const WIKI = path.join(REPO, "src", "wiki");
const ROOTED =
	/^(?:plugins|tests|tools|dev|src|schemas|openspec|\.claude|\.biome|\.github)\//;
// A placeholder, such as `<module>` or `*.ts`, names no single file.
const PLACEHOLDER = /[<>*{}$]/;
const SPAN = /`([^`\s]+)`/g;
const SUFFIX = /[:#].*$/;

/** The repository paths in the code spans of `text`, without a `:line` or `#anchor` suffix. */
const pathsOf = (text: string): string[] =>
	[...text.matchAll(SPAN)]
		.map((m) => (m[1] ?? "").replace(SUFFIX, ""))
		.filter((p) => ROOTED.test(p) && !PLACEHOLDER.test(p));

const exists = async (p: string): Promise<boolean> => {
	try {
		await access(path.join(REPO, p));
		return true;
	} catch {
		return false;
	}
};

test("Wiki paths: each repository path in `src/wiki/` exists, outside `evidence/`", async () => {
	const pages = await walk(WIKI, {
		keep: (f) =>
			f.endsWith(".md") && !f.includes(`${path.sep}evidence${path.sep}`),
	});
	const texts = await Promise.all(pages.map((page) => bunFile(page).text()));
	const named = pages.flatMap((page, i) =>
		pathsOf(texts[i] ?? "").map((p) => ({ page, p })),
	);
	const found = await Promise.all(named.map(({ p }) => exists(p)));
	const missing = named
		.filter((_, i) => !found[i])
		.map(({ page, p }) => `${path.relative(REPO, page)}: ${p}`);
	expect(missing).toStrictEqual([]);
});

test("Wiki paths: a rooted path counts, and a bare name or a placeholder does not", () => {
	const text =
		"See `plugins/claudetto/kernel/ports.ts:12`, `mod.ts`, `tests/claudetto/<module>/`, and `just check`.";
	expect(pathsOf(text)).toStrictEqual(["plugins/claudetto/kernel/ports.ts"]);
});
