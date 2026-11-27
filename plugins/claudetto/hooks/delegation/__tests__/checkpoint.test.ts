import type { AgentInfo, On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { inOrder } from "../../guards/__tests__/in-order";
import { fieldOf, stringsOf } from "../../shared/field";

const MINUTE = 60_000;

/** A subagent `a1` that started `minutes` ago, a machine with free memory, and a Bash tool beneath the plugin. */
const world = (on: On, minutes: number) => {
	const now = 100 * MINUTE;
	const agent: AgentInfo = {
		id: "a1",
		description: "x",
		type: "general-purpose",
		status: "running",
		kind: "local_agent",
		taskStatus: "running",
		label: "x",
		startTime: now - minutes * MINUTE,
		cwd: "/repo",
		tokenCount: 0,
		tokenSamples: [],
		hasRow: true
	};
	on("agent.list", () => ({ value: [agent] }));
	on("clock.now", () => ({ value: now }));
	on("process.run", () => ({
		value: {
			exitCode: 0,
			stdout: "System-wide memory free percentage: 50%\n",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));
};

/** The context lines each call's result carried, in call order. */
const contexts = (
	call: (agentId: string | undefined) => Promise<unknown>,
	agents: (string | undefined)[]
) =>
	inOrder(
		agents,
		async (agentId) => stringsOf(fieldOf(await call(agentId), "context")) ?? []
	);

describe("subagent checkpoint note", () => {
	test("a subagent past ten minutes gets one note naming the minutes, and its next call in that interval gets none", async ($, on) => {
		// Arrange
		world(on, 12);

		// Act
		const seen = await contexts(
			(agentId) =>
				$.tool.call({
					tool: "Bash",
					command: "ls",
					...(agentId === undefined ? {} : { agentId })
				}),
			["a1", "a1"]
		);

		// Assert
		expect(seen.map((lines) => lines.length)).toEqual([1, 0]);
		expect(seen[0]?.[0]).toContain("10 minutes");
	});

	test("a subagent under ten minutes gets no note", async ($, on) => {
		// Arrange
		world(on, 3);

		// Act
		const seen = await contexts(
			(agentId) =>
				$.tool.call({
					tool: "Bash",
					command: "ls",
					...(agentId === undefined ? {} : { agentId })
				}),
			["a1"]
		);

		// Assert
		expect(seen.map((lines) => lines.length)).toEqual([0]);
	});

	test("a call from the main conversation gets no note", async ($, on) => {
		// Arrange
		world(on, 30);

		// Act
		const seen = await contexts(
			(agentId) =>
				$.tool.call({
					tool: "Bash",
					command: "ls",
					...(agentId === undefined ? {} : { agentId })
				}),
			[undefined]
		);

		// Assert
		expect(seen.map((lines) => lines.length)).toEqual([0]);
	});
});
