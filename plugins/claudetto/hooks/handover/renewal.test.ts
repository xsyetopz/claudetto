import { describe, expect, test } from "claude-code/testing";
import { resetRenewal } from "./renewal";

function world(on, tokens: number) {
	const calls = { fork: 0, compact: 0 };
	on("ui.log", () => ({ value: undefined }));
	on("session.compact", () => {
		calls.compact += 1;
		return { messages: [{ role: "user", text: "H", toolUses: [] }] };
	});
	on("env.get", () => ({ value: undefined }));
	on("model.fork", () => {
		calls.fork += 1;
		return { value: { isAnswered: true, text: "H", usage: { input_tokens: 0, output_tokens: 0, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 } } };
	});
	on("session.usage", () => ({ value: { startedAt: 0, context: { tokens, window: 200000 }, rateLimits: [] } }));
	on("process.run", () => ({ value: { exitCode: 0, stdout: "", stderr: "" } }));
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	on("classic.TaskCreated", () => ({}));
	on("classic.TaskCompleted", () => ({}));
	on("classic.PostToolUse", () => ({}));
	on("classic.Stop", () => ({}));
	return calls;
}

const TURN = { answer: "ok", durationMs: 1, isAborted: false, turnId: "t1", reason: "answer" } as const;

describe("renewal", () => {
	test("a finished last task above 70k renews", async ($, on) => {
		resetRenewal();
		const calls = world(on, 90000);
		await $.classic.TaskCreated({ task_id: "1", task_subject: "x" });
		await $.classic.TaskCompleted({ task_id: "1", task_subject: "x" });
		await $.turn.complete(TURN);
		expect(calls.compact).toBe(1);
	});
	test("a boundary under 70k does nothing", async ($, on) => {
		resetRenewal();
		const calls = world(on, 50000);
		await $.classic.Stop({ stop_hook_active: false });
		await $.turn.complete(TURN);
		expect(calls.compact).toBe(0);
	});
	test("an open task is no boundary", async ($, on) => {
		resetRenewal();
		const calls = world(on, 90000);
		await $.classic.TaskCreated({ task_id: "1", task_subject: "x" });
		await $.classic.TaskCreated({ task_id: "2", task_subject: "y" });
		await $.classic.TaskCompleted({ task_id: "1", task_subject: "x" });
		await $.classic.Stop({ stop_hook_active: false });
		await $.turn.complete(TURN);
		expect(calls.compact).toBe(0);
	});
	test("a git commit is a boundary", async ($, on) => {
		resetRenewal();
		const calls = world(on, 90000);
		await $.classic.TaskCreated({ task_id: "1", task_subject: "x" });
		await $.classic.PostToolUse({ tool_name: "Bash", tool_input: { command: "git commit -m s" }, tool_response: {}, tool_use_id: "u1" });
		await $.turn.complete(TURN);
		expect(calls.compact).toBe(1);
	});
	test("a subagent turn never renews", async ($, on) => {
		resetRenewal();
		const calls = world(on, 90000);
		await $.classic.Stop({ stop_hook_active: false });
		await $.turn.complete({ ...TURN, agentId: "a1" });
		expect(calls.compact).toBe(0);
	});
	test("background work holds the boundary", async ($, on) => {
		resetRenewal();
		const calls = world(on, 90000);
		await $.classic.Stop({ stop_hook_active: false, background_tasks: [{ id: "b", type: "shell", status: "running", description: "d" }] });
		await $.turn.complete(TURN);
		expect(calls.compact).toBe(0);
	});
});
