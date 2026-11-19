import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import { type Box, offered, pause } from "./testkit";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

/** A prompt as the engine raises it, then the first step of the turn it starts. */
const typed = async ($: Engine, kind: "composer" | "bridge" | "sdk", turn: string): Promise<void> => {
	await $.prompt.submit({ text: "next thing", origin: { kind }, wait: false } as never);
	for await (const _chunk of $.turn.step({ turnId: turn, index: 0, model: "m", messageCount: 1 })) {
		// drained so the step completes
	}
	for (let i = 0; i < 10; i++) {
		await pause();
	}
};

test("an offer survives one typed prompt and clears on the second", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	await typed($, "composer", "t2");
	const afterOne = await band.find({ key: "Learn more" });
	await typed($, "composer", "t3");
	const afterTwo = await band.find({ key: "Learn more" });

	// Assert
	expect(afterOne).toBeDefined();
	expect(afterTwo).toBeUndefined();
});

test("a prompt from the SDK leaves the offer counters alone", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	await typed($, "sdk", "t2");
	await typed($, "sdk", "t3");
	const found = await band.find({ key: "Learn more" });

	// Assert
	expect(found).toBeDefined();
});
