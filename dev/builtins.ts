#!/usr/bin/env bun
// The inventory of the built-in parts of Claude Code.
// It reads one release folder, `external/cc-<version>/` (`strings.txt` and `types-<version>.d.ts`),
// and writes `Builtins.md` with the pages that it links, and `Sections.md` with the text of each system prompt section,
// to the git-ignored `.claude/claudetto/builtins/`.
//
//   bun dev/builtins.ts            write the pages
//   bun dev/builtins.ts --check    exit 1 with the added, removed, and changed rows when the pages differ from a new run
//   bun dev/builtins.ts --strict   exit 1 when a row has the verdict `todo`
//   bun dev/builtins.ts --dir D    read the folder D in place of `SOURCE_DIR`, for a new release
//   bun dev/builtins.ts --out D    write or check the pages in the folder D in place of `OUT_DIR`
//
// `external/` is local only, so no CI recipe runs this tool.

import { readdir } from "node:fs/promises";
import path from "node:path";
import { write as bunWrite, file } from "bun";
import { extract } from "./builtins/extract.ts";
import { diff, render, renderSections } from "./builtins/render.ts";
import { VERDICTS } from "./builtins/verdicts.ts";

const BUILTINS_PAGE = /^Builtins.*\.md$/;
const TYPES_FILE = /^types-(.+)\.d\.ts$/;

/** The folder of the release that the tool reads when `--dir` is not given. */
const SOURCE_DIR = "external/cc-2.1.305";
const OUT_DIR = ".claude/claudetto/builtins";
const ROOT = path.resolve(import.meta.dir, "..");

const readOld = async (out: string): Promise<Map<string, string>> => {
	// Every `Builtins*.md` page of the folder counts, so a stale page shows as removed.
	const names = (await readdir(out).catch(() => [])).filter((f) =>
		BUILTINS_PAGE.test(f),
	);
	return new Map(
		await Promise.all(
			names.map(
				async (f) =>
					[f.slice(0, -3), await file(path.join(out, f)).text()] as const,
			),
		),
	);
};

const checkPages = async (
	out: string,
	pages: Map<string, string>,
): Promise<number> => {
	const lines = diff(await readOld(out), pages);
	if (lines.length === 0) {
		return 0;
	}
	console.error(
		`${lines.length} difference(s) from ${out}:\n${lines
			.slice(0, 40)
			.map((l) => `  ${l}`)
			.join("\n")}`,
	);
	return 1;
};

const writePages = async (
	out: string,
	pages: Map<string, string>,
	sections: string,
): Promise<number> => {
	await Promise.all(
		[...pages].map(([page, text]) =>
			bunWrite(path.join(out, `${page}.md`), text),
		),
	);
	await bunWrite(path.join(out, "Sections.md"), sections);
	process.stdout.write(`Wrote ${pages.size} pages to ${out}.\n`);
	return 0;
};

const releaseVersion = async (dir: string): Promise<string> =>
	(await readdir(dir)).map((f) => TYPES_FILE.exec(f)?.[1]).find(Boolean) ??
	path.basename(dir);

const main = async (): Promise<number> => {
	const args = process.argv.slice(2);
	const opt = (name: string, fallback: string) =>
		path.resolve(ROOT, args[args.indexOf(name) + 1] ?? fallback);
	const dir = args.includes("--dir")
		? opt("--dir", "")
		: path.resolve(ROOT, SOURCE_DIR);
	const out = args.includes("--out")
		? opt("--out", "")
		: path.resolve(ROOT, OUT_DIR);
	const strings = file(path.join(dir, "strings.txt"));
	if (!(await strings.exists())) {
		console.error(
			`No strings.txt in ${dir}. Pass --dir with a release folder.`,
		);
		return 2;
	}
	const parts = extract(await strings.text());
	const pages = render(parts, await releaseVersion(dir));
	let code = args.includes("--check")
		? await checkPages(out, pages)
		: await writePages(out, pages, renderSections(parts));
	const todo = parts.filter((p) => !VERDICTS[`${p.group}:${p.name}`]).length;
	if (args.includes("--strict") && todo) {
		console.error(`${todo} row(s) have the verdict todo.`);
		code = 1;
	}
	return code;
};

if (import.meta.main) {
	process.exitCode = await main();
}
