/** Fixtures for the tests that drive the plugin's idle clock and its typed-prompt counting. */

import type { Engine } from "claude-code/testing";

import {
	type Box,
	delay,
	inOrder,
	type PromptKind,
	settle,
	stepTurn,
	submitTyped
} from "./testkit";

export const LINE = "Tests run in order.";
export const ON = { CLAUDE_CODE_YOU_SHOULD_KNOW_AUTO_SEND: "1" };
export const fresh = (): Box => ({
	text: "",
	filled: [],
	toasts: [],
	forks: 0
});

/**
 * Waits `ms` of real time: the plugin counts idle time on its own clock, which a test cannot move.
 */
export const later = async (
	ms: number,
	fn: () => Promise<void>
): Promise<void> => {
	await delay(ms);
	await fn();
};

/** Each idle-clock test waits 2.2 s of real time after an offer that takes about 2 s to set up, close to the kit's 5 s default. */
export const IDLE = { timeoutMs: 15_000 };

export const send = async (
	$: Engine,
	text: string,
	kind: PromptKind = "composer"
): Promise<void> => {
	await submitTyped($, text, kind);
	await settle();
};

/** Types a prompt and runs the first step of each turn in `turns`, one after another. */
export const typedTurns = (
	$: Engine,
	turns: readonly string[],
	kind: PromptKind = "composer"
): Promise<void> =>
	inOrder(turns, async (turn) => {
		await send($, "next thing", kind);
		await stepTurn($, turn, 0);
		await settle();
	});

export const withNote = (box: Box) =>
	box.sent?.filter((s) => Array.isArray(s.context) && s.context.length > 0) ??
	[];
