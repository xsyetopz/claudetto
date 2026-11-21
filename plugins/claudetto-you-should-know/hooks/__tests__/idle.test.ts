import { expect, test } from "claude-code/testing";

import { fresh, IDLE, later, ON, send, withNote } from "./idling";
import { offered, settle } from "./testkit";

type Kept = Map<string, unknown>;

test(
	"a narrow terminal that cannot hold the five-label row starts no idle clock",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const props = {
			hasSurvey: false,
			isCollapsed: false,
			isWorking: false,
			maxRows: 1,
			bodyColumns: 100,
			scroll: { offset: 0, bodyRows: 20 },
			view: {}
		};
		await offered($, on, box, { env: ON, props });

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	}
);

for (const [name, patch] of [
	["a collapsed band", { isCollapsed: true }],
	["a survey", { hasSurvey: true }],
	["a scrolled view", { scroll: { offset: 3, bodyRows: 20 } }]
] as const) {
	test(`${name} starts no idle clock`, IDLE, async ($, on) => {
		// Arrange
		const box = fresh();
		const props = {
			hasSurvey: false,
			isCollapsed: false,
			isWorking: false,
			maxRows: 20,
			bodyColumns: 100,
			scroll: { offset: 0, bodyRows: 20 },
			view: {},
			...patch
		};
		await offered($, on, box, {
			env: ON,
			props,
			isOffer: !patch.hasSurvey && !patch.isCollapsed
		});

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	});
}

test("debug rows stop the idle clock", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const checks = [
		{
			number: 1,
			step: 6,
			outcome: "none",
			latencyMs: 1500,
			at: 1_700_000_000_000
		}
	];
	const kept: Kept = new Map([
		["sessions", [{ id: "s1", checked: 1, checks }]]
	]);
	await offered($, on, box, {
		kept,
		env: { ...ON, CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" }
	});

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test("an armed Disable stops the idle clock", IDLE, async ($, on) => {
	// Arrange
	const box = fresh();
	const band = await offered($, on, box, { env: ON });
	await band.press({ key: "Disable" });
	await settle();

	// Act
	await later(2200, () => send($, "hello there"));

	// Assert
	expect(withNote(box)).toHaveLength(0);
});

test(
	"time while the model works does not count as idle",
	IDLE,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const props = {
			hasSurvey: false,
			isCollapsed: false,
			isWorking: true,
			maxRows: 20,
			bodyColumns: 100,
			scroll: { offset: 0, bodyRows: 20 },
			view: {}
		};
		await offered($, on, box, { env: ON, props });

		// Act
		await later(2200, () => send($, "hello there"));

		// Assert
		expect(withNote(box)).toHaveLength(0);
	}
);
