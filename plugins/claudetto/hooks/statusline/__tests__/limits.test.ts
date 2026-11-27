import type { On, SessionRateLimit } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

const NOW = Date.UTC(2026, 10, 25, 12, 0, 0);
const RESET = new Date(NOW + 9_000_000).toISOString();

/** The engine beneath the hook: serves the windows `limits()` returns and records each prompt's context. */
const engine = (on: On, limits: () => SessionRateLimit[]) => {
	const contexts: string[] = [];
	on("session.usage", () => ({
		value: {
			startedAt: NOW,
			context: { window: 200_000, tokens: 1000, percent: 1 },
			rateLimits: limits()
		}
	}));
	on("clock.now", () => ({ value: NOW }));
	on("session.id", () => ({ value: "s1" }));
	on("env.get", () => ({ value: undefined }));
	on("fs.write", () => ({ value: undefined }));
	on("ui.log", () => ({ value: undefined }));
	on("prompt.submit", (_$, e) => {
		contexts.push((e.context ?? []).join("\n"));
		return { text: e.text };
	});
	return contexts;
};

const TURN = {
	text: "go on",
	origin: { kind: "composer" },
	wait: false
} as const;

const five = (percentUsed: number): SessionRateLimit => ({
	kind: "five_hour",
	percentUsed,
	resetsAt: RESET
});
const seven = (percentUsed: number): SessionRateLimit => ({
	kind: "seven_day",
	percentUsed,
	resetsAt: RESET
});

describe("usage limit note for the model", () => {
	test("crossing 85 percent adds one checkpoint line, and the next turns add none until the window drops and crosses again", async ($, on) => {
		// Arrange
		let current = [five(50), seven(10)];
		const contexts = engine(on, () => current);

		// Act
		await $.prompt.submit(TURN);
		current = [five(86), seven(10)];
		await $.prompt.submit(TURN);
		current = [five(90), seven(10)];
		await $.prompt.submit(TURN);
		current = [five(5), seven(10)];
		await $.prompt.submit(TURN);
		current = [five(88), seven(10)];
		await $.prompt.submit(TURN);

		// Assert
		expect(contexts[0]).toBe("");
		expect(contexts[1]).toContain("5-hour");
		expect(contexts[1]).toContain("86%");
		expect(contexts[1]).toMatch(/commit|handover/u);
		expect(contexts[2]).toBe("");
		expect(contexts[3]).toBe("");
		expect(contexts[4]).toContain("88%");
	});

	test("the 7-day window is named when it crosses, and a window below 85 percent adds nothing", async ($, on) => {
		// Arrange
		let current = [five(84.9), seven(60)];
		const contexts = engine(on, () => current);

		// Act
		await $.prompt.submit(TURN);
		current = [five(84.9), seven(85)];
		await $.prompt.submit(TURN);

		// Assert
		expect(contexts[0]).toBe("");
		expect(contexts[1]).toContain("7-day");
		expect(contexts[1]).not.toContain("5-hour");
	});
});
