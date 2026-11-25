import { expect, test } from "claude-code/testing";

import {
	type Box,
	completeTurn,
	MOUNT,
	offered,
	REPLY,
	settle,
	USAGE,
	viewKind
} from "./testkit";

type On = Parameters<typeof offered>[1];
type Kept = Map<string, unknown>;

const KEY = { TYPESAFE_API_KEY: "synthetic-test-key" };

const jev = (noul: number) => ({
	value: {
		status: 200,
		ok: true,
		headers: {},
		text: JSON.stringify({
			answers: { note_no_longer_holds: { type: "noul", noul } }
		})
	}
});

const jevDown = () => ({
	value: { status: 503, ok: false, headers: {}, text: "" }
});

const haiku = (rating: number) => ({
	value: {
		isAnswered: true as const,
		text: `{"note_no_longer_holds": ${rating}}`,
		usage: USAGE
	}
});

const failed = () => ({
	value: {
		isAnswered: false as const,
		reason: "api-error" as const,
		status: 500,
		error: "server_error" as const,
		usage: USAGE
	}
});

/** Counts the calls to each service; the fork answers the check, never the recheck. */
const wire = (
	on: On,
	jevReply: () => ReturnType<typeof jev>,
	fallback: () => ReturnType<typeof haiku> | ReturnType<typeof failed>
) => {
	const calls = { jev: 0, fallback: 0 };
	on("http.fetch", () => {
		calls.jev++;
		return jevReply();
	});
	on("model.complete", () => {
		calls.fallback++;
		return fallback();
	});
	return calls;
};

const shown = async (
	$: Parameters<typeof offered>[0],
	on: On,
	kept: Kept
): Promise<Box> => {
	const box: Box = { text: "", filled: [], toasts: [], forks: 0 };
	await offered($, on, box, { kept, env: KEY, replies: [REPLY, "KEEP"] });
	return box;
};

test(
	"Jev rating the note untrue withdraws it, with no fork or fallback",
	MOUNT,
	async ($, on) => {
		// Arrange
		const kept: Kept = new Map();
		const calls = wire(
			on,
			() => jev(0.95),
			() => haiku(0)
		);
		const box = await shown($, on, kept);

		// Act
		await completeTurn($, "t1");
		await settle();

		// Assert
		expect(calls).toEqual({ jev: 1, fallback: 0 });
		expect(box.forks).toBe(1);
		expect(viewKind(kept)).toBeUndefined();
	}
);

test("Jev rating the note true keeps it", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const calls = wire(
		on,
		() => jev(0.1),
		() => haiku(1)
	);
	await shown($, on, kept);

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(calls.fallback).toBe(0);
	expect(viewKind(kept)).toBe("offer");
});

test("an unsettled Jev rating keeps the note", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	wire(
		on,
		() => jev(0.5),
		() => haiku(1)
	);
	await shown($, on, kept);

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(viewKind(kept)).toBe("offer");
});

test(
	"Jev down routes to the fallback, whose rating decides",
	MOUNT,
	async ($, on) => {
		// Arrange
		const kept: Kept = new Map();
		const calls = wire(on, jevDown, () => haiku(0.9));
		await shown($, on, kept);

		// Act
		await completeTurn($, "t1");
		await settle();

		// Assert
		expect(calls).toEqual({ jev: 1, fallback: 1 });
		expect(viewKind(kept)).toBeUndefined();
	}
);

test("both services down keeps the note (fail open)", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const calls = wire(on, jevDown, failed);
	const box = await shown($, on, kept);

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(calls).toEqual({ jev: 1, fallback: 1 });
	expect(viewKind(kept)).toBe("offer");
	expect(box.logs?.some((line) => line.includes("recheck fallback call"))).toBe(
		true
	);
});
