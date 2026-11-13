import { describe, expect, test } from "claude-code/testing";

import { BLOCK_END, BLOCK_START } from "./ignore-block";
import { GITIGNORE_FIXED } from "./ignore-plan";
import { ignoreEdits, previewEdits, settle } from "./ignores";

const GO = ["go.mod", "main.go"];

const textOf = (
	edits: ReturnType<typeof ignoreEdits>,
	path: string,
): string | undefined => edits.find((edit) => edit.path === path)?.after;

const heldText = (
	edits: ReturnType<typeof ignoreEdits>,
	path: string,
): string => textOf(edits, path) ?? "";

const onlyEdit = (edits: ReturnType<typeof ignoreEdits>) => {
	const [edit] = edits;
	if (edit === undefined) {
		throw new Error("no edit");
	}
	return edit;
};

describe("a repo with no ignore file", () => {
	test("both files are made, each as its block", () => {
		const edits = ignoreEdits({ files: GO, tracked: GO }, {});

		const gitignore = heldText(edits, ".gitignore");
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

		const text = heldText(edits, ".gitignore");
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

		const text = heldText(edits, ".gitignore");
		expect(text.slice(0, held.length)).toBe(held);
		expect(text.slice(held.length).startsWith(`\n${BLOCK_START}\n`)).toBe(true);
	});
});

describe("a folder that a worktree links", () => {
	const files = ["package.json"];

	test("is ignored by its bare name, which also matches the link, and not by `dir/`", () => {
		const edits = ignoreEdits({ files, tracked: files }, {}, ["node_modules"]);

		const lines = heldText(edits, ".gitignore").split("\n");
		expect(lines).toContain("node_modules");
		expect(lines).not.toContain("node_modules/");
	});

	test("gets its bare line beside a `dir/` line that the file holds outside the block", () => {
		const held = "node_modules/\n";

		const edits = ignoreEdits({ files, tracked: files }, { gitignore: held }, [
			"node_modules",
		]);

		const lines = heldText(edits, ".gitignore").split("\n");
		expect(lines.filter((line) => line === "node_modules")).toHaveLength(1);
		expect(lines.filter((line) => line === "node_modules/")).toHaveLength(1);
	});

	test("is not added twice when the file holds the bare line", () => {
		const held = "node_modules\n";

		const edits = ignoreEdits({ files, tracked: files }, { gitignore: held }, [
			"node_modules",
		]);

		expect(
			heldText(edits, ".gitignore").match(/^node_modules$/gmu),
		).toHaveLength(1);
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

		const text = heldText(after, ".gitignore");
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
		const edit = onlyEdit(edits);

		const text = settle(edit, "added meanwhile\n");

		expect(text?.startsWith("added meanwhile\n\n")).toBe(true);
		expect(text).toContain(BLOCK_START);
	});
});
