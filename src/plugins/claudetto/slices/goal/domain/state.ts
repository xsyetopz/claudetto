// The state of a goal (`.claudetto/goal.json`): the steps with their checks, the current step, the last result of each check, the counts, and the controls.
// A command module makes a goal with `createGoal` and changes it with plain object spreads. `parseGoal` reads it back.

import { STALL_DEFAULT } from "../limits.ts";

/** One check. `run` passes on exit 0, `file` on a file that exists (and holds `text`), and `judge` on a yes from a small model. */
export type Check =
  | { readonly kind: "run"; readonly command: string }
  | { readonly kind: "file"; readonly path: string; readonly text?: string }
  | { readonly kind: "judge"; readonly claim: string };

/** One step: a title for Claude, and the checks that must all pass. */
export type Step = {
  readonly title: string;
  readonly checks: readonly Check[];
};

/** The result of one check: pass or fail, the tail of its output, and the time in milliseconds since the epoch. */
export type Result = {
  readonly pass: boolean;
  readonly output: string;
  readonly at: number;
};

/** The controls. A field that is left out is no limit. `budget` is a cost in USD or a percent of the plan limit. */
export type Controls = {
  readonly maxTurns?: number;
  readonly budget?: { readonly usd?: number; readonly percent?: number };
  readonly until?: number;
  readonly stall: number;
};

export type Goal = Controls & {
  readonly steps: readonly Step[];
  /** The index of the current step. */
  readonly step: number;
  /** The results of the checks of the current step, in order. Empty before the first run. */
  readonly results: readonly Result[];
  readonly turns: number;
  /** The count of turns in a row with the same failing checks and output. */
  readonly stalled: number;
  /** The cost in USD that the goal spent, and the cost of the session at the last turn. A `/clear` restarts the cost of the session, and so `lastUsd` can be higher than the new cost. */
  readonly spentUsd: number;
  readonly lastUsd: number;
  /** The highest percent of a plan limit at the start or the last resume. A `--budget N%` counts the growth since then. A goal saved with no such field has 0. */
  readonly basePercent?: number;
  readonly paused: boolean;
  /** The moves between steps and the stop, with the time. */
  readonly log: readonly { readonly at: number; readonly note: string }[];
};

/** A new goal at step 0. */
export const createGoal = (
  steps: readonly Step[],
  controls: Partial<Controls> = {},
  lastUsd = 0,
  basePercent = 0,
): Goal => ({
  stall: STALL_DEFAULT,
  ...controls,
  steps,
  step: 0,
  results: [],
  turns: 0,
  stalled: 0,
  spentUsd: 0,
  lastUsd,
  basePercent,
  paused: false,
  log: [],
});

/** The goal in `text`, or `null` for no goal (`null`, an empty file, or text that is not a goal). */
export const parseGoal = (text: string): Goal | null => {
  try {
    const goal = JSON.parse(text) as Goal | null;
    return goal && Array.isArray(goal.steps) ? goal : null;
  } catch {
    return null;
  }
};
