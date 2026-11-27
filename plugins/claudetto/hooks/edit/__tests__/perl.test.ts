import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { inOrder } from "../../guards/__tests__/order";
import { fieldOf, stringsOf } from "../../shared/field";

const done = (stdout: string, exitCode = 0) => ({
	value: {
		exitCode,
		stdout,
		stderr: "",
		isStdoutTruncated: false,
		isStderrTruncated: false
	}
});

/**
 * A git work tree whose `git diff --numstat` answers `before`, then `after`, alternately,
 * and the Bash tool beneath the plugin. Returns the paths each `git diff --stat` was asked for.
 */
const world = (on: On, before: string, after: string) => {
	const stats: string[][] = [];
	let reads = 0;
	on("process.run", (_$, e) => {
		if (e.argv[2] === "--numstat") {
			return done(reads++ % 2 === 0 ? before : after);
		}
		if (e.argv[0] !== "git") {
			return done("[]");
		}
		stats.push(e.argv.slice(4));
		return done(` ${e.argv.slice(4).join(" ")} | 4 ++--\n`);
	});
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));
	return stats;
};

describe("perl diff note", () => {
	test("a perl in-place edit run by xargs, a loop, find -exec or after cd gets the note", async ($, on) => {
		// Arrange
		world(on, "", "2\t2\tsrc/a.ts\n");
		const edits = [
			"git grep -l fetchUser | xargs perl -pi -e 's/a/b/g'",
			"for f in a.js b.js; do perl -pi -e 's/a/b/g' \"$f\"; done",
			"find . -name '*.md' -exec perl -pi -e 's/a/b/' {} +",
			"cd src && perl -pi -e 's/a/b/' a.js"
		];

		// Act
		const results = await inOrder(edits, async (command) => {
			const r = await $.tool.call({ tool: "Bash", command });
			return stringsOf(fieldOf(r, "context")) ?? [];
		});

		// Assert
		expect(results.map((context) => context.length)).toEqual([1, 1, 1, 1]);
	});

	test("perl that only reads, or is named as text, gets no note", async ($, on) => {
		// Arrange
		world(on, "", "");

		// Act
		const results = await inOrder(
			[
				"perl -ne 'print' a.ts",
				"echo perl -pi is fast",
				"git commit -m 'use perl -pi'"
			],
			(command) => $.tool.call({ tool: "Bash", command })
		);

		// Assert
		for (const r of results) {
			expect(fieldOf(r, "context")).toBeUndefined();
		}
	});

	test("the diff stat names only the files the edit changed", async ($, on) => {
		// Arrange
		const stats = world(on, "1\t1\ta.ts\n", "1\t1\ta.ts\n3\t2\tb.ts\n");

		// Act
		await $.tool.call({ tool: "Bash", command: "perl -pi -e 's/a/b/' *.ts" });

		// Assert
		expect(stats).toEqual([["b.ts"]]);
	});

	test("an edit that changed no tracked file asks for no diff stat", async ($, on) => {
		// Arrange
		const stats = world(on, "1\t1\ta.ts\n", "1\t1\ta.ts\n");

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "perl -pi -e 's/zzz/b/' a.ts"
		});

		// Assert
		expect(stats).toEqual([]);
		expect(stringsOf(fieldOf(r, "context")) ?? []).toHaveLength(1);
	});

	test("a perl in-place edit returns the diff stat of the changed file", async ($, on) => {
		// Arrange
		world(on, "", "2\t2\tsrc/a.ts\n");

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "perl -0pi -e 's/a/b/g' src/a.ts"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context.length).toBe(1);
		expect(context[0]).toContain(" src/a.ts | 4 ++--");
	});

	test("outside a git work tree the note says the stat is unavailable and never says nothing changed", async ($, on) => {
		// Arrange
		on("process.run", () => ({
			value: {
				exitCode: 128,
				stdout: "",
				stderr: "fatal: not a git repository",
				isStdoutTruncated: false,
				isStderrTruncated: false
			}
		}));
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "perl -pi -e 's/a/b/g' a.txt"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context.length).toBe(1);
		expect(context[0]).not.toContain("No tracked file changed");
		expect(context[0]).toContain("may have changed");
	});

	test("a Bash call without perl -i gets no note", async ($, on) => {
		// Arrange
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "perl -ne 'print' a.ts"
		});

		// Assert
		expect(fieldOf(r, "context")).toBeUndefined();
	});
});
