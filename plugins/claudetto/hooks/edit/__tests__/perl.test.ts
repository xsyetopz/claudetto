import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import { PERL_EDIT, touched } from "../perl";

describe("perl diff note", () => {
	test("finds perl -i run by xargs, a loop or find -exec, and not perl named as text", () => {
		// Arrange
		const edits = [
			"git grep -l fetchUser | xargs perl -pi -e 's/a/b/g'",
			"git grep -lz a | xargs -0 perl -0pi -e 's/a/b/g'",
			"for f in a.js b.js; do perl -pi -e 's/a/b/g' \"$f\"; done",
			"find . -name '*.md' -exec perl -pi -e 's/a/b/' {} +",
			"cd src && perl -pi -e 's/a/b/' a.js",
			"exec </dev/null\nperl -pi -e 's/a/b/' a.js"
		];
		const others = [
			"perl -ne 'print' a.ts",
			"echo perl -pi is fast",
			"git commit -m 'use perl -pi'"
		];

		// Act and Assert
		expect(edits.filter((c) => !PERL_EDIT.test(c))).toEqual([]);
		expect(others.filter((c) => PERL_EDIT.test(c))).toEqual([]);
	});

	test("names only the files whose numstat line changed", () => {
		// Arrange
		const before = "1\t1\ta.ts\n";
		const after = "1\t1\ta.ts\n3\t2\tb.ts\n";

		// Act and Assert
		expect(touched(before, after)).toEqual(["b.ts"]);
	});

	test("a perl in-place edit returns the diff stat of the changed file and the re-Read step", async ($, on) => {
		// Arrange
		// The plugin registers the hook itself; a test module may not call $.process.run.
		let diffs = 0;
		on("process.run", (_$, e) => {
			let stdout = " src/a.ts | 4 ++--\n";
			if (e.argv[2] === "--numstat") {
				stdout = diffs === 0 ? "" : "2\t2\tsrc/a.ts\n";
				diffs++;
			}
			return {
				value: {
					exitCode: 0,
					stdout,
					stderr: "",
					isStdoutTruncated: false,
					isStderrTruncated: false
				}
			};
		});
		on("tool.check", () => ({ decision: "allow" }));
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));

		// Act
		const r = await $.tool.call({
			tool: "Bash",
			command: "perl -0pi -e 's/a/b/g' src/a.ts"
		});

		// Assert
		const context = stringsOf(fieldOf(r, "context")) ?? [];
		expect(context.length).toBe(1);
		expect(context[0]).toStartWith(
			" src/a.ts | 4 ++--\nRead each file above again"
		);
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
