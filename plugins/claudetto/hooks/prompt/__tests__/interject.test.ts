import type { On } from "claude-code";
import { describe, expect, test, type TestBody } from "claude-code/testing";

import { fieldOf } from "../../shared/field";

/** The engine beneath the plugin: a turn, a prompt queue and a Bash tool that answers "ok". */
const engine = (on: On): void => {
	on("turn.start", (_$, e) => ({ turnId: e.turnId }));
	on("prompt.submit", (_$, e) => ({ text: e.text }));
	on("tool.check", () => ({ decision: "allow" }));
	on("tool.call", { tool: "Bash" }, () => ({ result: "ok" }));
	on("env.get", () => ({ value: undefined }));
	on("session.usage", () => ({
		value: {
			startedAt: 0,
			context: { window: 200_000, tokens: 1 },
			rateLimits: []
		}
	}));
	on("ui.log", () => ({ value: undefined }));
};

const typed = (turnId?: string, wait = false) => ({
	text: "stop, use the other parser",
	origin: { kind: "composer" as const },
	wait,
	...(turnId === undefined ? {} : { turnId })
});

/** Whether a main-loop Bash call was refused: its refusal text, or undefined when it ran. */
const bash = async ($: Parameters<TestBody>[0]) =>
	fieldOf(await $.tool.call({ tool: "Bash", command: "ls" }), "deny");

describe("message typed into a running turn", () => {
	test("INTERJECT-001 the next main-loop call after a message typed mid-turn is held once for the reply", async ($, on) => {
		// Arrange
		engine(on);
		await $.turn.start({ text: "build it", turnId: "t1" });
		await $.prompt.submit(typed("t1"));

		// Act
		const first = await bash($);
		const second = await bash($);

		// Assert
		expect(typeof first).toBe("string");
		expect(second).toBeUndefined();
	});

	test("INTERJECT-001 a queued message or one typed while idle holds no call", async ($, on) => {
		// Arrange
		engine(on);
		await $.turn.start({ text: "build it", turnId: "t1" });
		await $.prompt.submit(typed("t1", true));
		await $.prompt.submit(typed());

		// Act
		const denied = await bash($);

		// Assert
		expect(denied).toBeUndefined();
	});
});
