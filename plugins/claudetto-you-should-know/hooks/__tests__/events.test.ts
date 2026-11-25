import type { Engine } from "claude-code/testing";
import { expect, test } from "claude-code/testing";

import {
	type Box,
	checkIn,
	freshBox,
	isOffered,
	MOUNT,
	offered,
	pause,
	settle,
	until
} from "./testkit";

const OFF_TEXT = "/plugin disable claudetto-you-should-know";

/** Presses Disable twice so the off view is up and the command sits in the prompt box. */
const armed = async (
	$: Engine,
	on: Parameters<typeof offered>[1],
	box: Box
) => {
	const band = await offered($, on, box);
	await band.press({ key: "Disable" });
	await pause();
	await band.press({ key: "Press again to disable" });
	await until(() => box.filled.length > 0, 50);
	await settle();
	return band;
};

test(
	"turning off fills the command, draws no offer and holds back the next check",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		const band = await armed($, on, box);

		// Act
		await checkIn($, "t2");

		// Assert
		expect(box.filled).toEqual([OFF_TEXT]);
		expect(await isOffered(band)).toBe(false);
		expect(box.forks).toBe(1);
	}
);

test("a typed disable lets the next check run", MOUNT, async ($, on) => {
	// Arrange
	const box = freshBox();
	await armed($, on, box);

	// Act
	await $.prompt.submit({
		text: OFF_TEXT,
		origin: { kind: "composer" },
		wait: false
	});
	await settle();
	await checkIn($, "t2");

	// Assert
	expect(box.forks).toBe(2);
});

test(
	"the next ordinary prompt lets the next check run after an unconfirmed off",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = freshBox();
		await armed($, on, box);

		// Act
		await $.prompt.submit({
			text: "something else",
			origin: { kind: "composer" },
			wait: false
		});
		await settle();
		await checkIn($, "t2");

		// Assert
		expect(box.forks).toBe(2);
	}
);

test(
	"a plugin command typed by the person lets the next check run",
	MOUNT,
	async ($, on) => {
		// Arrange
		on("command.run", () => ({}));
		const box = freshBox();
		await armed($, on, box);

		// Act
		await $.command.run({
			command: "plugin",
			args: "disable claudetto-you-should-know",
			origin: { kind: "composer" },
			presentation: { isFullscreen: false, columns: 80 }
		});
		await settle();
		await checkIn($, "t2");

		// Assert
		expect(box.forks).toBe(2);
	}
);

test(
	"ending the session lets the next check run after an open offer",
	MOUNT,
	async ($, on) => {
		// Arrange
		on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
		const box = freshBox();
		await offered($, on, box);
		await checkIn($, "t2");
		const whileOpen = box.forks;

		// Act
		await $.session.end({
			sessionId: "s1",
			reason: "other",
			resume: { id: "s1" }
		});
		await checkIn($, "t3");

		// Assert
		expect(whileOpen).toBe(1);
		expect(box.forks).toBe(2);
	}
);

test(
	"ending the session lets the next check run after an off view",
	MOUNT,
	async ($, on) => {
		// Arrange
		on("session.end", (_$, e) => ({ sessionId: e.sessionId }));
		const box = freshBox();
		await armed($, on, box);

		// Act
		await $.session.end({
			sessionId: "s1",
			reason: "other",
			resume: { id: "s1" }
		});
		await checkIn($, "t2");

		// Assert
		expect(box.forks).toBe(2);
	}
);
