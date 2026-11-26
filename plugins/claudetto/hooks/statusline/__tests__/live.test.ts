import type { AgentReportInput, AgentSpawnInput, On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { readState } from "../line/state";

/** Serves the engine calls the live state needs; returns the files written, by path. */
const serve = (on: On, result: unknown = "ok") => {
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
	on("tool.run", () => ({ result }));
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
	test("session start writes the state file, also when the usage read fails, so the status line draws", async ($, on) => {
		// Arrange
		const state = serve(on);
		const store = new Map<string, unknown>();
		on("session.start", (_$, e) => ({ cwd: e.cwd }));
		on("session.usage", () => {
			throw new Error("usage unavailable");
		});
		on("tool.register", (_$, e) => ({ value: { tool: e.name } }));
		on("settings.read", () => ({ value: {} }));
		on("fs.exists", () => ({ value: false }));
		on("fs.read", () => ({ value: "" }));
		on("store.get", (_$, e) => ({ value: store.get(e.key) }));
		on("store.set", (_$, e) => {
			store.set(e.key, e.value);
			return { value: undefined };
		});
		on("ui.log", () => ({ value: undefined }));
		on("command.run", () => ({ text: "Reloaded" }));

		// Act
		await $.session.start({ cwd: "/repo", surface: null, isInteractive: true });

		// Assert
		expect(state()?.phase).toBe("idle");
	});

	test("is working during a turn and waiting for the next prompt once it ends", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.turn.start(TURN);
		const during = state();
		await $.turn.complete(DONE);

		// Assert
		expect(during?.phase).toBe("working");
		expect(state()?.phase).toBe("idle");
		expect(state()?.waiting).toEqual({ kind: "input" });
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

	test("counts each started call and names the lead's last one", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.run({
			tool: "Read",
			tool_use_id: "r1",
			file_path: "/r/src/main.ts"
		});
		await $.tool.run({
			tool: "Bash",
			tool_use_id: "r2",
			command: "git status"
		});

		// Assert
		expect(state()?.tools).toBe(2);
		expect(state()?.doing).toBe("Bash git status");
	});

	test("keeps the task list a TodoWrite call sets", async ($, on) => {
		// Arrange
		const state = serve(on);
		const todos = [
			{ content: "Read", status: "completed" as const, activeForm: "Reading" },
			{ content: "Test", status: "in_progress" as const, activeForm: "Testing" }
		];

		// Act
		await $.tool.run({ tool: "TodoWrite", tool_use_id: "r3", todos });

		// Assert
		expect(state()?.tasks).toEqual([
			{ id: "1", subject: "Read", status: "completed", active: "Reading" },
			{ id: "2", subject: "Test", status: "in_progress", active: "Testing" }
		]);
	});

	test("names an MCP call by its own tool and what it was given", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.run({
			tool: "mcp__claudetto__web_search",
			tool_use_id: "r4",
			input: { query: "bun spawn" },
			query: "bun spawn"
		});

		// Assert
		expect(state()?.doing).toBe("web_search bun spawn");
	});

	test("keeps a long subject within one status line cell by cutting it with an ellipsis", async ($, on) => {
		// Arrange
		const state = serve(on);

		// Act
		await $.tool.run({
			tool: "Bash",
			tool_use_id: "r5",
			command: "x".repeat(200)
		});

		// Assert
		expect(state()?.doing?.length).toBeLessThan(100);
		expect(state()?.doing?.endsWith("…")).toBe(true);
	});

	test("adds the task TaskCreate reports and drops it again on a deleted TaskUpdate", async ($, on) => {
		// Arrange
		const state = serve(on, { task: { id: "1", subject: "Read" } });

		// Act
		await $.tool.run({
			tool: "TaskCreate",
			tool_use_id: "r6",
			subject: "Read",
			description: "d"
		});
		const created = state()?.tasks;
		await $.tool.run({
			tool: "TaskUpdate",
			tool_use_id: "r7",
			taskId: "1",
			status: "deleted"
		});

		// Assert
		expect(created).toEqual([{ id: "1", subject: "Read", status: "pending" }]);
		expect(state()?.tasks).toEqual([]);
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
				startedAt: 1_000_000,
				tools: 0
			}
		]);
		expect(state()?.agents).toEqual([]);
		expect(state()?.finished).toEqual([
			{
				id: "id-scan",
				type: "Explore",
				description: "scan",
				startedAt: 1_000_000,
				tools: 0,
				endedAt: 1_000_000,
				end: "completed"
			}
		]);
	});
});
