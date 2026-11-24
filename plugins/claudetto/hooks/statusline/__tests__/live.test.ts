import type { AgentReportInput, AgentSpawnInput, On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { readState } from "../line/state";

/** Serves the engine calls the live state needs; returns the files written, by path. */
const serve = (on: On) => {
	const files = new Map<string, string>();
	on("env.get", (_$, e) => ({
		value: e.name === "CLAUDE_CONFIG_DIR" ? "/cfg" : undefined
	}));
	on("session.id", () => ({ value: "s1" }));
	on("clock.now", () => ({ value: 1_000_000 }));
	on("fs.write", (_$, e) => {
		files.set(e.path, e.text);
		return { value: undefined };
	});
	on("tool.check", () => ({ decision: "ask" }));
	on("tool.run", () => ({ result: "ok" }));
	on("agent.spawn", (_$, e) => ({
		model: "m",
		agentId: `id-${e.description}`
	}));
	on("agent.report", (_$, e) => ({ text: e.text }));
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	return () => readState(files.get("/cfg/claudetto/status/s1.json"));
};

const TURN = { text: "", turnId: "t1" };
const DONE = {
	answer: "",
	durationMs: 1,
	isAborted: false,
	turnId: "t1",
	reason: "answer"
} as const;

describe("live state", () => {
	test("is working during a turn and waiting for the next prompt once it ends", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.turn.start(TURN);
		const during = state();
		await $.turn.complete(DONE);

		// Assert
		expect(during).toEqual({ phase: "working", agents: [] });
		expect(state()).toEqual({
			phase: "idle",
			waiting: { kind: "input" },
			agents: []
		});
	});

	test("records the permission prompt a call raises, then clears it when a tool runs", async ($, on) => {
		// Arrange
		const state = serve(on);
		const call = {
			tool: "mcp__claudetto__web_search" as const,
			input: { query: "x" },
			query: "x",
			tool_use_id: "u1"
		};

		// Act
		await $.tool.check(call);
		const asked = state();
		await $.tool.run(call);
		const answered = state();

		// Assert
		expect(asked?.waiting).toEqual({
			kind: "permission",
			tool: "mcp__claudetto__web_search"
		});
		expect(answered?.waiting).toBeUndefined();
	});

	test("records the question AskUserQuestion puts to the person", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.check({
			tool: "AskUserQuestion",
			input: {},
			tool_use_id: "u2"
		});

		// Assert
		expect(state()?.waiting).toEqual({
			kind: "question",
			tool: "AskUserQuestion"
		});
	});

	test("lists a subagent from its spawn until its report", async ($, on) => {
		// Arrange
		const state = serve(on);
		const spawn: AgentSpawnInput = {
			tool_use_id: "u3",
			prompt: "p",
			description: "scan",
			subagentType: "Explore",
			provider: { plugin: "engine", tier: "core" },
			parentModel: "claude-opus-5-5",
			background: false,
			fork: false
		};

		// Act
		await $.agent.spawn(spawn);
		const running = state()?.agents;
		const report: AgentReportInput = {
			agentId: "id-scan",
			subagentType: "Explore",
			status: "completed",
			provider: { plugin: "engine", tier: "core" },
			text: "done"
		};
		await $.agent.report(report);

		// Assert
		expect(running).toEqual([
			{
				id: "id-scan",
				type: "Explore",
				description: "scan",
				startedAt: 1_000_000
			}
		]);
		expect(state()?.agents).toEqual([]);
	});
});
