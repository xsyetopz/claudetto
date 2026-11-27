import type { On } from "claude-code";
import { describe, expect, test } from "claude-code/testing";

import { inOrder } from "./order";

/** The engine beneath the hook: records the text and context each prompt entered with. */
const engine = (on: On) => {
	const entered: { text: string; context: readonly string[] }[] = [];
	on("prompt.submit", (_$, e) => {
		entered.push({ text: e.text, context: e.context ?? [] });
		return { text: e.text, ...(e.context ? { context: e.context } : {}) };
	});
	on("session.root", () => ({ value: "/repo" }));
	on("fs.exists", () => ({ value: false }));
	on("process.run", () => ({
		value: {
			exitCode: 127,
			stdout: "",
			stderr: "",
			isStdoutTruncated: false,
			isStderrTruncated: false
		}
	}));
	on("ui.log", () => ({ value: undefined }));
	return entered;
};

const TYPED = { kind: "composer" } as const;

/** A pasted run log of `n` lines with a few error lines among them. */
const log = (n: number): string =>
	Array.from({ length: n }, (_, i) =>
		i % 25 === 0
			? `E/flutter (1234): Unhandled Exception: step ${i} failed`
			: `I/flutter (1234): 2026-11-26 10:00:${String(i % 60).padStart(2, "0")} frame ${i} rendered`
	).join("\n");

/** Prose of `n` lines, none of them log-like. */
const prose = (n: number): string =>
	Array.from(
		{ length: n },
		(_, i) =>
			`Paragraph ${i}: please read the design notes and tell me what you think about the plan.`
	).join("\n");

describe("pasted log context", () => {
	test("a long pasted log goes through unchanged with a note to save it under TMPDIR and grep it", async ($, on) => {
		// Arrange
		const entered = engine(on);
		const text = `why does this fail?\n${log(200)}`;

		// Act
		const result = await $.prompt.submit({ text, origin: TYPED, wait: false });

		// Assert
		expect(result).not.toHaveProperty("drop");
		expect(entered).toHaveLength(1);
		expect(entered[0]?.text).toBe(text);
		expect(entered[0]?.context.join("\n")).toContain("$TMPDIR");
		expect(entered[0]?.context.join("\n")).toContain("grep");
	});

	test("a short log, a long prose prompt and a long code listing get no note", async ($, on) => {
		// Arrange
		const entered = engine(on);
		const texts = [
			log(10),
			prose(200),
			Array.from(
				{ length: 200 },
				(_, i) => `const value${i} = compute(${i});`
			).join("\n")
		];

		// Act
		await inOrder(texts, (text) =>
			$.prompt.submit({ text, origin: TYPED, wait: false })
		);

		// Assert
		expect(entered.map((e) => e.text)).toEqual(texts);
		expect(entered.map((e) => e.context)).toEqual([[], [], []]);
	});

	test("a prompt that already carries context keeps it beside the note", async ($, on) => {
		// Arrange
		const entered = engine(on);

		// Act
		await $.prompt.submit({
			text: log(200),
			context: ["earlier block"],
			origin: TYPED,
			wait: false
		});

		// Assert
		expect(entered[0]?.context[0]).toBe("earlier block");
		expect(entered[0]?.context).toHaveLength(2);
	});
});
