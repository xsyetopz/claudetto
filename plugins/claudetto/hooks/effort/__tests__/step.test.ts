import type { On } from "claude-code";
import { describe, type Engine, expect, test } from "claude-code/testing";

/** Records the effort each step reaches the engine with. */
const engine = (on: On): unknown[] => {
	const sent: unknown[] = [];
	on("turn.step", async function* (_$, e) {
		sent.push(e.effort);
		await Promise.resolve();
		yield { kind: "text", index: 0, text: "" };
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			stopReason: "end_turn",
			usage: null
		};
	});
	return sent;
};

type Effort = "low" | "medium" | "high" | "xhigh" | "max" | number | undefined;

const drain = async (stream: AsyncIterator<unknown>): Promise<void> => {
	const chunk = await stream.next();
	if (chunk.done !== true) {
		await drain(stream);
	}
};

/** Runs one main-loop step per level, in order, with that level as the session's effort. */
const steps = async ($: Engine, levels: readonly Effort[]): Promise<void> => {
	if (levels.length === 0) {
		return;
	}
	const [effort, ...rest] = levels;
	const stream = $.turn.step({
		turnId: "t1",
		index: 0,
		model: "claude-haiku-5-5",
		messageCount: 1,
		...(effort === undefined ? {} : { effort })
	});
	await drain(stream[Symbol.asyncIterator]());
	await steps($, rest);
};

describe("effort cap", () => {
	test("a step above medium goes out at medium", async ($, on) => {
		// Arrange
		const sent = engine(on);

		// Act
		await steps($, ["high", "xhigh", "max"]);

		// Assert
		expect(sent).toEqual(["medium", "medium", "medium"]);
	});

	test("a step at or below medium, a token budget and no level go out unchanged", async ($, on) => {
		// Arrange
		const sent = engine(on);

		// Act
		await steps($, ["low", "medium", 4000, undefined]);

		// Assert
		expect(sent).toEqual(["low", "medium", 4000, undefined]);
	});
});
