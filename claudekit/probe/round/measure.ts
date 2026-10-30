// The measures of one fork, from the events of its steps. A fork is one `claude -p` step that finishes the tasks
// after the base, so the compaction happens inside it at the threshold of its arm.

import { LAST_TASK, SOURCES } from "../fixture/fixture.ts";
import {
	afterCompaction,
	type Base,
	boundaries,
	calls,
	last,
	peak,
	problem,
	readShare,
	type Step,
} from "../transport/events.ts";
import type { Arm, Result } from "./result.ts";

/** The line of `tasks.md` that is ticked when the fork has done every task. */
const LAST_TICKED = `[x] ${LAST_TASK}`;

const isSource = (file: string): boolean =>
	SOURCES.some((s) => file.endsWith(`/${s}`));

/**
 * The reads of a file that was already read, by the base or earlier in the fork itself. Counting only
 * against the base's reads misses the case this probe is built to see: a fork reads the notes reserved
 * for it, loses them to a compaction, and goes back for them. Those files are not in the base's set.
 */
const rereadsOf = (
	done: readonly [string, string][],
	read: ReadonlySet<string>,
): number => {
	const seen = new Set(read);
	let total = 0;
	for (const [name, file] of done) {
		if (name !== "Read") {
			continue;
		}
		if (seen.has(file)) {
			total += 1;
		}
		seen.add(file);
	}
	return total;
};

/** The `Result` of one fork. Its `cost` is the spend above `base.cost`, a figure the events do not hold reads `NaN`, and `invalid` names why a fork cannot count. */
export const measure = (
	arm: Arm,
	size: number,
	run: number,
	steps: Step[],
	base: Base,
	found: { broken: number; untested: number; skipped: number },
	tasksText: string,
): Result => {
	const events = steps.flatMap((s) => s.events);
	const done = calls(events);
	const after = afterCompaction(events);
	const fired = boundaries(events);
	const first = fired[0];
	return {
		arm,
		size,
		run,
		...found,
		cost: (last(events).total_cost_usd ?? Number.NaN) - base.cost,
		turns: last(events).num_turns ?? Number.NaN,
		compactions: fired.length,
		peak: peak(events),
		firstPre: first?.pre_tokens ?? Number.NaN,
		firstPost: first?.post_tokens ?? Number.NaN,
		rereads: rereadsOf(done, base.read),
		redone: done.filter(
			([n, f]) => n !== "Read" && base.edited.has(f) && isSource(f),
		).length,
		next: Number(tasksText.includes(LAST_TICKED)),
		firstWrite: after[0]?.cache_creation_input_tokens ?? Number.NaN,
		shares: after.slice(1, 3).map((u) => readShare([u])),
		invalid:
			problem(steps, base.cost) ?? (steps.length === 0 ? "no step ran" : null),
	};
};
