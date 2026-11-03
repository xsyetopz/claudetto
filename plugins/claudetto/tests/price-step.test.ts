import type { On, TurnUsage } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";
import { HAIKU_MODEL } from "../src/tiers/tiers.ts";

/** A stand-in MCP tool, declared so a generated `McpToolInputs` does not reject its name. */
declare module "claude-code" {
	interface McpToolInputs {
		mcp__s__read: Record<never, never>;
	}
}

const usageOf = (model: string, prompt: number): TurnUsage => ({
	model,
	input_tokens: prompt,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
	output_tokens: 0,
});

/** A step that asks for `calls` and holds its stop chunk, carrying `usage` unless it is `undefined`, until `release`; each call answers `chars` characters, and a call in `failing` throws once. */
const lab = (
	on: On,
	step: { usage: TurnUsage | null | undefined; calls: readonly string[] },
	chars: Readonly<Record<string, number>>,
	failing: Set<string> = new Set(),
) => {
	const asked = Promise.withResolvers<void>();
	const held = Promise.withResolvers<void>();
	on("turn.step", async function* (_$, e) {
		for (const [index, id] of step.calls.entries()) {
			yield { kind: "tool", index, id, name: "mcp__s__read" };
		}
		asked.resolve();
		await held.promise;
		if (step.usage !== undefined) {
			yield { kind: "stop", stopReason: "tool_use", usage: step.usage };
		}
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			stopReason: "tool_use",
			usage: step.usage ?? null,
		};
	});
	on("tool.call", (_$, e) => {
		const id = e.tool_use_id ?? "";
		if (failing.delete(id)) {
			throw new Error(`${id} failed`);
		}
		return { result: "x".repeat(chars[id] ?? 0) };
	});
	return { asked: asked.promise, release: held.resolve };
};

/** Starts the calls before the stop chunk, as the engine runs a tool while its step streams, runs `beforeStop`, and reads each answer once the step ended. */
const run = async (
	$: Engine,
	step: { asked: Promise<void>; release: () => void },
	calls: readonly string[],
	beforeStop: () => void = () => undefined,
) => {
	const drained = Array.fromAsync(
		$.turn.step({ turnId: "t1", index: 0, model: "haiku", messageCount: 1 }),
	);
	await step.asked;
	const answers = calls.map((id) =>
		$.tool.call({ tool: "mcp__s__read", tool_use_id: id }),
	);
	beforeStop();
	step.release();
	await drained;
	const settled = await Promise.allSettled(answers);
	return settled.map((one) =>
		one.status === "fulfilled" ? one.value : undefined,
	);
};

test("a Haiku result that would take the next request over the step is withheld", async ($: Engine, on: On) => {
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 99_900), calls: ["c1"] },
		{ c1: 400 },
	);

	const [answer] = await run($, step, ["c1"]);

	expect(answer?.deny).toContain("about 134 tokens");
	expect(answer?.deny).toContain("about 100,034");
	expect(answer?.result).toBeUndefined();
});

test("a Haiku result that fits reaches the model unchanged", async ($: Engine, on: On) => {
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 99_900), calls: ["c1"] },
		{ c1: 300 },
	);

	const [answer] = await run($, step, ["c1"]);

	expect(answer?.deny).toBeUndefined();
	expect(answer?.result).toBe("x".repeat(300));
});

test("another model's result passes whatever its size", async ($: Engine, on: On) => {
	const step = lab(
		on,
		{ usage: usageOf("claude-sonnet-5-5", 200_000), calls: ["c1"] },
		{ c1: 30_000 },
	);

	const [answer] = await run($, step, ["c1"]);

	expect(answer?.deny).toBeUndefined();
});

test("of two Haiku results that cross only together, the first passes and the second is withheld", async ($: Engine, on: On) => {
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 99_900), calls: ["c1", "c2"] },
		{ c1: 240, c2: 240 },
	);

	const [first, second] = await run($, step, ["c1", "c2"]);

	expect(first?.deny).toBeUndefined();
	expect(second?.deny).toContain("about 100,060");
});

test("a step that ends with no reading passes its result", async ($: Engine, on: On) => {
	const step = lab(on, { usage: undefined, calls: ["c1"] }, { c1: 30_000 });

	const [answer] = await run($, step, ["c1"]);

	expect(answer?.deny).toBeUndefined();
});

test("a call that throws leaves no wait behind for a later call of the same id", async ($: Engine, on: On) => {
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 99_900), calls: ["c1"] },
		{ c1: 400 },
		new Set(["c1"]),
	);

	const [thrown] = await run($, step, ["c1"]);
	const later = await $.tool.call({ tool: "mcp__s__read", tool_use_id: "c1" });

	expect(thrown).toBeUndefined();
	expect(later.deny).toBeUndefined();
	expect(later.result).toBe("x".repeat(400));
});

/** The session and the clock the heartbeat reads, and each file it writes. */
const heartbeatLab = (on: On, write: (path: string, text: string) => void) => {
	on("session.id", () => ({ value: "s-1" }));
	on("session.root", () => ({ value: "/work" }));
	mock.clock(on, { now: 1000 });
	on("fs.write", (_$, e) => {
		write(e.path, e.text);
		return { value: undefined };
	});
};

test("a step writes the session's heartbeat when it starts and again on its stop chunk", async ($: Engine, on: On) => {
	const files: [string, string][] = [];
	heartbeatLab(on, (path, text) => files.push([path, text]));
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 10), calls: ["c1"] },
		{ c1: 1 },
	);
	let beforeStop = -1;

	await run($, step, ["c1"], () => {
		beforeStop = files.length;
	});

	expect(beforeStop).toBe(1);
	expect(files).toEqual([
		["/work/.claude/claudetto/heartbeat/s-1.txt", "1000"],
		["/work/.claude/claudetto/heartbeat/s-1.txt", "1000"],
	]);
});

test("a heartbeat that cannot be written leaves the step and its results as they were", async ($: Engine, on: On) => {
	heartbeatLab(on, () => {
		throw new Error("read-only");
	});
	const step = lab(
		on,
		{ usage: usageOf(HAIKU_MODEL, 10), calls: ["c1"] },
		{ c1: 5 },
	);

	const [answer] = await run($, step, ["c1"]);

	expect(answer?.result).toBe("xxxxx");
});
