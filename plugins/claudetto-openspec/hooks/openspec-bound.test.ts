import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { memory } from "./memory-fs.ts";

const C = "/repo/openspec/changes";
const status = async ($: Engine, tasks: string, on: On) => {
	memory(on, {
		[`${C}/c/proposal.md`]: "# P\n",
		[`${C}/c/tasks.md`]: tasks,
	});
	const out = await $.tool.call({
		tool: "mcp__claudetto-openspec__openspec",
		action: "status",
		change: "c",
	});
	return typeof out.result === "string" ? out.result : "";
};

test("Status of a change with thousands of open tasks stays under the size limit and counts the lines it drops", async ($: Engine, on: On) => {
	const tasks = Array.from(
		{ length: 3000 },
		(_, i) => `- [ ] 1.${i} ${"word ".repeat(20)}`,
	).join("\n");
	const out = await status($, tasks, on);
	expect(out.length).toBeLessThan(12_200);
	expect(out.startsWith("c: ")).toBe(true);
	expect(out).toMatch(/\n\[claudetto: \d+ more lines not shown\]$/u);
});

test("One line longer than the limit is dropped and counted", async ($: Engine, on: On) => {
	const out = await status($, `- [ ] 1.1 ${"x".repeat(50_000)}\n`, on);
	expect(out.length).toBeLessThan(12_200);
	expect(out).toMatch(/\[claudetto: [1-9]\d* more lines not shown\]$/u);
});

test("A result under the limit is returned whole", async ($: Engine, on: On) => {
	const out = await status($, "- [ ] 1.1 a\n- [ ] 1.2 b\n", on);
	expect(out).not.toContain("not shown");
	expect(out).toContain("1.2 b");
});
