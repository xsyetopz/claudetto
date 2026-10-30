import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readScopes, scopeFaults, scopeOf } from "../rule-scope.ts";

describe("every shipped rule is scoped to the files it is about", () => {
	test("no shipped rule would load in a session that touches no match", async () => {
		expect(scopeFaults(await readScopes())).toEqual([]);
	});

	// The glob is matched and not compared as text: the rule carries one brace list per language
	// family, so a test that looked for the literal `**/*.ts` failed while the rule did load on a
	// TypeScript file.
	test("the comment rule loads on a TypeScript file", async () => {
		const scopes = await readScopes();

		const comments = scopes.find(
			(scope) => scope.name === "claudetto-comments.md",
		);

		expect(
			(comments?.paths ?? []).some((glob) =>
				new Glob(glob).match("src/parser.ts"),
			),
		).toBe(true);
	});
});

describe("the check names each way a scope fails", () => {
	test("a list of globs is the scope", () => {
		const scope = scopeOf(
			"a.md",
			'---\npaths:\n  - "src/**/*.ts"\n---\nBody.\n',
		);

		expect(scope).toEqual({ name: "a.md", paths: ["src/**/*.ts"] });
	});

	test("a comma string is the scope the harness also takes", () => {
		const scope = scopeOf(
			"a.md",
			`---
paths: 'a/*.ts, b/*.ts'
---
Body.
`,
		);

		expect(scope.paths).toEqual(["a/*.ts", "b/*.ts"]);
	});

	test("a file with no front matter is a fault", () => {
		const faults = scopeFaults([scopeOf("a.md", "Just a body.\n")]);

		expect(faults).toEqual(["a.md: the file has no front matter"]);
	});

	test("a file with no paths key is a fault", () => {
		const faults = scopeFaults([
			scopeOf(
				"a.md",
				`---
name: a
---
Body.
`,
			),
		]);

		expect(faults).toEqual(["a.md: the file names no `paths` key"]);
	});

	test("an empty paths list is a fault", () => {
		const faults = scopeFaults([
			scopeOf(
				"a.md",
				`---
paths: []
---
Body.
`,
			),
		]);

		expect(faults).toEqual(["a.md: the `paths` key holds no glob"]);
	});

	test("front matter that is not YAML is a fault", () => {
		const faults = scopeFaults([
			scopeOf(
				"a.md",
				`---
paths: [a, b
---
Body.
`,
			),
		]);

		expect(faults).toHaveLength(1);
		expect(faults[0]).toContain("the front matter is not YAML");
	});

	test("a paths key that is not a list of globs is a fault", () => {
		const faults = scopeFaults([
			scopeOf(
				"a.md",
				`---
paths: 5
---
Body.
`,
			),
		]);

		expect(faults).toEqual([
			"a.md: the `paths` key is a number, and the harness takes a list or a comma string",
		]);
	});
});
