// The rule "background task" (spec `side-notes`): a task in flight for 30 minutes sets a note, timed from the first `Stop` that lists it.

import { BACKGROUND_MS } from "../limits.ts";
import type { Notes } from "./counters.ts";

/** One task of `background_tasks` of the `Stop` input. */
export interface Task {
	readonly id: string;
	readonly description: string;
	readonly command?: string;
}

/** The text that names a task in a note: its command, else its description. */
export const whatOf = (task: Task): string =>
	(task.command ?? task.description).trim().slice(0, 60);

/** The next state at `now`: a new task gets `now`, a gone task is dropped, and the first task in flight for `BACKGROUND_MS` and not told yet is marked told and returned as `late`. */
export const track = (
	state: Notes,
	tasks: readonly Task[],
	now: number,
): { state: Notes; late: Task | null; minutes: number } => {
	const seen: { [id: string]: { at: number; told: boolean } } = {};
	let late: Task | null = null;
	let minutes = 0;
	for (const task of tasks) {
		const before = state.seen[task.id] ?? { at: now, told: false };
		if (!(before.told || late) && now - before.at >= BACKGROUND_MS) {
			late = task;
			minutes = Math.floor((now - before.at) / 60_000);
		}
		seen[task.id] = { at: before.at, told: before.told || task === late };
	}
	return { state: { ...state, seen }, late, minutes };
};
