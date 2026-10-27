// The measures of one fork, from the events of its steps.

import type { Arm, Result } from "./bar.ts";
import {
	type Base,
	calls,
	last,
	problem,
	readShare,
	requests,
	type Step,
} from "./events.ts";
import { SOURCES } from "./fixture.ts";
import { hopsOf } from "./plan.ts";

const isSource = (file: string): boolean =>
	SOURCES.some((s) => file.endsWith(`/${s}`));

/** The measures of one fork from its steps (`/compact` and the 2 follow-ups, or for H the resume turn and 1 follow-up). */
export const measure = (
	arm: Arm,
	size: number,
	steps: Step[],
	base: Base,
	found: { broken: number; untested: number },
	tasksText: string,
): Result => {
	const want = hopsOf(arm).length + 1;
	const total = (i: number) =>
		last(steps[i]?.events ?? []).total_cost_usd ?? Number.NaN;
	const hops = steps.slice(1);
	// The turns after the compaction. H has none, so its resume turn is the first of them.
	const after = arm === "H" ? steps : hops;
	const done = after.flatMap((s) => calls(s.events));
	const first = requests(after[0]?.events ?? [])[0];
	const post = steps[0]?.events.find((e) => e.compact_metadata)
		?.compact_metadata?.post_tokens;
	return {
		arm,
		size,
		...found,
		cost: total(steps.length - 1) - base.cost,
		rereads: done.filter(([n, f]) => n === "Read" && base.read.has(f)).length,
		redone: done.filter(
			([n, f]) => n !== "Read" && base.edited.has(f) && isSource(f),
		).length,
		next: Number(tasksText.includes("[x] 1.4")),
		firstWrite: first?.cache_creation_input_tokens ?? Number.NaN,
		shares: hops.map((h) => readShare(requests(h.events))),
		compactCost: total(0) - base.cost,
		compactMs: last(steps[0]?.events ?? []).duration_ms ?? Number.NaN,
		context:
			post ??
			(first
				? (first.input_tokens ?? 0) +
					(first.cache_read_input_tokens ?? 0) +
					(first.cache_creation_input_tokens ?? 0)
				: Number.NaN),
		invalid:
			problem(steps, base.cost) ??
			(steps.length < want ? `${steps.length} of ${want} steps` : null),
	};
};
