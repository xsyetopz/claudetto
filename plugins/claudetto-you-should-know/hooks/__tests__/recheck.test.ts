import { expect, test } from "claude-code/testing";

import {
	type Box,
	completeTurn,
	MOUNT,
	offered,
	REPLY,
	settle,
	stepTurn,
	viewKind
} from "./testkit";

type Kept = Map<string, unknown>;
type Opts = NonNullable<Parameters<typeof offered>[3]>;

const fresh = (): Box => ({ text: "", filled: [], toasts: [], forks: 0 });

/** Shows an offer in turn t1; the first fork answers the check, later ones the recheck. */
const shown = async (
	$: Parameters<typeof offered>[0],
	on: Parameters<typeof offered>[1],
	opts: Opts & { readonly kept: Kept }
): Promise<Box> => {
	const box = fresh();
	await offered($, on, box, opts);
	return box;
};

test(
	"an offer later made untrue is cleared when the turn ends",
	MOUNT,
	async ($, on) => {
		// Arrange
		const kept: Kept = new Map();
		const box = await shown($, on, { kept, replies: [REPLY, "DROP"] });

		// Act
		await completeTurn($, "t1");
		await settle();

		// Assert
		expect(box.forks).toBe(2);
		expect(viewKind(kept)).toBeUndefined();
	}
);

test("a DROP at a later check step clears the offer", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await shown($, on, { kept, replies: [REPLY, "DROP"] });

	// Act
	await stepTurn($, "t1", 12);
	await settle();

	// Assert
	expect(viewKind(kept)).toBeUndefined();
});

test("a KEEP leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const box = await shown($, on, { kept, replies: [REPLY, "KEEP"] });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(2);
	expect(viewKind(kept)).toBe("offer");
});

test("an unparseable answer leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await shown($, on, { kept, replies: [REPLY, "I would drop it."] });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(viewKind(kept)).toBe("offer");
});

test("a failing fork leaves the offer up", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const box = await shown($, on, { kept, faults: true });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(viewKind(kept)).toBe("offer");
	expect(box.logs?.some((line) => line.includes("recheck failed"))).toBe(true);
});

test("an explained view is not touched", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const box = await shown($, on, { kept, replies: [REPLY, "DROP"] });
	kept.set("sessions", [
		{
			id: "s1",
			offeredTurn: "t1",
			view: {
				kind: "explained",
				line: "Tests run in order.",
				text: "t",
				shownAt: 1
			}
		}
	]);

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
	expect(viewKind(kept)).toBe("explained");
});

test("a subagent's turn end does nothing", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const box = await shown($, on, { kept, replies: [REPLY, "DROP"] });

	// Act
	await completeTurn($, "t1", "agent-1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
	expect(viewKind(kept)).toBe("offer");
});

test("no recheck runs when no offer is up", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	const box = await shown($, on, { kept, replies: ["none"], isOffer: false });

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(box.forks).toBe(1);
});

test("a debug run logs the withdrawal", MOUNT, async ($, on) => {
	// Arrange
	const kept: Kept = new Map();
	await shown($, on, {
		kept,
		replies: [REPLY, "DROP"],
		env: { CLAUDE_CODE_YOU_SHOULD_KNOW_DEBUG: "1" }
	});

	// Act
	await completeTurn($, "t1");
	await settle();

	// Assert
	expect(JSON.stringify(kept.get("sessions"))).toContain("withdrawn");
});
