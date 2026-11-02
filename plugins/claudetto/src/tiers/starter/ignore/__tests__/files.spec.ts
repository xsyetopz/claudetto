import { describe, expect, test } from "bun:test";
import { BLOCK_END, BLOCK_START } from "../block.ts";
import { ignoreEdits, previewEdits, settle } from "../files.ts";
import { GITIGNORE_FIXED } from "../plan.ts";

const GO = ["go.mod", "main.go"];

const textOf = (
	edits: ReturnType<typeof ignoreEdits>,
	path: string,
): string | undefined => edits.find((edit) => edit.path === path)?.after;

describe("a repo with no ignore file", () => {
	test("both files are made, each as its block", () => {
		const edits = ignoreEdits({ files: GO, tracked: GO }, {});

		const gitignore = textOf(edits, ".gitignore") ?? "";
		expect(gitignore.startsWith(`${BLOCK_START}\n`)).toBe(true);
		expect(gitignore.endsWith(`${BLOCK_END}\n`)).toBe(true);
		expect(gitignore).toContain("\nvendor/\n");
		expect(gitignore).toContain("\nCLAUDE.local.md\n");
	});

	test("`.ignore` is not made when it would hold nothing", () => {
		const edits = ignoreEdits({ files: GO, tracked: GO }, {});

		expect(edits.map((edit) => edit.path)).toEqual([".gitignore"]);
	});

	test("`.ignore` is made when git tracks a heavy path", () => {
		const files = [...GO, "go.sum"];

		const edits = ignoreEdits({ files, tracked: files }, {});

		expect(textOf(edits, ".ignore")).toContain("\ngo.sum\n");
	});

	test("`.rgignore` is never made", () => {
		const files = [...GO, "go.sum"];

		const edits = ignoreEdits({ files, tracked: files }, {});

		const paths: string[] = edits.map((edit) => edit.path);

		expect(paths).not.toContain(".rgignore");
	});
});

describe("a repo with lines of its own", () => {
	const held = `node_modules
.DS_Store
!Thumbs.db
*.log
`;

	test("a path it names, a duplicate or a negation, stays out of the block", () => {
		const files = ["package.json"];

		const edits = ignoreEdits({ files, tracked: files }, { gitignore: held });

		const text = textOf(edits, ".gitignore") ?? "";
		expect(text.startsWith(held)).toBe(true);
		const block = text.slice(held.length);
		expect(block).not.toContain(".DS_Store");
		expect(block).not.toContain("Thumbs.db");
		expect(block).not.toContain("node_modules");
		expect(block).toContain("dist/");
		expect(block).toContain("*.swp");
	});

	test("the lines outside the block are the lines it had", () => {
		const files = ["package.json"];

		const edits = ignoreEdits({ files, tracked: files }, { gitignore: held });

		const text = textOf(edits, ".gitignore") ?? "";
		expect(text.slice(0, held.length)).toBe(held);
		expect(text.slice(held.length).startsWith(`\n${BLOCK_START}\n`)).toBe(true);
	});
});

describe("a rerun", () => {
	test("on the file it wrote changes nothing", () => {
		const listing = { files: GO, tracked: GO };
		const first = ignoreEdits(listing, { gitignore: "mine\n" });
		const gitignore = textOf(first, ".gitignore");

		const second = ignoreEdits(listing, { gitignore });

		expect(second).toEqual([]);
	});

	test("after a family is added changes only the block", () => {
		const before = ignoreEdits(
			{ files: GO, tracked: GO },
			{
				gitignore: "top\n",
			},
		);
		const held = `${textOf(before, ".gitignore")}bottom\n`;
		const files = [...GO, "Cargo.toml"];

		const after = ignoreEdits({ files, tracked: files }, { gitignore: held });

		const text = textOf(after, ".gitignore") ?? "";
		expect(text.startsWith("top\n\n")).toBe(true);
		expect(text.endsWith(`${BLOCK_END}\nbottom\n`)).toBe(true);
		expect(text).toContain("\ntarget/\n");
		expect(text).toContain("\nvendor/\n");
	});
});

describe("the dialog text", () => {
	test("shows each file with its added lines", () => {
		const edits = ignoreEdits({ files: GO, tracked: GO }, {});

		const shown = previewEdits(edits);

		expect(shown).toContain("+++ .gitignore");
		expect(shown).toContain(`+${GITIGNORE_FIXED[0]}`);
	});

	test("shows only the block lines that change on a rerun", () => {
		const first = ignoreEdits({ files: GO, tracked: GO }, {});
		const files = [...GO, "Cargo.toml"];

		const edits = ignoreEdits(
			{ files, tracked: files },
			{ gitignore: textOf(first, ".gitignore") },
		);

		expect(previewEdits(edits)).toBe(`+++ .gitignore
+target/`);
	});
});

describe("`settle`", () => {
	test("rebuilds the text from the file as it is when the user answers", () => {
		const edits = ignoreEdits({ files: GO, tracked: GO }, {});
		const edit = edits[0];
		if (edit === undefined) {
			throw new Error("no edit");
		}

		const text = settle(edit, "added meanwhile\n");

		expect(text?.startsWith("added meanwhile\n\n")).toBe(true);
		expect(text).toContain(BLOCK_START);
	});
});
