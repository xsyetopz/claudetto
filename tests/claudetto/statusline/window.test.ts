// The window of a subagent row is the `contextWindowSize` that Claude Code reports, with no assumed window.

import { expect, test } from "bun:test";
import { main } from "../../../plugins/claudetto/modules/statusline/adapters/cli.ts";
import { depsFor, NOW, type Run } from "./support.ts";

const subagentRow = async (task: Record<string, unknown>) => {
	const run: Run = { status: -1, out: [], err: [] };
	await main(
		["--subagent"],
		depsFor({ columns: 100, tasks: [task] }, run, {
			env: { COLUMNS: "100", NO_COLOR: "1" },
		}),
	);
	const parsed: { content: string } = JSON.parse(run.out[0] ?? "{}");
	return parsed.content;
};

const base = {
	id: "t1",
	name: "scout",
	status: "running",
	startTime: NOW - 60_000,
	tokenCount: 60_000,
};

test("a subagent row shows the `contextWindowSize` that Claude Code reports, for each model", async () => {
	const contents = await Promise.all(
		["claude-haiku-4-5", "claude-sonnet-5-5"].map((model) =>
			subagentRow({ ...base, model, contextWindowSize: 1_000_000 }),
		),
	);
	for (const content of contents) {
		expect(content).toContain("60k/1M 6%");
	}
});

test("a subagent row with no `contextWindowSize` shows the tokens and no percent", async () => {
	const content = await subagentRow({ ...base, model: "claude-haiku-4-5" });
	expect(content).toContain("▤ 60k ");
	expect(content).not.toContain("%");
});
