/** The goal the session holds, as claudetto tracks it from `/goal` and the goal tools. */
export interface Goal {
	condition: string;
	/** Stop-hook blocks in the current turn; the engine ends the turn past its cap. */
	blocks: number;
}

/**
 * What claudetto knows of the session's goal. The engine keeps the real
 * record in `activeGoal` and offers a plugin no read of it, so this follows
 * every `/goal` run the plugin sees (the person's, and its own tools').
 */
export interface Tracker {
	/** The goal the Stop hook is judging, if one is set. */
	goal?: Goal;
	/** The condition `pause_goal` set aside, kept so `get_goal` can show it. */
	paused?: string;
	/** A Stop hook ran and no block has followed it yet; the turn's end then means the goal is met. */
	stopping?: boolean;
}

/** The block cap Claude Code uses when `CLAUDE_CODE_STOP_HOOK_BLOCK_CAP` is unset (2.1.330). */
export const DEFAULT_CAP = 8;

/** Blocks left before the cap that start the warning. */
const WARN_WINDOW = 2;

/**
 * The block cap as the environment value gives it. 0 disables the engine's
 * cap, so no warning is due; unset or unreadable falls back to the default.
 */
export const capOf = (value?: string): number => {
	if (value === undefined || value.trim() === "") {
		return DEFAULT_CAP;
	}
	const parsed = Math.trunc(Number(value));
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : DEFAULT_CAP;
};

/**
 * Whether the block that just landed is within WARN_WINDOW of the cap. The
 * engine overrides on block `cap + 1`, so block `cap - 1` leaves two more.
 */
export const isNearCap = (blocks: number, cap: number): boolean =>
	cap > 0 && blocks >= cap - WARN_WINDOW;

/** What the model reads beside a block that sits near the cap. */
export const capNote = (blocks: number, cap: number): string =>
	`claudetto: this goal has blocked the turn ${blocks} times in a row; the engine ends the turn after ${cap + 1}. ` +
	"Do not idle: finish the work, or call clear_goal with the checks you ran if the condition is met, or call pause_goal.";

/** Sets a fresh goal: the block count starts at zero and a pause is over. */
export const setGoal = (tracker: Tracker, condition: string): void => {
	tracker.goal = { condition, blocks: 0 };
	delete tracker.paused;
};

/** Ends the tracked goal; `pause` keeps its condition for `get_goal`. */
export const endGoal = (tracker: Tracker, pause: boolean): void => {
	if (pause && tracker.goal !== undefined) {
		tracker.paused = tracker.goal.condition;
	}
	delete tracker.goal;
};
