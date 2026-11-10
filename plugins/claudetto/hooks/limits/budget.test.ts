import type { On, SessionUsage } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

import { budgetBand, budgetLine } from "./budget.ts";

type Reading = Pick<SessionUsage, "context" | "rateLimits">;

const ALL: Reading = {
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

/** The context lines a submit added, none when it added no field. */
const added = (out: {
	context?: readonly string[] | undefined;
}): readonly string[] => out.context ?? [];

const lab = (on: On, reading: () => Reading) => {
	on("prompt.submit", (_$, e) => e);
	on("session.cwd", () => ({ value: "/repo" }));
	on("session.messages", () => ({ value: [] }));
	on("model.complete", () => ({
		value: {
			isAnswered: true,
			text: "NO",
			usage: {
				input_tokens: 1,
				output_tokens: 1,
				cache_read_input_tokens: 0,
				cache_creation_input_tokens: 0,
			},
		},
	}));
	on("session.usage", () => ({ value: { startedAt: 0, ...reading() } }));
};

test("a prompt carries one line naming the three readings", async ($: Engine, on: On) => {
	lab(on, () => ALL);

	const out = await $.prompt.submit(PROMPT);

	expect(out.context).toEqual([
		"Budget: context 62% left, five-hour 23.5% used, seven-day 41% used",
	]);
});

test("a login with no rate-limit windows gets the context alone", async ($: Engine, on: On) => {
	lab(on, () => ({ ...ALL, rateLimits: [] }));

	const out = await $.prompt.submit(PROMPT);

	expect(out.context).toEqual(["Budget: context 62% left"]);
});

test("an unchanged band adds nothing to the next prompt, and a changed band adds the line again", async ($: Engine, on: On) => {
	let reading = ALL;
	lab(on, () => reading);
	await $.prompt.submit(PROMPT);

	const same = await $.prompt.submit(PROMPT);
	reading = {
		...ALL,
		context: { tokens: 150_000, window: 200_000, percent: 75 },
	};
	const moved = await $.prompt.submit(PROMPT);

	expect(added(same)).toEqual([]);
	expect(moved.context?.[0]).toContain("context 25% left");
});

test("a reading the login does not supply is left out and not zeroed", () => {
	const line = budgetLine({
		context: { window: 200_000 },
		rateLimits: [{ kind: "seven_day", percentUsed: 0 }],
	});

	expect(line).toBe("Budget: seven-day 0% used");
});

test("no reading at all adds no line", async ($: Engine, on: On) => {
	lab(on, () => ({ context: { window: 200_000 }, rateLimits: [] }));

	const out = await $.prompt.submit(PROMPT);

	expect(added(out)).toEqual([]);
});

test("the line stays one short line however many windows the engine reports", () => {
	const line = budgetLine({
		...ALL,
		rateLimits: [...ALL.rateLimits, { kind: "spend_limit", percentUsed: 99 }],
	});

	expect(line?.includes("\n")).toBe(false);
	expect(line).not.toContain("spend");
});

test("the widest line is 69 characters", () => {
	const line = budgetLine({
		context: { window: 200_000, percent: 0 },
		rateLimits: [
			{ kind: "five_hour", percentUsed: 99.9 },
			{ kind: "seven_day", percentUsed: 99.9 },
		],
	});

	expect(line?.length).toBe(69);
});

test("a reading that moved inside its own band is the same band", () => {
	const moved = {
		...ALL,
		context: { tokens: 78_000, window: 200_000, percent: 39 },
	};

	expect(budgetBand(moved)).toBe(budgetBand(ALL));
});

test("a reading that crossed a step is another band", () => {
	const crossed = {
		...ALL,
		context: { tokens: 58_000, window: 200_000, percent: 29 },
	};

	expect(budgetBand(crossed)).not.toBe(budgetBand(ALL));
});

test("a reading the login does not supply is one band and not a number", () => {
	expect(budgetBand({ context: { window: 200_000 }, rateLimits: [] })).toBe(
		"-/-/-",
	);
});

test("a seven-day share of 90% or more adds the share as a fact and no instruction", async ($: Engine, on: On) => {
	lab(on, () => ({
		...ALL,
		rateLimits: [{ kind: "seven_day", percentUsed: 92 }],
	}));

	const out = await $.prompt.submit(PROMPT);

	expect(out.context).toEqual(["Budget: context 62% left, seven-day 92% used"]);
});

test("a seven-day share that rose inside its band of ten stays silent, and one that crossed the band speaks again", async ($: Engine, on: On) => {
	let share = 90;
	lab(on, () => ({
		...ALL,
		rateLimits: [{ kind: "seven_day", percentUsed: share }],
	}));
	await $.prompt.submit(PROMPT);
	share = 92;
	const inside = await $.prompt.submit(PROMPT);
	share = 100;
	const crossed = await $.prompt.submit(PROMPT);

	expect(added(inside)).toEqual([]);
	expect(crossed.context?.[0]).toContain("seven-day 100% used");
});
