// Lab tests of the cache clock of the handover offer (task 3.11, D47, spec `handover`, "Cold Cache").
// A model request of the main thread renews the cache time, so a long turn stays warm, and a request of a subagent does not.
// The offer of the handover shows whether the cache counts as cold at the next prompt.

import type { On } from "claude-code";
import { type Engine, expect, mock, test } from "claude-code/testing";

const HOUR = 3_600_000;

/** The stubs, and the questions that the offer asked. */
const engine = (on: On, env: Record<string, string> = {}) => {
	const asks: string[] = [];
	const clock = mock.clock(on, { now: 10 * HOUR });
	mock.env(on, { CLAUDE_PROJECT_DIR: "/p", ...env });
	on("prompt.submit", (_$, e) => ({ text: e.text }));
	on("session.turns", () => ({ value: 2 }));
	on("agent.list", () => ({ value: [] }));
	on("tool.call", (_$, e, next) => {
		if (e.tool !== "AskUserQuestion") {
			return next(e);
		}
		asks.push(JSON.stringify(e));
		return { result: { answers: {} } };
	});
	on("turn.complete", (_$, e) => ({ text: e.answer }));
	on("turn.step", async function* (_$, e) {
		yield* [];
		return {
			turnId: e.turnId,
			index: e.index,
			answer: "",
			toolUses: [],
			stopReason: "end_turn" as const,
			usage: null,
		};
	});
	return { asks, clock };
};

const turnEnd = ($: Engine) =>
	$.turn.complete({
		answer: "Done.",
		durationMs: 1,
		isAborted: false,
		turnId: "t1",
		reason: "answer",
	});

const typed = ($: Engine) =>
	$.prompt.submit({
		text: "Now add the tests.",
		wait: false,
		origin: { kind: "composer" },
	});

/** A model request of the main thread, or of the agent `agentId`, at the time of the clock. */
const step = async ($: Engine, agentId?: string) => {
	const stream = $.turn.step({
		turnId: "t1",
		index: 0,
		model: "claude-haiku-5-5",
		messageCount: 1,
		...(agentId === undefined ? {} : { agentId }),
	});
	await Array.fromAsync(stream);
};

test("a model request of the main thread in a long turn keeps the cache warm", async ($: Engine, on: On) => {
	const { asks, clock } = engine(on);
	await turnEnd($);
	await clock.set(10 * HOUR + HOUR - 1);
	await step($);
	await clock.set(10 * HOUR + 2 * HOUR - 2);
	await typed($);
	expect(asks).toEqual([]);
});

test("a model request of a subagent does not keep the cache warm", async ($: Engine, on: On) => {
	const { asks, clock } = engine(on);
	await turnEnd($);
	await clock.set(10 * HOUR + HOUR - 1);
	await step($, "a1");
	await clock.set(10 * HOUR + 2 * HOUR - 2);
	await typed($);
	expect(asks).toHaveLength(1);
});

/** A resumed session whose last answer was `seconds` ago, as the classic `SessionStart` input gives it. */
const resumed = async ($: Engine, on: On, seconds: number) => {
	const { asks } = engine(on);
	on("classic.SessionStart", () => ({}));
	await $.classic.SessionStart({
		source: "resume",
		seconds_since_last_response: seconds,
	});
	await typed($);
	return asks;
};

test("a resumed session whose last answer is younger than the cache TTL shows no offer", async ($: Engine, on: On) => {
	expect(await resumed($, on, 600)).toEqual([]);
});

test("a resumed session whose last answer is older than the cache TTL shows the offer", async ($: Engine, on: On) => {
	expect(await resumed($, on, 7200)).toHaveLength(1);
});
