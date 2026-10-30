import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { budgetBand, budgetLine } from "../../src/blocks/run-limits/budget.ts";
import { BUDGET_LINE_MAX_CHARS } from "../../src/cuts.ts";

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

test("a second prompt inside the same band adds no line", async ($: Engine, on: On) => {
	lab(on, ALL);

	await $.prompt.submit(PROMPT);
	const second = await $.prompt.submit(PROMPT);

	expect(second.context ?? []).toEqual([]);
});

test("a prompt that crossed a band speaks again", async ($: Engine, on: On) => {
	let usage = ALL;
	on("prompt.submit", (_$, e) => e);
	on("session.usage", () => ({ value: { startedAt: 0, ...usage } }));

	await $.prompt.submit(PROMPT);
	usage = {
		...ALL,
		context: { tokens: 150_000, window: 200_000, percent: 75 },
	};
	const after = await $.prompt.submit(PROMPT);

	expect(after.context ?? []).toEqual([
		"Budget: context 25% left, five-hour 23.5% used, seven-day 41% used",
	]);
});

test("a reading that moved inside its own band is the same band", () => {
	const band = budgetBand(ALL);
	const moved = budgetBand({
		...ALL,
		context: { tokens: 78_000, window: 200_000, percent: 39 },
	});

	expect(moved).toBe(band);
});

test("a reading that crossed a step is another band", () => {
	const band = budgetBand(ALL);
	const crossed = budgetBand({
		...ALL,
		context: { tokens: 58_000, window: 200_000, percent: 29 },
	});

	expect(crossed).not.toBe(band);
});

test("a reading the login does not supply is one band and not a number", () => {
	const band = budgetBand({ context: { window: 200_000 }, rateLimits: [] });

	expect(band).toBe("-/-/-");
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
