import type { AgentInfo, On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import { RUNAWAY_MINUTES, runawayNote } from "../runaway";

const MINUTE = 60_000;
const NOW = 10_000_000_000;

const agent = (id: string, startTime: number): AgentInfo => ({
	id,
	description: "x",
	type: "general-purpose",
	status: "running",
	kind: "local_agent",
	taskStatus: "running",
	label: id,
	startTime,
	cwd: "/work",
	tokenCount: 0,
	tokenSamples: [],
	hasRow: false
});

/** Lists the agents and answers every tool call beneath the plugin's hooks. */
const world = (on: On, agents: AgentInfo[], now = () => NOW) => {
	on("clock.now", () => ({ value: now() }));
	on("agent.list", () => ({ value: agents }));
	on("tool.call", () => ({ result: "ok" }));
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
};

const notes = async ($: Engine, agentId?: string): Promise<string[]> => {
	const r = await $.tool.call({
		tool: "Read",
		file_path: "/x",
		...(agentId === undefined ? {} : { agentId })
	});
	return stringsOf(fieldOf(r, "context")) ?? [];
};

describe("runaway subagent note", () => {
	test("a subagent past the limit reads one wrap-up note, once", async ($, on) => {
		// Arrange
		world(on, [agent("r1", NOW - (RUNAWAY_MINUTES + 5) * MINUTE)]);

		// Act
		const first = await notes($, "r1");
		const second = await notes($, "r1");

		// Assert
		expect(first).toEqual([runawayNote(RUNAWAY_MINUTES + 5)]);
		expect(first[0]).toContain("report");
		expect(second).toEqual([]);
	});

	test("a subagent under the limit gets no note", async ($, on) => {
		// Arrange
		world(on, [agent("r2", NOW - (RUNAWAY_MINUTES - 5) * MINUTE)]);

		// Act
		const context = await notes($, "r2");

		// Assert
		expect(context).toEqual([]);
	});

	test("the main loop gets no note however long the session ran", async ($, on) => {
		// Arrange
		world(on, [agent("r3", NOW - 600 * MINUTE)]);

		// Act
		const context = await notes($);

		// Assert
		expect(context).toEqual([]);
	});

	test("an agent the list omits is timed from its first turn.start", async ($, on) => {
		// Arrange
		let clock = 1_000_000;
		world(on, [], () => clock);
		await $.turn.start({ text: "go", turnId: "t1", agentId: "r4" });
		clock += (RUNAWAY_MINUTES + 1) * MINUTE;

		// Act
		const context = await notes($, "r4");

		// Assert
		expect(context).toEqual([runawayNote(RUNAWAY_MINUTES + 1)]);
	});

	test("the note is within 200 characters at a four-hour run", () => {
		// Assert
		expect(runawayNote(254).length).toBeLessThanOrEqual(200);
		expect(RUNAWAY_MINUTES).toBe(30);
	});
});
