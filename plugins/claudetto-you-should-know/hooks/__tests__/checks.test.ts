import type { RenderSurface } from "claude-code";
import { expect, test } from "claude-code/testing";

import {
	type Box,
	completeTurn,
	gate,
	inOrder,
	MOUNT,
	offered,
	PLUGIN,
	PROPS,
	REPLY,
	settle,
	stepTurn,
	textOf,
	untilShown
} from "./testkit";

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

const step = async (
	$: Parameters<typeof offered>[0],
	index: number
): Promise<void> => {
	await stepTurn($, "t2", index);
	await settle();
};

test(
	"a Heads up tag leads the row with the star, the tag and a middle dot",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), {
			replies: ["learn: Disk is nearly full.\ntag: Heads up"]
		});

		// Act
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("✦");
		expect(drawn).toContain("Heads up");
		expect(drawn).toContain(" · ");
		expect(drawn).not.toContain("You should know");
	}
);

test(
	"a check issues one fork that carries only a prompt",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();

		// Act
		await offered($, on, box);

		// Assert
		expect(box.forks).toBe(1);
		expect(Object.keys(box.args?.[0] ?? {})).toEqual(["prompt"]);
	}
);

test(
	"a second check does not start while one is in flight",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const { hold, release } = gate();
		await offered($, on, box, { hold, isOffer: false });

		// Act
		await step($, 12);
		const whileHeld = box.forks;
		release();
		await settle();

		// Assert
		expect(whileHeld).toBe(1);
	}
);

test(
	"the band shows the offer while it is open and nothing once Knew this already clears it",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh());
		const open = await band.find({ key: "Learn more" });

		// Act
		await band.press({ key: "Knew this already" });
		await settle();

		// Assert
		expect(open).toBeDefined();
		expect(await band.find({ key: "Learn more" })).toBeUndefined();
	}
);

test(
	"a surface that detached no longer counts as drawing the band",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const surfaces: RenderSurface[] = ["desktop"];
		on("session.detach", (_$, e) => ({ ...e }));
		const band = await offered($, on, box, { surface: "desktop", surfaces });
		await band.press({ key: "Knew this already" });
		await settle();
		surfaces.splice(0, surfaces.length, "vscode");

		// Act
		await $.session.detach({
			surface: "desktop",
			clientId: "c1",
			reason: "detach"
		});
		surfaces.splice(0, surfaces.length, "desktop");
		await step($, 12);

		// Assert
		expect(box.forks).toBe(1);
	}
);

test(
	"a surface that is still reported keeps drawing the band after a detach elsewhere",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const surfaces: RenderSurface[] = ["desktop"];
		on("session.detach", (_$, e) => ({ ...e }));
		const band = await offered($, on, box, {
			surface: "desktop",
			surfaces,
			replies: [`learn: One.`, `learn: Two.`]
		});
		await band.press({ key: "Knew this already" });
		await settle();

		// Act
		await $.session.detach({
			surface: "vscode",
			clientId: "c1",
			reason: "detach"
		});
		await step($, 12);

		// Assert
		expect(box.forks).toBe(2);
	}
);

const runTurn = async (
	$: Parameters<typeof offered>[0],
	last: number
): Promise<void> => {
	await inOrder(
		Array.from({ length: last }, (_, i) => i + 1),
		(index) => step($, index)
	);
	await completeTurn($, "t2");
	await settle();
};

test(
	"a turn that runs past its last check step gets one check when it ends",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		const band = await offered($, on, box, {
			replies: ["learn: none", "learn: none", REPLY],
			isOffer: false
		});

		// Act
		await runTurn($, 5);
		await untilShown(band, "Learn more");

		// Assert
		expect(box.forks).toBe(3);
		expect(await band.find({ key: "Learn more" })).toBeDefined();
	}
);

test(
	"a turn that ends on a check step gets no check at its end",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, { replies: ["learn: none"], isOffer: false });

		// Act
		await runTurn($, 6);

		// Assert
		expect(box.forks).toBe(3);
	}
);

test(
	"a turn shorter than the first check step gets no check at its end",
	MOUNT,
	async ($, on) => {
		// Arrange
		const box = fresh();
		await offered($, on, box, { replies: ["learn: none"], isOffer: false });

		// Act
		await runTurn($, 2);

		// Assert
		expect(box.forks).toBe(1);
	}
);

const DEBUG = { CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" };
const NONE_THEN_OFFER = ["learn: none", REPLY];

test(
	"with debug on, each finished check draws a row above the note",
	MOUNT,
	async ($, on) => {
		// Arrange
		const band = await offered($, on, fresh(), {
			env: DEBUG,
			replies: NONE_THEN_OFFER,
			isOffer: false
		});
		await step($, 6);

		// Act
		await untilShown(band, "Learn more");
		const drawn = await textOf(band);

		// Assert
		expect(drawn).toContain("debug · check 1");
		expect(drawn).toContain("debug · check 2");
		expect(drawn).toContain("shown");
	}
);

test("with debug off no check row draws", MOUNT, async ($, on) => {
	// Arrange
	const band = await offered($, on, fresh(), { replies: NONE_THEN_OFFER });

	// Act
	const drawn = await textOf(band);

	// Assert
	expect(drawn).not.toContain("debug · check");
});

test(
	"with debug on and a survey up, no check row draws",
	MOUNT,
	async ($, on) => {
		// Arrange
		await offered($, on, fresh(), { env: DEBUG });
		const survey = await $.ui.mount({
			plugin: PLUGIN,
			surface: "terminal",
			component: "AbovePrompt",
			props: { ...PROPS, hasSurvey: true }
		});

		// Act
		const drawn = await textOf(survey);

		// Assert
		expect(drawn).not.toContain("debug · check");
	}
);
