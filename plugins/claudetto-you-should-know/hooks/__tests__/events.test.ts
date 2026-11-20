import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import {
	type Box,
	MOUNT,
	offered,
	pause,
	settle,
	until,
	viewKind
} from "./testkit";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });
const OFF_TEXT = "/plugin disable claudetto-you-should-know";

type Kept = Map<string, unknown>;

const view = viewKind;

/** Presses Disable twice so the off view is up and the command sits in the prompt box. */
const armed = async (
	$: Engine,
	on: Parameters<typeof offered>[1],
	box: Box,
	kept: Kept
) => {
	const band = await offered($, on, box, { kept });
	await band.press({ key: "Disable" });
	await pause();
	await band.press({ key: "Press again to disable" });
	await until(() => box.filled.length > 0, 50);
	await settle();
	return band;
};

test(
	"turning off fills the command and shows the off view",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map();

		// Act
		await armed($, on, box, kept);

		// Assert
		expect(box.filled).toEqual([OFF_TEXT]);
		expect(view(kept)).toBe("off");
	}
);

test("a typed disable takes the off view down", MOUNT, async ($, on) => {
	// Arrange
	const box = fresh();
	const kept: Kept = new Map();
	await armed($, on, box, kept);

	// Act
	await $.prompt.submit({
		text: OFF_TEXT,
		origin: { kind: "composer" },
		wait: false
	});
	await settle();

	// Assert
	expect(view(kept)).toBeUndefined();
});

test(
	"the next ordinary prompt takes an unconfirmed off view down too",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const kept: Kept = new Map();
		await armed($, on, box, kept);

		// Act
		await $.prompt.submit({
			text: "something else",
			origin: { kind: "composer" },
			wait: false
		});
		await settle();

		// Assert
		expect(view(kept)).toBeUndefined();
	}
);

test(
	"a plugin command typed by the person takes the off view down",
	MOUNT,
	async ($, on) => {
		// Arrange
		on("command.run", () => ({}));
		const box = fresh();
		const kept: Kept = new Map();
		await armed($, on, box, kept);

		// Act
		await $.command.run({
			command: "plugin",
			args: "disable claudetto-you-should-know",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});
		await settle();

		// Assert
		expect(view(kept)).toBeUndefined();
	}
);

test("ending the session clears an open offer", MOUNT, async ($, on) => {
	// Arrange
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	const kept: Kept = new Map();
	await offered($, on, fresh(), { kept });
	const before = view(kept);

	// Act
	await $.session.end({
		sessionId: "s1",
		reason: "other",
		resume: { id: "s1" }
	});

	// Assert
	expect(before).toBe("offer");
	expect(view(kept)).toBeUndefined();
});

test("ending the session clears an off view", MOUNT, async ($, on) => {
	// Arrange
	on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
	const kept: Kept = new Map();
	await armed($, on, fresh(), kept);

	// Act
	await $.session.end({
		sessionId: "s1",
		reason: "other",
		resume: { id: "s1" }
	});

	// Assert
	expect(view(kept)).toBeUndefined();
});
