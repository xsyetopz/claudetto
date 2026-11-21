import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import {
	type Box,
	MOUNT,
	offered,
	type PromptKind,
	settle,
	stepTurn,
	submitTyped
} from "./testkit";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

/** A prompt as the engine raises it, then the first step of the turn it starts. */
const typed = async (
	$: Engine,
	kind: PromptKind,
	turn: string
): Promise<void> => {
	await submitTyped($, "next thing", kind);
	await stepTurn($, turn, 0);
	await settle();
};

test(
	"an offer survives one typed prompt and clears on the second",
	MOUNT,
	async ($, on) => {
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
	}
);

test(
	"a prompt from the SDK leaves the offer counters alone",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());

		// Act
		await typed($, "sdk", "t2");
		await typed($, "sdk", "t3");
		const found = await band.find({ key: "Learn more" });

		// Assert
		expect(found).toBeDefined();
	}
);
