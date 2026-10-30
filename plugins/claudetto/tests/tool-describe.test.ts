import type { On, ToolDescribeInput } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { TOOL_TEXTS } from "../src/tools/texts.ts";

const call = (description: string): ToolDescribeInput => ({
	tool: "Read",
	description,
	provider: { plugin: "engine", tier: "core" },
});

test("a longer description of the session is replaced by ours", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe(call("x".repeat(2000)));

	expect(out.description).toBe(TOOL_TEXTS["Read"] ?? "");
});

test("a description shorter than ours is kept", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe(call("read a file"));

	expect(out.description).toBe("read a file");
});

test("a tool claudetto writes no text for is passed on unchanged", async ($: Engine, on: On) => {
	on("tool.describe", (_$, e) => e);

	const out = await $.tool.describe({
		...call("x".repeat(2000)),
		tool: "NotebookEdit",
	});

	expect(out.description).toBe("x".repeat(2000));
});

for (const tool of Object.keys(TOOL_TEXTS)) {
	test(`two builds of the ${tool} text are byte-identical`, async ($: Engine, on: On) => {
		on("tool.describe", (_$, e) => e);

		const first = await $.tool.describe({ ...call("x".repeat(4000)), tool });
		const second = await $.tool.describe({ ...call("x".repeat(4000)), tool });

		expect(second.description).toBe(first.description);
		expect(first.description).toBe(TOOL_TEXTS[tool] ?? "");
	});
}
