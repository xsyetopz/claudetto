import { describe, expect, test } from "claude-code/testing";

import { touched } from "./perl";

describe("perl diff note", () => {
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
			const numstat = e.argv[2] === "--numstat";
			const stdout = numstat ? (diffs++ === 0 ? "" : "2\t2\tsrc/a.ts\n") : " src/a.ts | 4 ++--\n";
			return { value: { exitCode: 0, stdout, stderr: "", isStdoutTruncated: false, isStderrTruncated: false } };
		});
		on("tool.check", () => ({ decision: "allow" }) as never);
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }) as never);

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "perl -0pi -e 's/a/b/g' src/a.ts" });

		// Assert
		const context = (r as { context?: readonly string[] }).context ?? [];
		expect(context.length).toBe(1);
		expect(context[0]).toStartWith(" src/a.ts | 4 ++--\nRead each file above again");
	});

	test("a Bash call without perl -i gets no note", async ($, on) => {
		// Arrange
		on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }) as never);

		// Act
		const r = await $.tool.call({ tool: "Bash", command: "perl -ne 'print' a.ts" });

		// Assert
		expect((r as { context?: readonly string[] }).context).toBeUndefined();
	});
});
