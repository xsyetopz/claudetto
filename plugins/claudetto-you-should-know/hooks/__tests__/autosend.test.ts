import { expect, test } from "claude-code/testing";

import {
	fresh,
	IDLE,
	later,
	LINE,
	ON,
	send,
	typedTurns,
	withNote
} from "./idling";
import { offered, settle, viewKind } from "./testkit";

type Kept = Map<string, unknown>;
const view = viewKind;

test(
	"an offer idle for two seconds sends its note with the typed message and clears as known",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map();
		await offered($, on, box, { kept, env: ON });

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(1);
		expect(JSON.stringify(withNote(box)[0]?.context)).toContain(LINE);
		expect(box.logs).toEqual(["Sent a note to Claude with your prompt"]);
		expect(kept.get("known")).toEqual([LINE]);
		expect(view(kept)).toBeUndefined();
	}
);

test(
	"an offer idle for less than two seconds sends no note",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, { env: ON });

		// Act
		await later(1000, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	}
);

test("with the switch off no note is sent", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box);

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test(
	"a session driven by another program sends no note",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, {
			env: { ...ON, CLAUDE_CODE_SESSION_KIND: "bg" }
		});

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	}
);

test(
	"a lone digit counts as a button press and blocks the note for that offer",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, { env: ON });

		// Act
		await later(2200, async () => {
			await send($, "1");
			await send($, "hello there");
		});

		// Assert
		expect(withNote(box)).toHaveLength(0);
	}
);

test("a message from the bridge sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(2200, () => send($, "hello there", "bridge"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("the note goes once for one offer", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, { env: ON });

	// Act
	await later(2200, async () => {
		await send($, "first");
		await send($, "second");
	});

	// Assert
	expect(withNote(box)).toHaveLength(1);
});

test("an offer pressed away by a button sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box, { env: ON });
	await band.press({ key: "Learn more" });
	await settle();

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("an explained card survives any number of prompts", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const band = await offered($, on, fresh(), { kept });
	await band.press({ key: "Learn more" });
	await settle();

	// Act
	await typedTurns($, ["t2", "t3", "t4"]);

	// Assert
	expect(view(kept)).toBe("explained");
});

test("an offer cleared by the second typed prompt raises the ignored streak", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });

	// Act
	await typedTurns($, ["t2", "t3"]);

	// Assert
	expect(view(kept)).toBeUndefined();
	expect(kept.get("typedPastInARow")).toBe(1);
});

test("a prompt from the bridge counts toward clearing the offer", async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });

	// Act
	await typedTurns($, ["t2", "t3"], "bridge");

	// Assert
	expect(view(kept)).toBeUndefined();
});
