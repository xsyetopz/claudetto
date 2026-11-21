import type { On } from "claude-code";
import type { Engine } from "claude-code/testing";
import { describe, expect, test } from "claude-code/testing";

import { fieldOf, stringsOf } from "../../shared/field";
import { THRASH_NOTE, THRASH_STEPS } from "../thrash";

/** Answers every tool call and turn step beneath the plugin's hooks. */
const base = (on: On) => {
	on("tool.call", () => ({ result: "ok" }));
	on("turn.step", async function* (_$, e) {
		// A response with no chunks; the yield keeps the body a generator.
		yield* [];
		await Promise.resolve();
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			serverToolUses: [],
			stopReason: "end_turn",
			usage: null
		};
	});
};

/** Runs `count` steps of one loop; a hook on the stream runs as it is read to its end. */
const step = async ($: Engine, agentId: string | undefined, count = 1) => {
	await Promise.all(
		Array.from({ length: count }, async (_, index) => {
			const stream = $.turn.step({
				turnId: "t",
				index,
				model: "sonnet",
				messageCount: 1,
				...(agentId === undefined ? {} : { agentId })
			});
			for await (const chunk of stream) {
				void chunk;
			}
		})
	);
};

const compact = ($: Engine, agentId?: string) =>
	$.session.compact({
		trigger: "auto",
		messages: [{ role: "user", text: "x", toolUses: [] }],
		...(agentId === undefined ? {} : { agentId })
	});

const notes = async ($: Engine, agentId?: string): Promise<string[]> => {
	const r = await $.tool.call({
		tool: "Read",
		file_path: "/x",
		...(agentId === undefined ? {} : { agentId })
	});
	return stringsOf(fieldOf(r, "context")) ?? [];
};

describe("subagent compaction thrash", () => {
	test("a second compaction within the step window gives one note on the next tool result", async ($, on) => {
		// Arrange
		base(on);
		on("session.compact", () => ({
			messages: [{ role: "user", text: "s", toolUses: [] }]
		}));
		await step($, "a1", 5);
		await compact($, "a1");
		await step($, "a1", THRASH_STEPS);
		await compact($, "a1");

		// Act
		const first = await notes($, "a1");
		const second = await notes($, "a1");

		// Assert
		expect(first).toEqual([THRASH_NOTE]);
		expect(second).toEqual([]);
	});

	test("the note is shown once per streak, and a spaced compaction resets it", async ($, on) => {
		// Arrange
		base(on);
		on("session.compact", () => ({
			messages: [{ role: "user", text: "s", toolUses: [] }]
		}));
		await step($, "a2", 1);
		await compact($, "a2");
		await step($, "a2", 1);
		await compact($, "a2");
		const shown = await notes($, "a2");
		await step($, "a2", 1);
		await compact($, "a2");
		const sameStreak = await notes($, "a2");
		await step($, "a2", THRASH_STEPS + 1);
		await compact($, "a2");
		await step($, "a2", 2);
		await compact($, "a2");

		// Act
		const newStreak = await notes($, "a2");

		// Assert
		expect(shown).toEqual([THRASH_NOTE]);
		expect(sameStreak).toEqual([]);
		expect(newStreak).toEqual([THRASH_NOTE]);
	});

	test("compactions more than the window apart give no note", async ($, on) => {
		// Arrange
		base(on);
		on("session.compact", () => ({
			messages: [{ role: "user", text: "s", toolUses: [] }]
		}));
		await step($, "a3", 1);
		await compact($, "a3");
		await step($, "a3", THRASH_STEPS + 1);
		await compact($, "a3");

		// Act
		const context = await notes($, "a3");

		// Assert
		expect(context).toEqual([]);
	});

	test("the main loop and other subagents get no note", async ($, on) => {
		// Arrange
		base(on);
		on("session.compact", () => ({
			messages: [{ role: "user", text: "s", toolUses: [] }]
		}));
		await step($, "a4", 1);
		await compact($, "a4");
		await step($, "a4", 1);
		await compact($, "a4");
		await step($, undefined, 1);
		await compact($);
		await step($, undefined, 1);
		await compact($);

		// Act
		const main = await notes($);
		const other = await notes($, "a5");

		// Assert
		expect(main).toEqual([]);
		expect(other).toEqual([]);
	});

	test("the note is within 200 characters and names chunks, a capped filter and reporting", () => {
		// Assert
		expect(THRASH_NOTE.length).toBeLessThanOrEqual(200);
		expect(THRASH_NOTE).toContain("offset/limit");
		expect(THRASH_NOTE).toContain("head");
		expect(THRASH_NOTE).toContain("report");
	});
});
