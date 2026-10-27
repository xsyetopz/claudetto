// Each link in `wiki/` resolves.
// A link without a scheme is a wiki page (`Page` or `Page#anchor`, the form of the published wiki)
// or a relative path to a file of the repository.
// An `http` link is out of scope, because the test needs no network.

import { expect, test } from "bun:test";
import { access, readdir } from "node:fs/promises";
import path from "node:path";
import { file as bunFile } from "bun";
import { REPO } from "../support/repo.ts";

const WIKI = path.join(REPO, "wiki");
// The GitHub Wiki finds a page by its file name, also in a subfolder such as `archive/`.
const pages = (await readdir(WIKI, { recursive: true })).filter((f) =>
	f.endsWith(".md"),
);
const FENCE = /^\s*```/;
const HEADING = /^#{1,6}\s+(.*?)\s*#*$/;
const SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const byName = new Map<string, string[]>();
for (const page of pages) {
	const name = path.basename(page, ".md");
	byName.set(name, [...(byName.get(name) ?? []), page]);
}

/** The GitHub anchors of the headings of `text`, outside code blocks. */
const anchors = (text: string): Set<string> => {
	const out = new Set<string>();
	let fence = false;
	for (const line of text.split("\n")) {
		if (FENCE.test(line)) {
			fence = !fence;
		}
		const m = !fence && HEADING.exec(line);
		if (m) {
			out.add(
				(m[1] ?? "")
					.toLowerCase()
					.replace(/[`*_]/g, "")
					.replace(/[^\p{L}\p{N} -]/gu, "")
					.replace(/ /g, "-"),
			);
		}
	}
	return out;
};

/** The link targets of `text`, outside code blocks and spans. */
const targets = (text: string): string[] => {
	const plain = text
		.replace(/^\s*```[\s\S]*?^\s*```/gm, "")
		.replace(/`[^`\n]*`/g, "");
	return [...plain.matchAll(/\]\(([^)\s]+)\)/g)].map((m) => m[1] ?? "");
};

/** Whether the path `p` exists. */
const exists = async (p: string): Promise<boolean> => {
	try {
		await access(p);
		return true;
	} catch {
		return false;
	}
};

/** The path that the link `file` of `page` points to, where `named` is the wiki page of that name. */
const targetOf = (
	page: string,
	file: string,
	named: string | undefined,
): string => {
	if (file === "") {
		return path.join(WIKI, page);
	}
	if (named) {
		return path.join(WIKI, named);
	}
	return path.resolve(WIKI, path.dirname(page), file);
};

/** Whether the link `t` of `page` is broken. */
const isBroken = async (page: string, t: string): Promise<boolean> => {
	const [file = "", anchor] = t.split("#");
	const named = byName.get(file)?.[0];
	// A page link with a folder does not resolve on the GitHub Wiki, which addresses a page by name.
	if (
		!named &&
		byName.has(path.basename(file, ".md")) &&
		!file.startsWith(".")
	) {
		return true;
	}
	const target = targetOf(page, file, named);
	if (!(await exists(target))) {
		return true;
	}
	if (!anchor || !target.endsWith(".md")) {
		return false;
	}
	return !anchors(await bunFile(target).text()).has(anchor);
};

/** The broken links of the wiki, as "page: target". */
const broken = async (): Promise<string[]> => {
	const perPage = await Promise.all(
		pages.map(async (page) => {
			const links = targets(await bunFile(path.join(WIKI, page)).text()).filter(
				(t) => !SCHEME.test(t),
			);
			const flags = await Promise.all(links.map((t) => isBroken(page, t)));
			return links.filter((_, i) => flags[i]).map((t) => `${page}: ${t}`);
		}),
	);
	return perPage.flat();
};

// A lint of the live wiki.
test("lint: each link in `wiki/` resolves", async () => {
	expect(await broken()).toStrictEqual([]);
});

test("lint: each page name in `wiki/` is unique across its folders", () => {
	expect(
		[...byName.values()].filter((files) => files.length > 1),
	).toStrictEqual([]);
});

test("the anchor rule follows the GitHub slug", () => {
	expect([
		...anchors("## The `sec-default` guard (3)\n```\n# no\n```"),
	]).toStrictEqual(["the-sec-default-guard-3"]);
});
