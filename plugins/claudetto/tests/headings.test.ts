// Lab tests of the `hygiene` hook that sets the Title Case of Markdown headings after an `Edit` or a `Write` (task 10.11). The files are a map in memory.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const stub = (on: On, files: Record<string, string>) => {
	on("classic.PostToolUse", () => ({}));
	on("fs.read", (_$, e) => {
		const text = files[e.path];
		return typeof text === "string" ? { value: text } : { deny: "ENOENT" };
	});
	on("fs.exists", (_$, e) => ({ value: typeof files[e.path] === "string" }));
	on("fs.write", (_$, e) => {
		files[e.path] = e.text;
		return { value: undefined };
	});
	on("session.id", () => ({ value: "s1" }));
	on("session.root", () => ({ value: "/proj" }));
	on("env.get", (_$, e) => ({
		value: e.name === "TMPDIR" ? "/tmp" : undefined,
	}));
};

const edited = ($: Engine, tool: string, path: string) =>
	$.classic.PostToolUse({
		tool_name: tool,
		tool_input: { file_path: path },
		tool_response: {},
		tool_use_id: "t1",
	});

test("Heading Case: after a `Write` of a `.md` file, each heading gets the Chicago Title Case, a code span and a code block stay, and the model gets a line", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		"/proj/a.md":
			"# guide to the `hooks` module\n\n```sh\n# a comment\n```\n\n## what to do in a crisis\n",
	};
	stub(on, files);
	const answer = await edited($, "Write", "/proj/a.md");
	expect(files["/proj/a.md"]).toBe(
		"# Guide to the `hooks` Module\n\n```sh\n# a comment\n```\n\n## What to Do in a Crisis\n",
	);
	expect((answer.additionalContext ?? []).join("\n")).toContain("`/proj/a.md`");
});

test("Heading Case: a `.md` file in the right case and a file of another kind stay as they are, with no line", async ($: Engine, on: On) => {
	const files: Record<string, string> = {
		"/proj/b.md": "# Fresh Install\n",
		"/proj/c.ts": "// a comment\n# not a heading\n",
	};
	stub(on, files);
	const same = await edited($, "Edit", "/proj/b.md");
	const other = await edited($, "Edit", "/proj/c.ts");
	expect(files["/proj/b.md"]).toBe("# Fresh Install\n");
	expect(files["/proj/c.ts"]).toBe("// a comment\n# not a heading\n");
	expect(same.additionalContext ?? []).toStrictEqual([]);
	expect(other.additionalContext ?? []).toStrictEqual([]);
});
