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
import { checkIn, isOffered, offered, settle, untilGone } from "./testkit";

test(
	"an offer idle for two seconds sends its note with the typed message, clears, and is not offered again",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const band = await offered($, on, box, { env: ON });

		// Act
		await later(2200, () => send($, "hello there"));
		await untilGone(band, "Learn more");
		await checkIn($, "t2");

		// Assert
		expect(withNote(box)).toHaveLength(1);
		expect(JSON.stringify(withNote(box)[0]?.context)).toContain(LINE);
		expect(box.logs).toEqual(["Sent a note to Claude with your prompt"]);
		expect(box.forks).toBe(2);
		expect(await isOffered(band)).toBe(false);
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
	const band = await offered($, on, fresh());
	await band.press({ key: "Learn more" });
	await settle();

	// Act
	await typedTurns($, ["t2", "t3", "t4"]);

	// Assert
	expect(await band.find({ key: "Understood" })).toBeDefined();
});

test("a prompt from the bridge counts toward clearing the offer", async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh());

	// Act
	await typedTurns($, ["t2", "t3"], "bridge");

	// Assert
	expect(await isOffered(band)).toBe(false);
});

for (const value of ["true", " On "]) {
	test(`the switch set to "${value}" sends the note`, IDLE, async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, {
			env: { CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND: value }
		});

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(1);
	});
}

test("the switch set to 0 sends no note", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	await offered($, on, box, {
		env: { CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND: "0" }
	});

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

const DRIVEN: Record<string, string>[] = [
	{ CLAUDE_JOB_DIR: "/jobs/1" },
	{ CLAUDE_CODE_CHILD_SESSION: "1" },
	{ CLAUDECODE: "1", CLAUDE_CODE_SKIP_PROMPT_HISTORY: "1" }
];

for (const env of DRIVEN) {
	test(
		`a session started with ${Object.keys(env).join(" and ")} sends no note`,
		IDLE,
		async ($, on) => {
			// Arrange
			const box = fresh();
			await offered($, on, box, { env: { ...ON, ...env } });

			// Act
			await later(2200, () => send($, "hello there"));

			// Assert
			expect(withNote(box)).toHaveLength(0);
		}
	);
}

test(
	"a session with only CLAUDECODE set still sends the note",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, { env: { ...ON, CLAUDECODE: "1" } });

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(1);
	}
);
