// Lab tests of the size warning of `prompt` (task 19.8): a prompt over the bound gets one `additionalContext` line that holds its size.
// The stubs answer the engine beneath the plugin, and no model runs.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { stubState } from "./stubs/process.ts";

const stub = (on: On): void => {
	stubState(on, new Map<string, unknown>());
	on("classic.UserPromptSubmit", () => ({}));
};

test("Prompt Over the Bound", async ($: Engine, on: On) => {
	stub(on);
	const size = 50_000;
	const lines =
		(await $.classic.UserPromptSubmit({ prompt: "x".repeat(size) }))
			.additionalContext ?? [];
	expect(lines.length).toBe(1);
	expect(lines[0]).toContain(String(size));
	expect(lines[0]?.split("\n").length).toBe(1);
});

test("Prompt Under the Bound", async ($: Engine, on: On) => {
	stub(on);
	const lines =
		(await $.classic.UserPromptSubmit({ prompt: "x".repeat(1000) }))
			.additionalContext ?? [];
	expect(lines).toStrictEqual([]);
});
