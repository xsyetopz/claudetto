import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

import { RUN_LOG, runStats } from "./runs.ts";
import { scanner } from "./secrets.mock.ts";

const TRANSCRIPT = "/t/agent-a1.jsonl";
const LOG = `/repo/${RUN_LOG}`;

const usage = (read: number, created: number) => ({
	input_tokens: 2,
	cache_creation_input_tokens: created,
	cache_read_input_tokens: read,
});

const line = (
	id: string,
	at: string,
	read: number,
	created: number,
	content: unknown[] = [],
) =>
	JSON.stringify({
		type: "assistant",
		timestamp: at,
		message: {
			id,
			model: "claude-sonnet-5-5",
			usage: usage(read, created),
			content,
		},
	});

const EDIT = {
	type: "tool_use",
	name: "Edit",
	input: { file_path: "/repo/x.ts" },
};

// Each request spans several lines with one message id, so it counts once.
const JSONL = [
	line("m1", "2026-11-09T10:00:00.000Z", 0, 6000),
	line("m1", "2026-11-09T10:00:00.500Z", 0, 6000),
	JSON.stringify({ type: "user", timestamp: "2026-11-09T10:00:01.000Z" }),
	line("m2", "2026-11-09T10:06:40.000Z", 5998, 2, [EDIT]),
].join("\n");

test("Requests Count Once: two requests, the hit rate of their input, and the longest gap", () => {
	expect(runStats(JSONL, () => void 0)).toEqual({
		requests: 2,
		cacheHitRate: 0.5,
		maxGapSeconds: 400,
		files: ["/repo/x.ts"],
	});
});

interface Lab {
	files: Map<string, string>;
	clock: ReturnType<typeof mock.clock>;
}

const lab = (on: On, block = false): Lab => {
	const state: Lab = {
		files: new Map([[TRANSCRIPT, JSONL]]),
		clock: mock.clock(on, { now: 1000 }),
	};
	scanner(on);
	on("agent.list", () => ({ value: [] }));
	on("fs.exists", () => ({ value: false }));
	on("session.messages", () => ({ value: [] }));
	on("env.get", () => ({ value: undefined }));
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.root", () => ({ value: "/repo" }));
	on("fs.read", (_$, e) => {
		const text = state.files.get(e.path);
		if (text === undefined) {
			throw new Error(`ENOENT: ${e.path}`);
		}
		return { value: text };
	});
	on("fs.write", (_$, e) => {
		state.files.set(e.path, e.text);
		return { value: undefined };
	});
	on("agent.spawn", () => ({ model: "claude-sonnet-5-5", agentId: "a1" }));
	on("classic.SubagentStop", () => (block ? { block: "not yet" } : {}));
	on("tool.call", () => ({ result: "ok" }));
	on("turn.complete", () => ({ text: "" }));
	return state;
};

const spawnAndStop = async ($: Engine, state: Lab) => {
	await $.agent.spawn({
		tool_use_id: "toolu_1",
		prompt: "edit x",
		description: "edit",
		subagentType: "claudetto:Heracles",
		provider: { plugin: "claudetto", tier: "core" },
		parentModel: "opus",
		background: true,
		fork: false,
	});
	await state.clock.advance(60_000);
	return $.classic.SubagentStop({
		stop_hook_active: false,
		agent_id: "a1",
		agent_type: "claudetto:Heracles",
		agent_transcript_path: TRANSCRIPT,
	});
};

const rootTurn = ($: Engine) =>
	$.turn.complete({
		durationMs: 1,
		isAborted: false,
		reason: "answer",
		turnId: "t",
		answer: "",
	});

const edit = ($: Engine, file_path: string, by: { agentId?: string } = {}) =>
	$.tool.call({
		tool: "Edit",
		file_path,
		old_string: "a",
		new_string: "b",
		...by,
	});

const logged = (state: Lab): unknown[] =>
	(state.files.get(LOG) ?? "")
		.split("\n")
		.filter((l) => l !== "")
		.map((l): unknown => JSON.parse(l));

test("Redone: the root edits a file the run edited, and the run is logged after 3 root turns", async ($: Engine, on: On) => {
	const state = lab(on);

	await spawnAndStop($, state);
	await edit($, "/repo/x.ts");
	await rootTurn($);
	await rootTurn($);
	expect(logged(state)).toEqual([]);
	await rootTurn($);

	expect(logged(state)).toEqual([
		{
			agent: "claudetto:Heracles",
			model: "claude-sonnet-5-5",
			durationSeconds: 60,
			requests: 2,
			cacheHitRate: 0.5,
			maxGapSeconds: 400,
			files: ["/repo/x.ts"],
			rootEditedWithin3Turns: true,
		},
	]);
});

test("Kept: no root edit of its files, and a subagent's own turns and edits do not count", async ($: Engine, on: On) => {
	const state = lab(on);

	await spawnAndStop($, state);
	await edit($, "/repo/x.ts", { agentId: "a2" });
	await edit($, "/repo/y.ts");
	await $.turn.complete({
		durationMs: 1,
		isAborted: false,
		reason: "answer",
		turnId: "s",
		answer: "",
		agentId: "a2",
	});
	await rootTurn($);
	await rootTurn($);
	await rootTurn($);

	expect(logged(state)).toEqual([
		expect.objectContaining({ rootEditedWithin3Turns: false }),
	]);
});

test("A Blocked Stop records no run", async ($: Engine, on: On) => {
	const state = lab(on, true);

	await spawnAndStop($, state);
	await rootTurn($);
	await rootTurn($);
	await rootTurn($);

	expect(logged(state)).toEqual([]);
});
