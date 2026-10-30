// The budget line at `prompt.submit`: the context left and the share of each rate-limit window used,
// as one line in the `context` of the prompt. A reading the login does not supply is left out of the line.

import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { BUDGET_LINE_MAX_CHARS } from "../../src/cuts.ts";
import { budgetLine } from "../../src/run-limits/budget.ts";

const ALL: Pick<SessionUsage, "context" | "rateLimits"> = {
	context: { tokens: 76_000, window: 200_000, percent: 38 },
	rateLimits: [
		{ kind: "five_hour", percentUsed: 23.5 },
		{ kind: "seven_day", percentUsed: 41 },
	],
};

const PROMPT = {
	text: "hi",
	wait: false,
	origin: { kind: "composer" },
} as const;

const lab = (on: On, usage: Pick<SessionUsage, "context" | "rateLimits">) => {
	on("prompt.submit", (_$, e) => e);
	on("session.usage", () => ({ value: { startedAt: 0, ...usage } }));
};

test("a prompt with all three readings carries one line naming all three", async ($: Engine, on: On) => {
	lab(on, ALL);

	const out = await $.prompt.submit(PROMPT);

	expect(out.context).toEqual([
		"Budget: context 62% left, five-hour 23.5% used, seven-day 41% used",
	]);
});

test("a login with no rate-limit windows gets the context alone", () => {
	const line = budgetLine({ ...ALL, rateLimits: [] });

	expect(line).toBe("Budget: context 62% left");
});

test("a reading the login does not supply is left out and not zeroed", () => {
	const line = budgetLine({
		context: { window: 200_000 },
		rateLimits: [{ kind: "seven_day", percentUsed: 0 }],
	});

	expect(line).toBe("Budget: seven-day 0% used");
});

test("no reading at all adds no line", async ($: Engine, on: On) => {
	lab(on, { context: { window: 200_000 }, rateLimits: [] });

	const out = await $.prompt.submit(PROMPT);

	expect(out.context ?? []).toEqual([]);
});

test("the line stays one short line however many windows the engine reports", () => {
	const line = budgetLine({
		...ALL,
		rateLimits: [...ALL.rateLimits, { kind: "spend_limit", percentUsed: 99 }],
	});

	expect(line?.includes("\n")).toBe(false);
	expect(line?.length).toBeLessThanOrEqual(80);
	expect(line).not.toContain("spend");
});

test("the widest line is the character cost recorded with the cuts", () => {
	const line = budgetLine({
		context: { window: 200_000, percent: 0 },
		rateLimits: [
			{ kind: "five_hour", percentUsed: 99.9 },
			{ kind: "seven_day", percentUsed: 99.9 },
		],
	});

	expect(line?.length).toBe(BUDGET_LINE_MAX_CHARS);
});
