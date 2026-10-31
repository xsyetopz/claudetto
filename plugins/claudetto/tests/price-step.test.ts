import type { On, TurnUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { HAIKU_MODEL } from "../src/tiers/tiers.ts";

const usageOf = (model: string, prompt: number): TurnUsage => ({
	model,
	input_tokens: prompt,
	cache_read_input_tokens: 0,
	cache_creation_input_tokens: 0,
	output_tokens: 0,
});

/** A step that asks for `calls` and holds its stop chunk, carrying `usage` unless it is `undefined`, until `release`; each call answers `chars` characters. */
const lab = (
	on: On,
	step: { usage: TurnUsage | null | undefined; calls: readonly string[] },
	chars: Readonly<Record<string, number>>,
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
	on("tool.call", (_$, e) => ({
		result: "x".repeat(chars[e.tool_use_id ?? ""] ?? 0),
	}));
	return { asked: asked.promise, release: held.resolve };
};

/** Starts the calls before the stop chunk, as the engine runs a tool while its step streams, and reads each answer once the step ended. */
const run = async (
	$: Engine,
	step: { asked: Promise<void>; release: () => void },
	calls: readonly string[],
) => {
	const drained = Array.fromAsync(
		$.turn.step({ turnId: "t1", index: 0, model: "haiku", messageCount: 1 }),
	);
	await step.asked;
	const answers = calls.map((id) =>
		$.tool.call({ tool: "mcp__s__read", tool_use_id: id }),
	);
	step.release();
	await drained;
	return Promise.all(answers);
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
