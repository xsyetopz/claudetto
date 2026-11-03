// When a driver types the next prompt: only after the last one's turn has run, since a skill's own commands run before its spinner shows.

import type { ScreenState } from "./screen.ts";

/** Idle reads in a row before the next prompt, since the screen can show no spinner for a moment between two steps. */
const IDLE_READS = 3;

/** Idle reads after which a turn counts as done though no read saw it busy, as a turn shorter than a read does. */
const UNSEEN_TURN_READS = 30;

export type Action = "enter" | "down" | "escape" | "wait" | "type" | "finished";

export interface Turns {
	sent: number;
	idle: number;
	/** Whether the last prompt's turn has shown its spinner; nothing is pending before the first prompt. */
	busySeen: boolean;
}

export const newTurns = (): Turns => ({ sent: 0, idle: 0, busySeen: true });

const KEYS: Partial<Record<ScreenState, Action>> = {
	trust: "enter",
	"trust-move": "down",
	asking: "escape",
};

/** What to do about one read of the screen, given `prompts` to send in all; updates `turns`. */
export const nextAction = (
	state: ScreenState,
	turns: Turns,
	prompts: number,
): Action => {
	if (state !== "idle") {
		turns.idle = 0;
		turns.busySeen ||= state === "busy";
		return KEYS[state] ?? "wait";
	}
	turns.idle += 1;
	const done =
		(turns.busySeen && turns.idle >= IDLE_READS) ||
		turns.idle >= UNSEEN_TURN_READS;
	if (!done) {
		return "wait";
	}
	if (turns.sent >= prompts) {
		return "finished";
	}
	turns.sent += 1;
	turns.idle = 0;
	turns.busySeen = false;
	return "type";
};
