import { describe, expect, test } from "bun:test";
import { join } from "node:path";
import { launch } from "../launcher/launcher.ts";
import { DEFAULT_MODEL } from "../shared/model.ts";
import { tempDir } from "../shared/temp.ts";
import { createRun } from "../workspace/workspace.ts";
import { mainRequests, readRequests, startFake } from "./fake.ts";
import { type Plan, pickStep, sse, usageFor } from "./plan.ts";

const MSG_ID = /^msg_[0-9a-f]{8}_\d+$/;

const root = (): Promise<string> => tempDir("fake");

interface Frame {
	type: string;
	is_error?: boolean;
	message: { id: string; content: { type: string; text?: string }[] };
}

const session = async (
	plan: Plan,
	prompt: string,
	extra: { flags?: string[]; settings?: Record<string, unknown> } = {},
) => {
	const run = await createRun({
		probe: "fake-test",
		root: await root(),
		quiet: true,
	});
	const fake = await startFake({ plan, dir: join(run.dir, "requests") });
	try {
		const result = await launch(
			{
				prompt,
				mode: "stream-json",
				model: DEFAULT_MODEL,
				baseUrl: fake.url,
				timeoutMs: 60_000,
				...extra,
			},
			run,
		);
		const frames: Frame[] = (await Bun.file(result.files.stdout).text())
			.split("\n")
			.filter((l) => l.startsWith("{"))
			.map((l) => JSON.parse(l));
		return { result, frames, requests: await readRequests(fake.dir) };
	} finally {
		await fake.stop();
	}
};

const assistantIds = (frames: Frame[]): string[] =>
	frames.filter((f) => f.type === "assistant").map((f) => f.message.id);

describe("plan", () => {
	test("steps answer in order, and a match narrows a step", () => {
		const plan: Plan = {
			steps: [
				{ match: { hasTools: true }, reply: { blocks: [{ type: "text", text: "A" }] } },
				{ reply: { blocks: [{ type: "text", text: "B" }] } },
			],
		};
		expect(pickStep(plan, new Set(), { tools: [] })).toBe(1);
		expect(pickStep(plan, new Set(), { tools: [{}] })).toBe(0);
		expect(pickStep(plan, new Set([0, 1]), { tools: [{}] })).toBe(-1);
	});

	test("usage splits a prompt into cache read, cache write, and input", () => {
		const first = usageFor(`AAAA"cache_control"BBBB`, "", 10);
		expect(first.usage.cache_read_input_tokens).toBe(0);
		expect(first.usage.cache_creation_input_tokens).toBeGreaterThan(0);
		const second = usageFor(
			`AAAA"cache_control"CC"cache_control"DD`,
			first.cacheable,
			10,
		);
		expect(second.usage.cache_read_input_tokens).toBeGreaterThan(0);
		// The uncached tail is `"cache_control"DD`, 17 chars, 17 / 3.6 rounds to 5.
		expect(second.usage.input_tokens).toBe(5);
	});

	test("sse defaults the stop reason to tool_use when a tool is called", () => {
		const text = sse({
			reply: {
				blocks: [
					{ type: "tool_use", name: "Bash", input: { command: "true" } },
				],
			},
			id: "msg_x",
			model: DEFAULT_MODEL,
			usage: {
				input_tokens: 1,
				cache_creation_input_tokens: 0,
				cache_read_input_tokens: 0,
				output_tokens: 1,
			},
			toolId: () => "toolu_x",
		});
		expect(text).toContain('"stop_reason":"tool_use"');
		expect(text).toContain('"id":"toolu_x"');
	});
});

describe("fake against a real `claude -p`", () => {
	test("answers from the plan and saves each request with redacted headers", async () => {
		const { result, frames, requests } = await session(
			{ steps: [{ reply: { blocks: [{ type: "text", text: "PONG-ONE." }] } }] },
			"say pong",
		);
		expect(result.exitCode).toBe(0);
		const texts = frames
			.filter((f) => f.type === "assistant")
			.flatMap((f) => f.message.content.map((c) => c.text));
		expect(texts).toContain("PONG-ONE.");
		const main = mainRequests(requests);
		expect(main.length).toBe(1);
		expect(main[0]?.body.model).toBe(DEFAULT_MODEL);
		expect(JSON.stringify(main[0]?.body.messages)).toContain("say pong");
		for (const r of requests) {
			expect(r.headers["x-api-key"] ?? "[REDACTED]").toBe("[REDACTED]");
		}
	});

	test("gives each answer its own message id, so tool calls do not merge", async () => {
		const call = (command: string) => ({
			reply: {
				blocks: [
					{ type: "tool_use" as const, name: "Bash", input: { command } },
				],
			},
		});
		const { frames, requests } = await session(
			{
				steps: [
					call("echo one"),
					call("echo two"),
					{ reply: { blocks: [{ type: "text", text: "DONE." }] } },
				],
			},
			"run two commands",
			{ settings: { permissions: { allow: ["Bash"] } } },
		);
		const ids = assistantIds(frames);
		expect(ids.length).toBe(3);
		expect(new Set(ids).size).toBe(3);
		for (const id of ids) {
			expect(id).toMatch(MSG_ID);
		}
		const last = mainRequests(requests).at(-1);
		const assistantTurns = (last?.body.messages ?? []).filter(
			(m) => m.role === "assistant",
		);
		expect(assistantTurns.length).toBe(2);
	});

	const badRequest = {
		error: {
			status: 400,
			type: "invalid_request_error",
			message: "FAKE-BAD-REQUEST",
		},
	};

	test("an error on every request reaches the CLI as a failed run", async () => {
		const { result, frames } = await session(
			{ steps: [], fallback: badRequest },
			"hi",
		);
		const final = frames.find((f) => f.type === "result");
		expect(final?.is_error).toBe(true);
		expect(result.exitCode).not.toBe(0);
	});

	test("one 400 alone is resent and the run succeeds", async () => {
		const { result, requests } = await session(
			{ steps: [{ reply: badRequest }] },
			"hi",
		);
		expect(result.exitCode).toBe(0);
		expect(mainRequests(requests).map((r) => r.meta.step)).toEqual([0, -1]);
	});
});
