// `just generate`: each page of `wiki/` comes from `src/wiki/`, with the values and the snippets of `plugins/`, and each file of `openspec/schemas/` comes from a preset of the `spec` module.

import { expect, test } from "bun:test";
import path from "node:path";
import { write as bunWrite } from "bun";
import { SNIPPET } from "../../plugins/claudetto/modules/setup/prompts.ts";
import { schemaProblems } from "../../tools/generate/schemas.ts";
import {
	fill,
	GENERATED_MARK,
	pages,
	problems,
	VALUES,
} from "../../tools/generate/wiki.ts";
import { REPO, tmpDir } from "../support/repo.ts";
import { defined } from "./helpers.ts";

const X_MD_NONE_RE = /x\.md.*none\.json/;
const X_MD_NO_RE = /x\.md.*NO_SUCH/;

/** A root with the files `files`, each path relative to the root. */
const root = async (files: Record<string, string>): Promise<string> => {
	const dir = await tmpDir("wiki");
	await Promise.all(
		Object.entries(files).map(([rel, text]) =>
			bunWrite(path.join(dir, rel), text),
		),
	);
	return dir;
};

test("a value and a snippet include are filled in, and an unknown name throws", () => {
	expect(fill("{{CONTEXT_WINDOW}}", "x.md")).toBe(
		defined(VALUES["CONTEXT_WINDOW"]),
	);
	expect(JSON.parse(fill("{{include snippet.json}}", "x.md"))).toEqual(SNIPPET);
	expect(() => fill("{{NO_SUCH}}", "x.md")).toThrow(X_MD_NO_RE);
	expect(() => fill("{{include none.json}}", "x.md")).toThrow(X_MD_NONE_RE);
});

test("a page gets the header, inside its frontmatter when it has one", async () => {
	const dir = await root({
		"src/wiki/A.md": "# A\n",
		"src/wiki/B.md": "---\ntitle: B\n---\n\n# B\n",
	});
	const [a, b] = await pages(dir);
	expect(a?.text.startsWith(`<!-- ${GENERATED_MARK} \`src/wiki/A.md\``)).toBe(
		true,
	);
	expect(b?.text.startsWith(`---\n# ${GENERATED_MARK} \`src/wiki/B.md\``)).toBe(
		true,
	);
});

test("the check names a stale page and a page with no source", async () => {
	const dir = await root({
		"src/wiki/A.md": "# A\n",
		"wiki/A.md": "old\n",
		"wiki/C.md": "x\n",
	});
	const found = await problems(dir);
	expect(found).toHaveLength(2);
	expect(found[0]).toContain("wiki/A.md");
	expect(found[0]).toContain("src/wiki/A.md");
	expect(found[1]).toContain("wiki/C.md");
});

test("the wiki of the repository equals its source", async () => {
	expect(await problems(REPO)).toEqual([]);
});

test("the schemas of the repository equal their presets", async () => {
	expect(await schemaProblems(REPO)).toEqual([]);
});
